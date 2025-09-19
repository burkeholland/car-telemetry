import { TelemetrySample, TelemetrySampleSchema } from '@/types/telemetry';
import { z } from 'zod';

/**
 * Persistence Layer (Step 10 - In-Memory Implementation)
 * -----------------------------------------------------
 * Provides a minimal repository abstraction for storing and querying
 * telemetry samples. Designed so we can later swap in a SQLite/LibSQL
 * implementation without changing API routes or replay code.
 *
 * NOTE: Running in-memory inside the Node.js runtime only. The Edge runtime
 * (WebSocket route) may not share memory with this instance, so we attach
 * a separate subscriber within the Node runtime (via subscriber.ts) to
 * persist samples when the simulation engine produces them.
 */

const QUERY_SCHEMA = z.object({
  from: z.number().optional(), // inclusive timestamp (ms)
  to: z.number().optional(),   // exclusive timestamp (ms)
  limit: z.number().int().min(1).max(500).default(200),
  cursor: z.string().optional(), // base64 encoded index position
});

export type HistoryQuery = z.infer<typeof QUERY_SCHEMA>;

export interface HistoryResult {
  samples: TelemetrySample[];
  nextCursor?: string; // omit if no more
  totalAvailable: number; // total retained in buffer
}

export interface TelemetryRepository {
  add(sample: TelemetrySample): void;
  size(): number;
  query(params: Partial<HistoryQuery>): HistoryResult;
  clear(): void;
}

interface StoredSample extends TelemetrySample {}

const DEFAULT_RETENTION = 60 * 60 * 1000; // 1 hour in ms (logical time window)
const HARD_CAP = 25_000; // absolute max samples retained

class InMemoryTelemetryRepo implements TelemetryRepository {
  private buffer: StoredSample[] = [];
  private retentionMs: number;

  constructor(retentionMs: number = DEFAULT_RETENTION) {
    this.retentionMs = retentionMs;
  }

  add(sample: TelemetrySample) {
    // validate defensively (simulation already validates, but external writes may come later)
    const parsed = TelemetrySampleSchema.safeParse(sample);
    if (!parsed.success) return;
    this.buffer.push(parsed.data);
    // Hard cap truncate (drop oldest)
    if (this.buffer.length > HARD_CAP) {
      const excess = this.buffer.length - HARD_CAP;
      this.buffer.splice(0, excess);
    }
    this.evictOld(sample.timestamp);
  }

  size() { return this.buffer.length; }

  clear() { this.buffer = []; }

  private evictOld(nowTs: number) {
    const cutoff = nowTs - this.retentionMs;
    // Fast path: find first index >= cutoff
    let firstIdx = 0;
    while (firstIdx < this.buffer.length && this.buffer[firstIdx].timestamp < cutoff) firstIdx++;
    if (firstIdx > 0) this.buffer.splice(0, firstIdx);
  }

  /**
   * Query with time range + pagination. Cursor is a base64 encoded integer index.
   */
  query(raw: Partial<HistoryQuery>): HistoryResult {
    const parsed = QUERY_SCHEMA.safeParse(raw);
    if (!parsed.success) {
      // On validation error, return empty with size for introspection
      return { samples: [], totalAvailable: this.buffer.length };
    }
    const { from, to, limit } = parsed.data;
    let startIndex = 0;
    if (parsed.data.cursor) {
      try { startIndex = parseInt(Buffer.from(parsed.data.cursor, 'base64').toString('utf8'), 10) || 0; } catch { startIndex = 0; }
    }

    // Narrow by time first (binary search could be used later)
    let candidates = this.buffer;
    if (from !== undefined) candidates = candidates.filter(s => s.timestamp >= from);
    if (to !== undefined) candidates = candidates.filter(s => s.timestamp < to);

    const slice = candidates.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + slice.length;
    const hasMore = nextIndex < candidates.length;

    return {
      samples: slice,
      nextCursor: hasMore ? Buffer.from(String(nextIndex)).toString('base64') : undefined,
      totalAvailable: candidates.length,
    };
  }
}

// Singleton holder (Node runtime scope)
interface RepoSingleton { repo: TelemetryRepository; }
declare global { var __TELEM_REPO__: RepoSingleton | undefined; }

export function getTelemetryRepo(): TelemetryRepository {
  if (!globalThis.__TELEM_REPO__) {
    globalThis.__TELEM_REPO__ = { repo: new InMemoryTelemetryRepo() };
  }
  return globalThis.__TELEM_REPO__.repo;
}

export const TelemetryRepo = { get: getTelemetryRepo };
