"use client";
import * as React from 'react';
import { MetricCard } from './metric-card';

export function SpeedGaugePlaceholder() {
  return (
    <MetricCard
      title="Speed"
      value={<span className="flex items-baseline"><span>123</span><span className="ml-1 text-base font-normal">kph</span></span>}
      subtitle="Placeholder (live data in Step 7)"
      footer="Target 0–320"
      aria-label="Speed gauge placeholder"
    />
  );
}
