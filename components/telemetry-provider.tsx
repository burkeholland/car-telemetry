"use client";
import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '@/lib/state/telemetry-store';
import { safeParseWSMessage } from '@/types/transport';

interface TelemetryProviderProps {
  children: React.ReactNode;
  /** Maximum reconnection delay (ms) */
  maxBackoffMs?: number;
}

/**
 * TelemetryProvider
 * Establishes a streaming connection (SSE for now; WS in future) and ingests telemetry into the store.
 * Implements exponential backoff reconnection with jitter.
 */
export function TelemetryProvider({ children, maxBackoffMs = 15000 }: TelemetryProviderProps) {
  const setConnection = useTelemetryStore(state => state.setConnection);
  const pushSample = useTelemetryStore(state => state.pushSample);
  const attemptRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const fallbackEsRef = useRef<EventSource | null>(null);
  const stoppedRef = useRef(false);
  const lastPingRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<number | null>(null);
  const fallbackInitiatedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    function connectWebSocket() {
      if (stoppedRef.current) return;
      setConnection(attemptRef.current === 0 ? 'connecting' : 'reconnecting');
      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/stream-ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnection('open');
        lastPingRef.current = Date.now();
        startHeartbeatMonitor();
      };

      ws.onclose = () => {
        setConnection('closed');
        stopHeartbeatMonitor();
        scheduleReconnect();
      };

      ws.onerror = () => {
        setConnection('error');
        try { ws.close(); } catch {}
        // Initiate SSE fallback on first explicit error if WS likely unsupported
        if (!fallbackInitiatedRef.current) {
          startSSEFallback();
        }
      };

      ws.onmessage = (ev) => {
        try {
          const parsed = safeParseWSMessage(JSON.parse(ev.data));
          if (!parsed.success) return;
          const msg = parsed.data;
            switch (msg.type) {
              case 'telemetry':
                pushSample(msg.data);
                break;
              case 'ping':
                lastPingRef.current = Date.now();
                // respond with pong (include simple rtt estimation if desired)
                try { ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() })); } catch {}
                break;
              case 'connected':
              case 'pong':
              case 'error':
              default:
                break;
            }
        } catch {
          // ignore
        }
      };
    }

    function startHeartbeatMonitor() {
      stopHeartbeatMonitor();
      heartbeatTimerRef.current = window.setInterval(() => {
        const delta = Date.now() - lastPingRef.current;
        // If no ping in 50s assume dead and force reconnect
        if (delta > 50000) {
          wsRef.current?.close();
        }
      }, 10000);
    }

    function stopHeartbeatMonitor() {
      if (heartbeatTimerRef.current != null) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (stoppedRef.current) return;
      attemptRef.current += 1;
      const base = Math.min(maxBackoffMs, 1000 * 2 ** attemptRef.current);
      const jitter = Math.random() * 300;
      const delay = base + jitter;
      setTimeout(() => {
        // Try WebSocket again
        connectWebSocket();
      }, delay);
    }

    // Primary connect
    connectWebSocket();

    // Immediate fallback if WebSocket API missing
    if (!('WebSocket' in window)) {
      startSSEFallback();
    }

    function startSSEFallback() {
      if (fallbackInitiatedRef.current) return;
      fallbackInitiatedRef.current = true;
      setConnection('reconnecting');
      const es = new EventSource('/api/stream');
      fallbackEsRef.current = es;
      es.onopen = () => setConnection('open');
      es.onerror = () => setConnection('error');
      es.onmessage = (ev) => {
        try { const p = JSON.parse(ev.data); if (p?.type === 'telemetry') pushSample(p.data); } catch {}
      };
    }
    return () => {
      stoppedRef.current = true;
      wsRef.current?.close();
      fallbackEsRef.current?.close();
      stopHeartbeatMonitor();
      setConnection('closed');
    };
  }, [maxBackoffMs, pushSample, setConnection]);

  return <>{children}</>;
}
