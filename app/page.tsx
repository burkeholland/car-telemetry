"use client";
import { useTelemetryStore, selectConnection, selectLatency, selectLatest } from '@/lib/state/telemetry-store';
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import { AlertsDrawer } from '@/components/dashboard/alerts-drawer';
import { SpeedGauge } from '@/components/dashboard/speed-gauge';
import { RpmGauge } from '@/components/dashboard/rpm-gauge';
import { GearIndicator } from '@/components/dashboard/gear-indicator';
import { DriverInputs } from '@/components/dashboard/driver-inputs';
import { EngineTempsPanel } from '@/components/dashboard/engine-temps-panel';
import { BatteryPanel } from '@/components/dashboard/battery-panel';
import { TireGrid } from '@/components/dashboard/tire-grid';
import { TrackMapStub } from '@/components/dashboard/track-map-stub';
import { LiveChartsContainerPlaceholder } from '@/components/dashboard/live-charts-container';

export default function DashboardPage() {
  const connection = useTelemetryStore(selectConnection);
  const latency = useTelemetryStore(selectLatency);
  const latest = useTelemetryStore(selectLatest);
  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Telemetry Dashboard</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">Conn:</span>
            <Badge variant={connection === 'open' ? 'secondary' : 'outline'}>{connection}</Badge>
            <span className="uppercase tracking-wide ml-4">Latency:</span>
            <span>{latency != null ? `${latency} ms` : '—'}</span>
            {latest && (
              <span className="ml-4 tabular-nums text-muted-foreground">{latest.speedKph.toFixed(1)} kph / {latest.rpm} rpm</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AlertsDrawer />
          <ModeToggle />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 border-r p-4 flex-col gap-4 bg-background/50">
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">Vehicle</h2>
            <div className="text-sm leading-tight">
              <div className="font-medium">SimCar</div>
              <div className="text-muted-foreground">Session Seed</div>
              <div className="text-[10px] uppercase tracking-wide mt-2 text-muted-foreground">Lap</div>
              <div className="text-lg font-semibold tabular-nums">{(latest?.lap ?? 0) + 1}</div>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <section>
            <h2 className="sr-only">Primary Gauges</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <SpeedGauge />
              <RpmGauge />
              <GearIndicator />
              <DriverInputs />
            </div>
          </section>
          <section>
            <h2 className="sr-only">Systems Panels</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <EngineTempsPanel />
              <BatteryPanel />
              <TireGrid />
              <TrackMapStub />
            </div>
          </section>
          <section>
            <h2 className="sr-only">Charts</h2>
            <LiveChartsContainerPlaceholder />
          </section>
        </main>
      </div>
      <footer className="px-6 py-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Alerts Engine Active (Step 9)</span>
        <span>Next: Persistence & Replay (Step 10)</span>
      </footer>
    </div>
  );
}
