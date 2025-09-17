"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function LiveChartsContainerPlaceholder() {
  return (
    <Card aria-label="Charts placeholder" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Charts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="speed" className="w-full">
          <TabsList className="grid grid-cols-3 px-2">
            <TabsTrigger value="speed">Speed</TabsTrigger>
            <TabsTrigger value="rpm">RPM</TabsTrigger>
            <TabsTrigger value="battery">Battery</TabsTrigger>
          </TabsList>
          <TabsContent value="speed" className="p-4 text-xs text-muted-foreground">Speed chart placeholder.</TabsContent>
          <TabsContent value="rpm" className="p-4 text-xs text-muted-foreground">RPM chart placeholder.</TabsContent>
          <TabsContent value="battery" className="p-4 text-xs text-muted-foreground">Battery SoC chart placeholder.</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
