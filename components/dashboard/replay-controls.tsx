"use client";
import { useState, useCallback } from 'react';
import {
  useTelemetryStore,
  selectMode,
  selectReplayIndex,
  selectReplaySamples,
} from '@/lib/state/telemetry-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * ReplayControls Component (Step 10 UI)
 * -------------------------------------
 * Provides minimal controls to:
 *  - Fetch historical samples (last N minutes) from /api/history
 *  - Enter replay mode (store.enterReplay)
 *  - Scrub through samples (store.replaySeek)
 *  - Exit replay mode (store.exitReplay)
 *
 * NOTE: Current persistence is in-memory and only records once /api/history
 *       (or any module importing the subscriber) has been hit AFTER the
 *       simulation starts in a Node runtime. WebSocket (edge) generated
 *       samples won't persist cross-runtime yet; use the SSE endpoint or
 *       adapt architecture for durable/shared storage to improve this.
 */

const DEFAULT_WINDOW_MINUTES = 2;

export function ReplayControls() {
  const mode = useTelemetryStore(selectMode);
  const replayIndex = useTelemetryStore(selectReplayIndex);
  const replaySamples = useTelemetryStore(selectReplaySamples);
  const enterReplay = useTelemetryStore(s => s.enterReplay);
  const exitReplay = useTelemetryStore(s => s.exitReplay);
  const replaySeek = useTelemetryStore(s => s.replaySeek);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(DEFAULT_WINDOW_MINUTES);

  const handleEnter = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const to = Date.now();
      const from = to - minutes * 60_000;
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('from', String(from));
      url.searchParams.set('to', String(to));
      url.searchParams.set('limit', '500');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`History request failed (${res.status})`);
      const json = await res.json();
      if (!Array.isArray(json.samples) || json.samples.length === 0) {
        throw new Error('No samples available for requested window');
      }
      enterReplay(json.samples);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [minutes, enterReplay]);

  const handleScrub = (vals: number[]) => {
    if (vals.length) replaySeek(vals[0]);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Replay</h3>
        {mode === 'replay' ? (
          <Button size="sm" variant="secondary" onClick={exitReplay}>
            Exit Replay
          </Button>
        ) : (
          <Button size="sm" onClick={handleEnter} disabled={loading}>
            {loading ? 'Loading…' : `Enter (${minutes}m)`}
          </Button>
        )}
      </div>
      {mode !== 'replay' && (
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center gap-2">
            Window (minutes)
            <input
              type="number"
              min={1}
              max={30}
              value={minutes}
              onChange={e => setMinutes(Number(e.target.value))}
              className="w-16 rounded border px-1 py-0.5 bg-background text-xs"
            />
          </label>
          <p className="text-[10px] text-muted-foreground">Fetches last N minutes (up to 500 samples).</p>
        </div>
      )}
      {mode === 'replay' && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{replayIndex + 1}/{replaySamples.length}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, replaySamples.length - 1)}
            step={1}
            value={replayIndex}
            onChange={e => handleScrub([Number(e.target.value)])}
            className="w-full"
          />
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {mode === 'replay' && replaySamples.length === 0 && (
        <p className="text-xs text-muted-foreground">No replay samples loaded.</p>
      )}
    </Card>
  );
}

export default ReplayControls;
