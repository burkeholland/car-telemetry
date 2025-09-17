"use client";
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function GearIndicatorPlaceholder({ className }: { className?: string }) {
  return (
    <Card aria-label="Gear indicator placeholder" className={cn('flex items-center justify-center h-full', className)}>
      <CardContent className="p-0 flex items-center justify-center w-full h-32">
        <span className="text-5xl font-semibold tracking-tight">3</span>
      </CardContent>
    </Card>
  );
}
