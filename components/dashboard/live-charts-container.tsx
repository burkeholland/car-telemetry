"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useChartSeries } from '@/components/hooks/useChartSeries';

interface LineChartProps {
  metric: 'speedKph' | 'rpm' | 'stateOfCharge';
  label: string;
  unit?: string;
  color?: string;
}

// Colors: use raw CSS vars (they hold hex values already). Avoid wrapping in hsl().
const DEFAULT_COLOR = 'var(--foreground)';

function LineChart({ metric, label, unit, color = DEFAULT_COLOR }: LineChartProps) {
  const points = useChartSeries({ metric });
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = React.useState({ w: 100, h: 160 });

  React.useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (points.length < 2) {
    return <div ref={ref} className="h-40 flex items-center justify-center text-xs text-muted-foreground">Waiting for data…</div>;
  }

  const { w, h } = dims;
  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  let minV = Infinity; let maxV = -Infinity;
  for (const p of points) { if (p.v < minV) minV = p.v; if (p.v > maxV) maxV = p.v; }
  if (minV === maxV) { maxV += 1; minV -= 1; }
  const rangeT = maxT - minT || 1;
  const rangeV = maxV - minV || 1;
  const pad = 4;
  const path = points.map((p, i) => {
    const x = pad + ((p.t - minT) / rangeT) * (w - pad * 2);
    const y = pad + (1 - (p.v - minV) / rangeV) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const latest = points[points.length - 1].v;

  return (
    <div ref={ref} className="h-40 relative">
      <svg width={w} height={h} className="absolute inset-0">
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {/* Simple baseline grid */}
        <g stroke="var(--muted-foreground)" strokeOpacity={0.15} strokeWidth={1}>
          {[0.25,0.5,0.75].map(r => (
            <line key={r} x1={0} x2={w} y1={pad + r*(h-pad*2)} y2={pad + r*(h-pad*2)} />
          ))}
        </g>
      </svg>
      <div className="absolute top-1 left-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="absolute top-1 right-2 text-xs font-medium tabular-nums">{latest.toFixed(0)}{unit}</div>
    </div>
  );
}

export function LiveChartsContainer() {
  return (
    <Card aria-label="Live charts" className="h-full">
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
          <TabsContent value="speed" className="p-0">
            <LineChart metric="speedKph" label="Speed (kph)" unit="" color="var(--primary)" />
          </TabsContent>
          <TabsContent value="rpm" className="p-0">
            <LineChart metric="rpm" label="RPM" unit="" color="var(--destructive)" />
          </TabsContent>
            <TabsContent value="battery" className="p-0">
            <LineChart metric="stateOfCharge" label="Battery SoC (%)" unit="%" color="var(--accent)" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Backwards compatibility export (if other code still imports placeholder name)
export const LiveChartsContainerPlaceholder = LiveChartsContainer;
