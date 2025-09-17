"use client";
import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '@/lib/state/telemetry-store';

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
  const esRef = useRef<EventSource | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    function connect() {
      if (stoppedRef.current) return;
      setConnection(attemptRef.current === 0 ? 'connecting' : 'reconnecting');
      const url = '/api/stream'; // SSE endpoint (WS to be added later)
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        attemptRef.current = 0;
        setConnection('open');
      };

      es.onerror = () => {
        setConnection('error');
        es.close();
        scheduleReconnect();
      };

      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === 'telemetry') {
            pushSample(payload.data);
          }
          // ignore other message types for now (connected, metrics)
        } catch (err) {
          // JSON parse errors counted via store pushSample validator path if attempted
          // but here we simply ignore invalid envelope
        }
      };
    }

    function scheduleReconnect() {
      if (stoppedRef.current) return;
      attemptRef.current += 1;
      const base = Math.min(maxBackoffMs, 1000 * 2 ** attemptRef.current);
      const jitter = Math.random() * 300;
      const delay = base + jitter;
      setTimeout(connect, delay);
    }

    connect();
    return () => {
      stoppedRef.current = true;
      esRef.current?.close();
      setConnection('closed');
    };
  }, [maxBackoffMs, pushSample, setConnection]);

  return <>{children}</>;
}
