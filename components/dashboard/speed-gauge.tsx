"use client";
import * as React from 'react';
import { MetricCard } from './metric-card';
import { useTelemetryStore } from '@/lib/state/telemetry-store';
import { useSmoothedValue } from '../hooks/useSmoothedValue';

export function SpeedGauge() {
  const speed = useTelemetryStore(s => s.latest?.speedKph);
  const smoothed = useSmoothedValue(speed);
  const display = smoothed == null ? '—' : smoothed.toFixed(1);
  const pct = speed != null ? Math.min(1, speed / 320) : 0;
  return (
    <MetricCard
      title="Speed"
      value={
        <span className="flex items-baseline">
          <span>{display}</span>
          <span className="ml-1 text-base font-normal">kph</span>
        </span>
      }
      subtitle={<Bar percent={pct} />}
      footer="Range 0–320"
      aria-label="Speed gauge"
    />
  );
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded bg-muted overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-400 transition-[width]"
        style={{ width: `${percent * 100}%` }}
      />
    </div>
  );
}

