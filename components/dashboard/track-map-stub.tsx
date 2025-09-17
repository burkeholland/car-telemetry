"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TrackMapStub() {
  return (
    <Card aria-label="Track map placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Track Map</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-48">
        <svg viewBox="0 0 100 50" className="w-full h-full max-h-48 text-muted-foreground">
          <path d="M10 25 Q20 5 40 10 T70 12 Q90 15 90 25 T70 40 Q50 45 40 40 T10 25" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="10" r="2" className="text-primary" />
        </svg>
      </CardContent>
    </Card>
  );
}
