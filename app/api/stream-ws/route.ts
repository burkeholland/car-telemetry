/**
 * WebSocket Telemetry Stream (Step 5 Upgrade)
 * ===========================================
 * Bidirectional real-time telemetry using WebSockets.
 * Replaces SSE for lower latency, heartbeat detection, and reliability.
 *
 * Message Envelope (JSON): see `types/transport.ts` WSMessageSchema.
 * - connected: initial welcome + metrics
 * - telemetry: TelemetrySample payload
 * - ping: server heartbeat (client responds with pong)
 * - pong: client response (optional rtt)
 * - error: error envelope
 *
 * Heartbeat: server sends ping every 15s; if no pong within 45s, connection closed.
 */


import { TelemetrySample } from '@/types/telemetry';
import getSimulationEngine from '@/lib/simulation/engine';
import { WSMessageSchema } from '@/types/transport';

// Type augmentations for edge runtime globals (suppresses TS complaints)
// These are soft declarations; underlying platform provides implementation.
declare global {
  // eslint-disable-next-line no-var
  var __WS_CLIENTS__: Set<ClientMeta> | undefined;
  // eslint-disable-next-line no-var
  var __WS_SIM_STARTED__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __WS_MSG_COUNT__: number | undefined;
  // eslint-disable-next-line no-var
  var __WS_CONN_TOTAL__: number | undefined;
  // eslint-disable-next-line no-var
  var __WS_HB_INTERVAL__: ReturnType<typeof setInterval> | undefined;
  // Cloudflare-style WebSocketPair (not in standard lib typings)
  interface WebSocketPair { 0: WebSocket; 1: WebSocket; }
  // eslint-disable-next-line no-var
  var WebSocketPair: { new (): WebSocketPair };
}

interface ClientMeta {
  ws: WebSocket;
  id: string;
  lastPong: number;
}

// Global (edge) state - may be evicted; acceptable for demo. In production, move to durable object.
const clients: Set<ClientMeta> = globalThis.__WS_CLIENTS__ ?? new Set();
if (!globalThis.__WS_CLIENTS__) globalThis.__WS_CLIENTS__ = clients;

let simulationStarted = globalThis.__WS_SIM_STARTED__ ?? false;
if (globalThis.__WS_SIM_STARTED__ === undefined) globalThis.__WS_SIM_STARTED__ = simulationStarted;

let messagesSent = globalThis.__WS_MSG_COUNT__ ?? 0;
if (globalThis.__WS_MSG_COUNT__ === undefined) globalThis.__WS_MSG_COUNT__ = messagesSent;

let connectionsTotal = globalThis.__WS_CONN_TOTAL__ ?? 0;
if (globalThis.__WS_CONN_TOTAL__ === undefined) globalThis.__WS_CONN_TOTAL__ = connectionsTotal;

let heartbeatInterval: ReturnType<typeof setInterval> | undefined = globalThis.__WS_HB_INTERVAL__;
if (globalThis.__WS_HB_INTERVAL__ === undefined) globalThis.__WS_HB_INTERVAL__ = heartbeatInterval;

export async function GET(request: Request) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }

  // Guard: local dev runtime may not support WebSocketPair yet.
  if (typeof (globalThis as any).WebSocketPair === 'undefined') {
    return new Response('WebSocketPair not supported in this runtime (fall back to SSE)', { status: 501 });
  }

  // WebSocketPair provided by edge runtime (Cloudflare-style)
  const { 0: client, 1: server } = new WebSocketPair();
  const clientId = `ws-${++connectionsTotal}`;
  // @ts-ignore
  globalThis.__WS_CONN_TOTAL__ = connectionsTotal;

  const meta: ClientMeta = { ws: server, id: clientId, lastPong: Date.now() };

  // @ts-ignore
  server.accept();

  clients.add(meta);

  if (!simulationStarted) {
    startSimulation();
  }

  ensureHeartbeat();

  send(meta.ws, {
    type: 'connected',
    timestamp: Date.now(),
    clientId,
    metrics: metrics(),
  });

  server.addEventListener('message', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string);
      const parsed = WSMessageSchema.safeParse(data);
      if (!parsed.success) return; // ignore invalid
      if (parsed.data.type === 'pong') {
        meta.lastPong = Date.now();
      }
    } catch (_) {
      // ignore parse errors
    }
  });

  server.addEventListener('close', () => {
    cleanup(meta);
  });
  server.addEventListener('error', () => {
    cleanup(meta);
  });

  // Cast to any because ResponseInit in TS lib doesn't include webSocket yet
  return new Response(null, { status: 101, webSocket: client } as any);
}

function send(ws: WebSocket, payload: any) {
  try { ws.send(JSON.stringify(payload)); } catch (_) { /* ignore */ }
}

function broadcast(sample: TelemetrySample) {
  const payload = JSON.stringify({ type: 'telemetry', data: sample });
  const now = Date.now();
  messagesSent++;
  // @ts-ignore
  globalThis.__WS_MSG_COUNT__ = messagesSent;
  const stale: ClientMeta[] = [];
  clients.forEach(meta => {
    try {
      meta.ws.send(payload);
    } catch {
      stale.push(meta);
    }
  });
  stale.forEach(cleanup);
  // Auto-stop simulation if no clients
  if (clients.size === 0) stopSimulation();
}

function metrics() {
  return {
    activeConnections: clients.size,
    messagesSent,
    connectionsTotal,
  };
}

function startSimulation() {
  const engine = getSimulationEngine({ seed: Date.now(), minTickMs: 75, maxTickMs: 150 });
  engine.on('sample', broadcast);
  if (!engine.isRunning()) engine.start();
  simulationStarted = true;
  // @ts-ignore
  globalThis.__WS_SIM_STARTED__ = true;
}

function stopSimulation() {
  const engine = getSimulationEngine();
  engine.off('sample', broadcast);
  engine.stop();
  simulationStarted = false;
  // @ts-ignore
  globalThis.__WS_SIM_STARTED__ = false;
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = undefined;
    // @ts-ignore
    globalThis.__WS_HB_INTERVAL__ = undefined;
  }
}

function ensureHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const drop: ClientMeta[] = [];
    clients.forEach(meta => {
      // Timeout if >45s since last pong
      if (now - meta.lastPong > 45000) {
        try { meta.ws.close(4000, 'heartbeat timeout'); } catch (_) {}
        drop.push(meta);
      } else {
        send(meta.ws, { type: 'ping', timestamp: now });
      }
    });
    drop.forEach(cleanup);
    if (clients.size === 0) stopSimulation();
  }, 15000);
  // @ts-ignore
  globalThis.__WS_HB_INTERVAL__ = heartbeatInterval;
}

function cleanup(meta: ClientMeta) {
  clients.delete(meta);
  if (clients.size === 0) stopSimulation();
}
