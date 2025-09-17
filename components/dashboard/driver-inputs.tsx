"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DriverInputsPlaceholder() {
  return (
    <Card aria-label="Driver inputs placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Driver Inputs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Bar label="Throttle" percent={72} color="bg-green-500/70" />
        <Bar label="Brake" percent={0} color="bg-red-500/70" />
        <Bar label="Steering" percent={48} color="bg-blue-500/70" postfix="°" />
      </CardContent>
    </Card>
  );
}

function Bar({ label, percent, color, postfix }: { label: string; percent: number; color: string; postfix?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground"><span>{label}</span><span>{percent}{postfix ?? '%'}</span></div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
