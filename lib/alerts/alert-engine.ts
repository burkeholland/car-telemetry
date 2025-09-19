import { Alert, AlertSeverity, createAlert, deactivateAlert, TelemetrySample } from '@/types/telemetry';

/**
 * Alert Engine – Step 9 implementation
 * Evaluates a fixed set of rules against each incoming TelemetrySample.
 * Rules implemented (MVP):
 *  - High RPM sustained (>95% max for >=5s warn / >=8s critical)
 *  - Coolant Temp (>110 warn / >120 critical; clear with hysteresis 5C below threshold)
 *  - Tire Delta (max-min >15 warn / >20 critical)
 *  - Battery SoC (<15% warn / <8% critical; hysteresis +2/+3%)
 *  - Brake + Throttle overlap (both >20% for 3s warn / 5s critical)
 */

// Assumed max RPM (would ideally come from vehicle meta)
const MAX_RPM = 7000;

export interface InternalRuleRuntime {
  conditionActiveSince?: number; // for duration-based rules
  lastSeverity?: AlertSeverity;
}

export interface AlertEngineState {
  active: Record<string, Alert>; // keyed by alert id (rule id)
  history: Alert[];
  runtimes: Record<string, InternalRuleRuntime>;
}

export interface EvaluateResult {
  active: Record<string, Alert>;
  history: Alert[];
  runtimes: Record<string, InternalRuleRuntime>;
  newlyCritical: Alert[]; // for toast triggers
}

const HISTORY_CAP = 300;

function upsertActive(active: Record<string, Alert>, id: string, severity: AlertSeverity, message: string, sample: TelemetrySample): { alert: Alert; changed: boolean } {
  const existing = active[id];
  if (existing) {
    let changed = false;
    if (existing.severity !== severity) {
      existing.severity = severity;
      changed = true;
    }
    existing.message = message;
    existing.lastSeen = sample.timestamp;
    existing.active = true;
    return { alert: existing, changed };
  }
  const alert = createAlert({ id, vehicleId: sample.vehicleId, ruleId: id, severity, message, active: true });
  alert.firstSeen = sample.timestamp; // override createAlert's timestamp with sample time for consistency
  alert.lastSeen = sample.timestamp;
  active[id] = alert;
  return { alert, changed: true };
}

function clearIfActive(active: Record<string, Alert>, history: Alert[], id: string) {
  const existing = active[id];
  if (existing && existing.active) {
    const deactivated = deactivateAlert(existing);
    history.push(deactivated);
    delete active[id];
    while (history.length > HISTORY_CAP) history.shift();
  }
}

export function evaluateAlerts(sample: TelemetrySample, prev: AlertEngineState): EvaluateResult {
  const active = { ...prev.active };
  const history = [...prev.history];
  const runtimes: Record<string, InternalRuleRuntime> = { ...prev.runtimes };
  const newlyCritical: Alert[] = [];

  // Utility for duration rules
  function durationRule(id: string, condition: boolean, warnMs: number, critMs: number, baseMessage: (durationMs: number, severity: AlertSeverity) => string) {
    const rt = (runtimes[id] ||= {});
    if (condition) {
      if (!rt.conditionActiveSince) rt.conditionActiveSince = sample.timestamp;
      const duration = sample.timestamp - rt.conditionActiveSince;
      let severity: AlertSeverity | undefined;
      if (duration >= critMs) severity = 'critical';
      else if (duration >= warnMs) severity = 'warning';
      if (severity) {
        const { alert, changed } = upsertActive(active, id, severity, baseMessage(duration, severity), sample);
        if (changed && severity === 'critical') newlyCritical.push(alert);
        rt.lastSeverity = severity;
      }
    } else {
      // reset runtime + clear active
      rt.conditionActiveSince = undefined;
      clearIfActive(active, history, id);
    }
  }

  // 1. High RPM sustained
  const rpmRatio = sample.rpm / MAX_RPM;
  durationRule(
    'high-rpm',
    rpmRatio > 0.95,
    5000,
    8000,
    (d, sev) => `RPM >95% for ${(d / 1000).toFixed(1)}s (${sev})`
  );

  // 2. Coolant Temp thresholds with hysteresis (5C)
  {
    const id = 'coolant-temp';
    const v = sample.coolantC;
    const rt = (runtimes[id] ||= {});
    let severity: AlertSeverity | undefined;
    if (v > 120) severity = 'critical';
    else if (v > 110) severity = 'warning';
    if (severity) {
      const { alert, changed } = upsertActive(active, id, severity, `Coolant ${v.toFixed(0)}°C (${severity})`, sample);
      if (changed && severity === 'critical') newlyCritical.push(alert);
      rt.lastSeverity = severity;
    } else {
      // hysteresis clear only if previously active and v < 105
      if (rt.lastSeverity && v < 105) {
        clearIfActive(active, history, id);
        rt.lastSeverity = undefined;
      }
    }
  }

  // 3. Tire Delta
  {
    const id = 'tire-delta';
    const temps = sample.tireTemps;
    const values = [temps.FL, temps.FR, temps.RL, temps.RR];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const delta = max - min;
    let severity: AlertSeverity | undefined;
    if (delta > 20) severity = 'critical';
    else if (delta > 15) severity = 'warning';
    const rt = (runtimes[id] ||= {});
    if (severity) {
      const { alert, changed } = upsertActive(active, id, severity, `Tire temp delta ${delta.toFixed(1)}°C (${severity})`, sample);
      if (changed && severity === 'critical') newlyCritical.push(alert);
      rt.lastSeverity = severity;
    } else if (rt.lastSeverity && delta < 12) { // small hysteresis for clear
      clearIfActive(active, history, id);
      rt.lastSeverity = undefined;
    }
  }

  // 4. Battery SoC (percent) with hysteresis (+2/+3 clear margins)
  {
    const id = 'battery-soc';
    const soc = sample.stateOfCharge;
    const rt = (runtimes[id] ||= {});
    let severity: AlertSeverity | undefined;
    if (soc < 8) severity = 'critical';
    else if (soc < 15) severity = 'warning';
    if (severity) {
      const { alert, changed } = upsertActive(active, id, severity, `Battery SoC ${soc.toFixed(1)}% (${severity})`, sample);
      if (changed && severity === 'critical') newlyCritical.push(alert);
      rt.lastSeverity = severity;
    } else if (rt.lastSeverity) {
      // Clear logic
      if ((rt.lastSeverity === 'critical' && soc > 11) || (rt.lastSeverity === 'warning' && soc > 17)) {
        clearIfActive(active, history, id);
        rt.lastSeverity = undefined;
      }
    }
  }

  // 5. Brake + Throttle overlap sustained
  durationRule(
    'brake-throttle-overlap',
    sample.throttlePct > 20 && sample.brakePct > 20,
    3000,
    5000,
    (d, sev) => `Brake+Throttle overlap ${(d / 1000).toFixed(1)}s (${sev})`
  );

  return { active, history, runtimes, newlyCritical };
}

export function initialAlertEngineState(): AlertEngineState {
  return { active: {}, history: [], runtimes: {} };
}
