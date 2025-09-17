import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { TelemetrySample, safeValidateTelemetrySample } from '@/types/telemetry';

// Ring buffer capacity (can be made configurable later via provider prop or env)
const DEFAULT_CAPACITY = 2000;

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'error' | 'closed' | 'reconnecting';

interface TelemetryState {
  samples: TelemetrySample[]; // newest at end
  capacity: number;
  latest?: TelemetrySample;
  total: number; // total received ever (before validation filtering)
  valid: number; // count of valid samples accepted
  dropped: number; // dropped due to overflow
  parseErrors: number; // invalid payloads
  connection: ConnectionStatus;
  latencyMs: number | null; // last computed latency
  lastUpdated: number | null; // timestamp of last accepted sample
  setConnection: (s: ConnectionStatus) => void;
  pushSample: (raw: unknown) => void;
  setLatency: (latency: number) => void;
  reset: () => void;
}

const creator: StateCreator<TelemetryState> = (set, get) => ({
  samples: [],
  capacity: DEFAULT_CAPACITY,
  latest: undefined,
  total: 0,
  valid: 0,
  dropped: 0,
  parseErrors: 0,
  connection: 'idle',
  latencyMs: null,
  lastUpdated: null,
  setConnection: (connection: ConnectionStatus) => set({ connection }),
  setLatency: (latencyMs: number) => set({ latencyMs }),
  pushSample: (raw: unknown) => {
    const state = get();
    const total = state.total + 1;
    const parsed = safeValidateTelemetrySample(raw);
    if (!parsed.success) {
      set({ total, parseErrors: state.parseErrors + 1 });
      return;
    }
    const sample = parsed.data;
    const latency = Date.now() - sample.timestamp;
    const samples = state.samples.length >= state.capacity
      ? [...state.samples.slice(1), sample]
      : [...state.samples, sample];
    const dropped = state.samples.length >= state.capacity ? state.dropped + 1 : state.dropped;
    set({
      samples,
      latest: sample,
      total,
      valid: state.valid + 1,
      dropped,
      latencyMs: latency,
      lastUpdated: sample.timestamp,
    });
  },
  reset: () => set({ samples: [], latest: undefined, total: 0, valid: 0, dropped: 0, parseErrors: 0, latencyMs: null, lastUpdated: null }),
});

export const useTelemetryStore = create<TelemetryState>()(creator);

// Selectors (helper functions)
export const selectLatest = (s: TelemetryState) => s.latest;
export const selectConnection = (s: TelemetryState) => s.connection;
export const selectCounts = (s: TelemetryState) => ({ total: s.total, valid: s.valid, dropped: s.dropped, parseErrors: s.parseErrors });
export const selectLatency = (s: TelemetryState) => s.latencyMs;
export const selectSamples = (s: TelemetryState) => s.samples;
