"use client";
import * as React from 'react';
import { MetricCard } from './metric-card';

export function RpmGaugePlaceholder() {
  return (
    <MetricCard
      title="RPM"
      value={<span className="flex items-baseline"><span>3,500</span><span className="ml-1 text-base font-normal">rpm</span></span>}
      subtitle="Shift @ 6,580"
      footer="Max 7,000"
      aria-label="RPM gauge placeholder"
    />
  );
}
