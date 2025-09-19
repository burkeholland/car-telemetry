import getSimulationEngine from '@/lib/simulation/engine';
import { getTelemetryRepo } from './telemetry-repo';

/**
 * Persistence Subscriber
 * ----------------------
 * Attaches a listener to the simulation engine to persist samples into the
 * in-memory repository. Import this module anywhere in the Node.js runtime
 * (e.g. in the history API route) to guarantee the listener is registered.
 *
 * It does NOT start the simulation engine; it only listens if/when the engine
 * is running (e.g. started by a WebSocket client in edge runtime or SSE route).
 */

declare global { // global guard to avoid duplicate attachment
  // eslint-disable-next-line no-var
  var __TELEM_SUB_ATTACHED__: boolean | undefined;
}

const repo = getTelemetryRepo();
const engine = getSimulationEngine();

if (!globalThis.__TELEM_SUB_ATTACHED__) {
  engine.on('sample', (sample) => {
    try { repo.add(sample); } catch (e) { /* swallow */ }
  });
  globalThis.__TELEM_SUB_ATTACHED__ = true;
}

export {}; // side-effect module
