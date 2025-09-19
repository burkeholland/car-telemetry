"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

export function BatteryPanel() {
  const latest = useTelemetryStore(s => s.latest);
  const soc = latest?.stateOfCharge ?? 0;
  const voltage = latest?.batteryV;
  return (
    <Card aria-label="Battery" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Battery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">State of Charge</span><span className="font-medium tabular-nums">{soc.toFixed(0)}%</span></div>
        <Progress value={soc} />
        <div className="text-xs text-muted-foreground">Voltage: {voltage != null ? voltage.toFixed(2) : '—'}V</div>
      </CardContent>
    </Card>
  );
}

