"use client";
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

export function GearIndicator({ className }: { className?: string }) {
  const gear = useTelemetryStore(s => s.latest?.gear ?? 0);
  return (
    <Card aria-label="Gear indicator" className={cn('flex items-center justify-center h-full', className)}>
      <CardContent className="p-0 flex items-center justify-center w-full h-32">
        <span className="text-5xl font-semibold tracking-tight tabular-nums">{gear}</span>
      </CardContent>
    </Card>
  );
}

