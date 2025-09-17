"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TireGridPlaceholder() {
  const tires = [
    { pos: 'FL', temp: 65 },
    { pos: 'FR', temp: 66 },
    { pos: 'RL', temp: 62 },
    { pos: 'RR', temp: 63 },
  ];
  return (
    <Card aria-label="Tire temperature grid placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Tire Temps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {tires.map(t => (
            <div key={t.pos} className="aspect-square rounded-md bg-muted flex flex-col items-center justify-center text-sm font-medium">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t.pos}</span>
              <span className="text-lg tabular-nums">{t.temp}<span className="ml-0.5 text-xs text-muted-foreground">°C</span></span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
