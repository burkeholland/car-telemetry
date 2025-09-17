"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function EngineTempsPanelPlaceholder() {
  return (
    <Card aria-label="Engine temperatures placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Engine Temps</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <Temp label="Coolant" value={85} unit="°C" />
        <Temp label="Oil" value={90} unit="°C" />
        <Temp label="Battery V" value={12.8} unit="V" />
        <Temp label="SoC" value={82} unit="%" />
      </CardContent>
    </Card>
  );
}

function Temp({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-medium tabular-nums">{value}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></div>
    </div>
  );
}
