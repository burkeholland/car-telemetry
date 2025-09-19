"use client";
import * as React from 'react';
import { MetricCard } from './metric-card';
import { useTelemetryStore } from '@/lib/state/telemetry-store';
import { useSmoothedValue } from '../hooks/useSmoothedValue';

const MAX_RPM = 7000; // mirrors simulation default vehicle
const SHIFT_ZONE_START = Math.round(MAX_RPM * 0.94);

export function RpmGauge() {
  const rpmRaw = useTelemetryStore(s => s.latest?.rpm);
  const rpm = useSmoothedValue(rpmRaw);
  const display = rpm == null ? '—' : Math.round(rpm).toLocaleString();
  const pct = rpmRaw != null ? Math.min(1, rpmRaw / MAX_RPM) : 0;
  return (
    <MetricCard
      title="RPM"
      value={<span className="flex items-baseline"><span>{display}</span><span className="ml-1 text-base font-normal">rpm</span></span>}
      subtitle={<RpmBar percent={pct} />}
      footer={`Shift ≥ ${SHIFT_ZONE_START.toLocaleString()}`}
      aria-label="RPM gauge"
    />
  );
}

function RpmBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded bg-muted overflow-hidden relative">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-600 transition-[width]"
        style={{ width: `${percent * 100}%` }}
      />
      <div
        className="absolute inset-y-0" style={{ left: `${94}%`, width: '2px', background: 'rgba(var(--foreground-rgb),0.4)' }}
        aria-hidden="true"
      />
    </div>
  );
}

