"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

export function EngineTempsPanel() {
  const latest = useTelemetryStore(s => s.latest);
  return (
    <Card aria-label="Engine temperatures" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Engine Temps</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <Temp label="Coolant" value={latest?.coolantC} unit="°C" warn={110} crit={120} />
        <Temp label="Oil" value={latest?.oilC} unit="°C" warn={115} crit={125} />
        <Temp label="Battery V" value={latest?.batteryV} unit="V" />
        <Temp label="SoC" value={latest?.stateOfCharge} unit="%" />
      </CardContent>
    </Card>
  );
}

function Temp({ label, value, unit, warn, crit }: { label: string; value: number | string | undefined; unit: string; warn?: number; crit?: number }) {
  const num = typeof value === 'number' ? value : undefined;
  const status = num == null || warn == null ? undefined : num >= (crit ?? Infinity) ? 'crit' : num >= warn ? 'warn' : undefined;
  const color = status === 'crit' ? 'text-red-500' : status === 'warn' ? 'text-amber-500' : 'text-foreground';
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-medium tabular-nums ${color}`}>{num != null ? num.toFixed(unit === 'V' ? 2 : unit === '%' ? 0 : 1) : '—'}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></div>
    </div>
  );
}

