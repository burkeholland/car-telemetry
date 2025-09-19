"use client";
import { useEffect, useRef, useState } from 'react';

/**
 * useSmoothedValue
 * Linearly interpolates between changing numeric targets (e.g. telemetry ticks)
 * to produce smoother UI gauge motion. Assumes target updates at ~75–200ms.
 *
 * Strategy:
 * - On target change, capture start value & start time.
 * - Animate via rAF over a configurable duration (default adaptive to delta magnitude)
 * - If a new target arrives mid-animation, restart from current animated value.
 */
export function useSmoothedValue(target: number | undefined, opts: { baseDurationMs?: number; maxDurationMs?: number } = {}) {
  const { baseDurationMs = 160, maxDurationMs = 260 } = opts;
  const [value, setValue] = useState<number | undefined>(target);
  const animRef = useRef<number | null>(null);
  const startValRef = useRef<number>(target ?? 0);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(baseDurationMs);
  const targetRef = useRef<number | undefined>(target);

  useEffect(() => {
    if (target == null) {
      targetRef.current = undefined;
      setValue(undefined);
      return;
    }
    const current = value ?? target;
    startValRef.current = current;
    targetRef.current = target;
    // Adaptive duration: bigger jump => slightly longer up to max
    const delta = Math.abs(target - current);
    const adaptive = Math.min(maxDurationMs, baseDurationMs + delta * 2);
    durationRef.current = adaptive;
    startTimeRef.current = performance.now();

    const step = () => {
      if (targetRef.current == null) return;
      const now = performance.now();
      const t = Math.min(1, (now - startTimeRef.current) / durationRef.current);
      // Ease-out (quadratic)
      const eased = 1 - (1 - t) * (1 - t);
      const next = startValRef.current + (targetRef.current - startValRef.current) * eased;
      setValue(next);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
