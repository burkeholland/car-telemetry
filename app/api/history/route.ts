import { NextRequest } from 'next/server';
import { z } from 'zod';
import '@/lib/persistence/subscriber'; // side-effect: attach persistence
import { getTelemetryRepo } from '@/lib/persistence/telemetry-repo';

// Force Node.js runtime (not edge) so we can later integrate SQLite if desired
export const runtime = 'nodejs';

// Zod schema for query params
const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

// Normalized parsed schema
const NormalizedSchema = z.object({
  from: z.number().optional(),
  to: z.number().optional(),
  limit: z.number().int().min(1).max(500).default(200),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { rawParams[k] = v; });

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, 400);
  }

  // Coerce numeric fields
  const coerceNumber = (v?: string) => (v === undefined ? undefined : (Number.isFinite(+v) ? +v : undefined));
  const normObj = {
    from: coerceNumber(parsed.data.from),
    to: coerceNumber(parsed.data.to),
    limit: coerceNumber(parsed.data.limit),
    cursor: parsed.data.cursor,
  };
  const normalized = NormalizedSchema.safeParse(normObj);
  if (!normalized.success) {
    return json({ error: 'Invalid normalized parameters', details: normalized.error.flatten() }, 400);
  }

  const repo = getTelemetryRepo();
  const { samples, nextCursor, totalAvailable } = repo.query(normalized.data);

  return json({
    samples,
    count: samples.length,
    nextCursor,
    totalAvailable,
    query: normalized.data,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
