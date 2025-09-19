import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { TelemetrySample, safeValidateTelemetrySample, Alert } from '@/types/telemetry';
import { evaluateAlerts, initialAlertEngineState, InternalRuleRuntime } from '@/lib/alerts/alert-engine';

// Ring buffer capacity (can be made configurable later via provider prop or env)
const DEFAULT_CAPACITY = 2000;

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'error' | 'closed' | 'reconnecting';

interface TelemetryState {
  samples: TelemetrySample[]; // newest at end
  capacity: number;
  latest?: TelemetrySample;
  total: number; // total received ever (before validation filtering)
  valid: number; // count of valid samples accepted
  dropped: number; // dropped due to overflow
  parseErrors: number; // invalid payloads
  connection: ConnectionStatus;
  latencyMs: number | null; // last computed latency
  lastUpdated: number | null; // timestamp of last accepted sample
  // Replay mode -----------------------------------------------------------
  mode: 'live' | 'replay';
  replayIndex: number; // current index into replaySamples
  replaySamples: TelemetrySample[]; // loaded history set when in replay
  replaySpeed: number; // multiplier (1x, 2x, etc.) – not yet used for timer scheduling
  enterReplay: (samples: TelemetrySample[]) => void;
  replaySeek: (index: number) => void;
  exitReplay: () => void;
  // Alert engine state
  alertsActive: Record<string, Alert>;
  alertsHistory: Alert[];
  alertRuntimes: Record<string, InternalRuleRuntime>;
  lastCriticalAlertIds: string[]; // ephemeral list of ids newly critical in latest push
  setConnection: (s: ConnectionStatus) => void;
  pushSample: (raw: unknown) => void;
  setLatency: (latency: number) => void;
  reset: () => void;
}

const creator: StateCreator<TelemetryState> = (set, get) => ({
  samples: [],
  capacity: DEFAULT_CAPACITY,
  latest: undefined,
  total: 0,
  valid: 0,
  dropped: 0,
  parseErrors: 0,
  connection: 'idle',
  latencyMs: null,
  lastUpdated: null,
  alertsActive: initialAlertEngineState().active,
  alertsHistory: initialAlertEngineState().history,
  alertRuntimes: initialAlertEngineState().runtimes,
  lastCriticalAlertIds: [],
  mode: 'live',
  replayIndex: 0,
  replaySamples: [],
  replaySpeed: 1,
  enterReplay: (replaySamples: TelemetrySample[]) => set(() => ({
    mode: 'replay',
    replaySamples,
    replayIndex: 0,
    // freeze live latest to first replay sample (if exists)
    latest: replaySamples[0],
    samples: replaySamples, // show whole range for charts initially
  })),
  replaySeek: (index: number) => set(state => {
    if (state.mode !== 'replay') return {} as any;
    const clamped = Math.max(0, Math.min(index, state.replaySamples.length - 1));
    const latest = state.replaySamples[clamped];
    return {
      replayIndex: clamped,
      latest,
      samples: state.replaySamples.slice(0, clamped + 1),
    };
  }),
  exitReplay: () => set(state => ({
    mode: 'live',
    replaySamples: [],
    replayIndex: 0,
    samples: [],
    latest: state.latest, // keep last known sample (will be replaced by next live push)
  })),
  setConnection: (connection: ConnectionStatus) => set({ connection }),
  setLatency: (latencyMs: number) => set({ latencyMs }),
  pushSample: (raw: unknown) => {
    const state = get();
    if (state.mode === 'replay') return; // ignore live pushes during replay
    const total = state.total + 1;
    const parsed = safeValidateTelemetrySample(raw);
    if (!parsed.success) {
      set({ total, parseErrors: state.parseErrors + 1 });
      return;
    }
    const sample = parsed.data;
    const latency = Date.now() - sample.timestamp;
    const samples = state.samples.length >= state.capacity
      ? [...state.samples.slice(1), sample]
      : [...state.samples, sample];
    const dropped = state.samples.length >= state.capacity ? state.dropped + 1 : state.dropped;

    // Evaluate alerts using existing alert engine state
    const { active, history, runtimes, newlyCritical } = evaluateAlerts(sample, {
      active: state.alertsActive,
      history: state.alertsHistory,
      runtimes: state.alertRuntimes,
    });

    set({
      samples,
      latest: sample,
      total,
      valid: state.valid + 1,
      dropped,
      latencyMs: latency,
      lastUpdated: sample.timestamp,
      alertsActive: active,
      alertsHistory: history,
      alertRuntimes: runtimes,
      lastCriticalAlertIds: newlyCritical.map(a => a.id),
    });
  },
  reset: () => set({ samples: [], latest: undefined, total: 0, valid: 0, dropped: 0, parseErrors: 0, latencyMs: null, lastUpdated: null }),
});

export const useTelemetryStore = create<TelemetryState>()(creator);

// Selectors (helper functions)
export const selectLatest = (s: TelemetryState) => s.latest;
export const selectConnection = (s: TelemetryState) => s.connection;
export const selectCounts = (s: TelemetryState) => ({ total: s.total, valid: s.valid, dropped: s.dropped, parseErrors: s.parseErrors });
export const selectLatency = (s: TelemetryState) => s.latencyMs;
export const selectSamples = (s: TelemetryState) => s.samples;
// Replay selectors
export const selectMode = (s: TelemetryState) => s.mode;
export const selectReplayIndex = (s: TelemetryState) => s.replayIndex;
export const selectReplaySamples = (s: TelemetryState) => s.replaySamples;
// Alert selectors
export const selectActiveAlerts = (s: TelemetryState) => Object.values(s.alertsActive);
export const selectActiveAlertCount = (s: TelemetryState) => Object.keys(s.alertsActive).length;
export const selectCriticalActiveCount = (s: TelemetryState) => Object.values(s.alertsActive).filter(a => a.severity === 'critical').length;
export const selectAlertHistory = (s: TelemetryState) => s.alertsHistory;
export const selectLastNewCriticalIds = (s: TelemetryState) => s.lastCriticalAlertIds;
