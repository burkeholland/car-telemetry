# Car Telemetry Simulator

A real-time car telemetry dashboard built with Next.js 15, React 19, and shadcn/ui components. It simulates vehicle telemetry data and streams it via WebSocket for live visualization, with an in-memory persistence layer enabling basic history queries and a manual replay mode (Step 10).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Simulation Engine

The project includes a deterministic telemetry simulation engine that generates realistic car data.

### Preview Simulation

To see the simulation engine in action:

```bash
npm run sim:preview
```

This runs a short burst of telemetry generation and displays sample output. You can customize with:

```bash
npm run sim:preview -- --seed=42 --samples=20
```

### Engine Features

- **Deterministic**: Same seed produces repeatable results
- **Realistic Physics**: Approximated gear shifts, temperature dynamics, battery drain
- **Anomaly Injection**: Occasional spikes for alert system testing
- **Configurable**: Tick rate, vehicle specs, and behavior parameters

The engine emits `TelemetrySample` events containing:
- Vehicle dynamics (speed, RPM, gear, throttle, brake, steering)
- Engine temps (coolant, oil)
- Battery metrics (voltage, state of charge)
- Tire temperatures (FL, FR, RL, RR)
- Position data (lat/lng, lap, sector)

## Real-Time Streaming API

Primary transport: **WebSocket** (`/api/stream-ws`).  
Fallback / legacy: **SSE** (`/api/stream-sse` or deprecated `/api/stream`).

### WebSocket (Primary)

```javascript
const ws = new WebSocket(`ws://${location.host}/api/stream-ws`);
ws.onmessage = evt => {
  const msg = JSON.parse(evt.data);
  switch (msg.type) {
    case 'connected':
      console.log('Connected', msg.clientId, msg.metrics); break;
    case 'telemetry':
      console.log('Sample', msg.data.speedKph, msg.data.rpm); break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
};
```

Heartbeat: server sends `ping` every ~15s; client should reply with `pong`.

### Server-Sent Events (Fallback)

Connect to the SSE endpoint for real-time telemetry:

```javascript
const eventSource = new EventSource('/api/stream-sse');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'connected') {
    console.log('Connected:', message.clientId);
  } else if (message.type === 'telemetry') {
    const sample = message.data;
    console.log(`Speed: ${sample.speedKph}km/h, RPM: ${sample.rpm}`);
  }
};
```

### Message Types (Envelope)

`connected | telemetry | ping | pong | error` (WS).  
`connected | telemetry | heartbeat` (SSE).  
All telemetry payloads conform to the `TelemetrySample` Zod schema in `types/telemetry.ts`.

### Test Streaming

Verify endpoints are working:

```bash
npm run stream:test
npm run stream:test -- --samples=20 --timeout=30000
```

## Persistence & History (Step 10)

An **in-memory repository** (`lib/persistence/telemetry-repo.ts`) now stores a rolling window of telemetry samples (default retention ~1 hour, hard cap 25k samples). Persistence is active for Node runtime routes (SSE + history). The current WebSocket route runs in Edge runtime and does **not** feed the repository (future improvement: move WS to Node or add a cross-runtime store like LibSQL/Redis).

### History API

`GET /api/history?from=<ms>&to=<ms>&limit=<n>&cursor=<token>`

Parameters:
- `from` (optional, ms epoch inclusive)
- `to` (optional, ms epoch exclusive)
- `limit` (1–500, default 200)
- `cursor` (base64 index returned as `nextCursor`)

Response:
```jsonc
{
  "samples": [ /* TelemetrySample[] */ ],
  "count": 200,
  "nextCursor": "MTAw", // base64 index or omitted
  "totalAvailable": 1250,
  "query": { "from": 1737060000000, "to": 1737060123456, "limit": 200 }
}
```

Usage pattern (pagination):
1. Fetch initial window (`from` / `to`).
2. If `nextCursor` present, request again with same time range + `cursor`.

### Ensuring Data Exists
1. Open an SSE connection (`/api/stream-sse`) to start the simulation in Node runtime.
2. Wait a few seconds, then call `/api/history`.

WebSocket-only sessions (edge) currently won't populate history — this is a known limitation.

## Replay Mode (Step 10)

Replay scaffolding allows manual scrubbing through historical samples in the client state store:

Store API (in `telemetry-store.ts`):
- `enterReplay(samples)`
- `replaySeek(index)`
- `exitReplay()`

Selectors: `selectMode`, `selectReplayIndex`, `selectReplaySamples`.

UI: `components/dashboard/replay-controls.tsx` provides:
- Window input (minutes)
- Fetch & Enter replay button (pulls up to 500 samples from history API)
- Range scrubber to step through timeline
- Exit Replay button

Limitations (current):
- No automatic playback timer (manual scrub only)
- No cross-runtime persistence for WS (edge) samples
- On exit replay, live buffer rebuilds from next incoming samples

Future enhancements (planned):
- Timed playback with speed control
- Unified persistence (LibSQL / SQLite) + multi-vehicle history
- Preloading multi-page history with cursor walks

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Step 10 Summary

Deliverables implemented:
- In-memory persistence repo + singleton
- Subscriber attaching simulation samples to repo (SSE routes import it)
- History API with pagination + time range
- Replay state in store (live vs replay modes)
- Replay controls UI (manual entry & scrubbing)

Known gaps vs full plan:
- WS edge stream not persisted
- No automated playback timer (scrub only)
- No server-side tests yet for history endpoint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
