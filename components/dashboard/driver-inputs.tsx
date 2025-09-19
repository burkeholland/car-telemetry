"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

export function DriverInputs() {
  const latest = useTelemetryStore(s => s.latest);
  const throttle = latest?.throttlePct ?? 0;
  const brake = latest?.brakePct ?? 0;
  const steering = latest?.steeringDeg ?? 0;
  return (
    <Card aria-label="Driver inputs" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Driver Inputs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Bar label="Throttle" percent={throttle} color="bg-green-500/80" />
        <Bar label="Brake" percent={brake} color="bg-red-500/80" />
        <Bar label="Steering" percent={Math.abs(steering) / 45 * 100} color="bg-blue-500/80" postfix={`° (${steering.toFixed(0)})`} />
      </CardContent>
    </Card>
  );
}

function Bar({ label, percent, color, postfix }: { label: string; percent: number; color: string; postfix?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground"><span>{label}</span><span>{clamped.toFixed(0)}{postfix ?? '%'}</span></div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-[width]`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

