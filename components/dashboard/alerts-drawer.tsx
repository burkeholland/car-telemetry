"use client";
import * as React from 'react';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AlertsDrawerPlaceholder() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Open alerts drawer">Alerts (0)</Button>
      </SheetTrigger>
  <SheetContent className="w-80 sm:w-96 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">Alerts</h2>
        <p className="text-xs text-muted-foreground mb-4">Placeholder drawer – alert rules connect in later step.</p>
        <ScrollArea className="flex-1 border rounded p-2">
          <div className="text-xs text-muted-foreground">No active alerts.</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
