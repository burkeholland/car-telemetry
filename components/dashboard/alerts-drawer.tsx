"use client";
import * as React from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTelemetryStore, selectActiveAlerts, selectActiveAlertCount, selectCriticalActiveCount, selectAlertHistory, selectLastNewCriticalIds } from '@/lib/state/telemetry-store';
import { toast } from 'sonner';

interface FilterState {
  show: 'active' | 'history';
  severity: 'all' | 'warning' | 'critical';
}

export function AlertsDrawer() {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterState>({ show: 'active', severity: 'all' });
  const activeAlerts = useTelemetryStore(selectActiveAlerts);
  const activeCount = useTelemetryStore(selectActiveAlertCount);
  const criticalActive = useTelemetryStore(selectCriticalActiveCount);
  const history = useTelemetryStore(selectAlertHistory);
  const newCriticalIds = useTelemetryStore(selectLastNewCriticalIds);
  const seenCriticalRef = React.useRef<Set<string>>(new Set());

  // Trigger toasts for new critical alerts
  React.useEffect(() => {
    if (!newCriticalIds.length) return;
    for (const id of newCriticalIds) {
      if (!seenCriticalRef.current.has(id)) {
        const alert = activeAlerts.find(a => a.id === id);
        if (alert?.severity === 'critical') {
          toast.error(alert.message, { description: `Started ${new Date(alert.firstSeen).toLocaleTimeString()}` });
        }
        seenCriticalRef.current.add(id);
      }
    }
  }, [newCriticalIds, activeAlerts]);

  const list = (filter.show === 'active' ? activeAlerts : history.slice().reverse()).filter(a => filter.severity === 'all' || a.severity === filter.severity);

  function severityBadge(sev: string) {
    const base = 'px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase';
    if (sev === 'critical') return <span className={base + ' bg-red-500/15 text-red-400 border border-red-500/30'}>Critical</span>;
    return <span className={base + ' bg-amber-500/15 text-amber-400 border border-amber-500/30'}>Warning</span>;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={criticalActive > 0 ? 'destructive' : 'outline'}
          size="sm"
          aria-label="Open alerts drawer"
          className="relative"
        >
          Alerts ({activeCount})
          {criticalActive > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 sm:w-96 flex flex-col" aria-describedby="alerts-desc">
        <div className="flex items-center justify-between mb-3">
          <SheetTitle>Alerts</SheetTitle>
          <div className="flex gap-2">
            <Button variant={filter.show === 'active' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter(f => ({ ...f, show: 'active' }))}>Active</Button>
            <Button variant={filter.show === 'history' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter(f => ({ ...f, show: 'history' }))}>History</Button>
          </div>
        </div>
        <SheetDescription id="alerts-desc" className="mb-2">Monitor active and past alert conditions. Critical alerts show a red pulse & toast.</SheetDescription>
        <div className="flex items-center gap-1 mb-2 text-[11px]">
            <span className="mr-1">Severity:</span>
            {(['all','warning','critical'] as const).map(s => (
              <Button key={s} variant={filter.severity === s ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter(f => ({ ...f, severity: s }))}>{s}</Button>
            ))}
        </div>
        <ScrollArea className="flex-1 border rounded p-2">
          {list.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">No {filter.show === 'active' ? 'active' : 'matching'} alerts.</div>
          )}
          <ul className="space-y-2">
            {list.map(a => (
              <li key={`${a.id}-${a.firstSeen}-${a.lastSeen}`} className="rounded border border-border/50 p-2 bg-background/60">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {severityBadge(a.severity)}
                    {!a.active && <Badge variant="outline" className="text-[10px]">Ended</Badge>}
                  </div>
                  <time className="text-[10px] text-muted-foreground" dateTime={new Date(a.firstSeen).toISOString()}>{new Date(a.firstSeen).toLocaleTimeString()}</time>
                </div>
                <div className="text-xs leading-snug font-medium">{a.message}</div>
                {a.firstSeen !== a.lastSeen && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">Last: {new Date(a.lastSeen).toLocaleTimeString()}</div>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
          <span>Active: {activeCount}</span>
          <span>Critical: {criticalActive}</span>
          <span>History: {history.length}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
