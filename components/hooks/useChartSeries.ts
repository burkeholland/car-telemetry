"use client";
import { useMemo } from 'react';
import { useTelemetryStore, selectSamples } from '@/lib/state/telemetry-store';
import { windowAndDownsample, Point } from '@/lib/downsample';

export interface UseChartSeriesOptions {
  windowMs?: number;
  maxPoints?: number;
  metric: 'speedKph' | 'rpm' | 'stateOfCharge';
}

export function useChartSeries({ metric, windowMs = 2 * 60_000, maxPoints = 400 }: UseChartSeriesOptions) {
  const samples = useTelemetryStore(selectSamples);
  return useMemo(() => {
    const pts: Point[] = samples.map(s => ({ t: s.timestamp, v: s[metric] as number }));
    return windowAndDownsample(pts, windowMs, maxPoints);
  }, [samples, metric, windowMs, maxPoints]);
}
