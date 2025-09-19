"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

export function TireGrid() {
  const tires = useTelemetryStore(s => s.latest?.tireTemps);
  const items = [
    { pos: 'FL', temp: tires?.FL },
    { pos: 'FR', temp: tires?.FR },
    { pos: 'RL', temp: tires?.RL },
    { pos: 'RR', temp: tires?.RR },
  ];
  const temps = items.map(i => i.temp).filter((n): n is number => typeof n === 'number');
  const min = temps.length ? Math.min(...temps) : 0;
  const max = temps.length ? Math.max(...temps) : 0;
  return (
    <Card aria-label="Tire temperature grid" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Tire Temps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map(t => (
            <div key={t.pos} className="aspect-square rounded-md flex flex-col items-center justify-center text-sm font-medium border bg-gradient-to-br from-muted/40 to-muted">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t.pos}</span>
              <span className={`text-lg tabular-nums ${t.temp != null && (t.temp - min) > 12 ? 'text-amber-500' : ''}`}>{t.temp != null ? t.temp.toFixed(1) : '—'}<span className="ml-0.5 text-xs text-muted-foreground">°C</span></span>
            </div>
          ))}
        </div>
        {temps.length > 0 && (
          <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground flex justify-between"><span>Δ</span><span>{(max - min).toFixed(1)}°C</span></div>
        )}
      </CardContent>
    </Card>
  );
}

