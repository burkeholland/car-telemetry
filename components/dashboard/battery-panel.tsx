"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function BatteryPanelPlaceholder() {
  const soc = 82;
  return (
    <Card aria-label="Battery placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Battery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">State of Charge</span><span className="font-medium tabular-nums">{soc}%</span></div>
        <Progress value={soc} />
        <div className="text-xs text-muted-foreground">Voltage placeholder: 12.8V</div>
      </CardContent>
    </Card>
  );
}
