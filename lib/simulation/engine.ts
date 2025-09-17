/**
 * Simulation Engine (Step 3 MVP)
 * ---------------------------------
 * Generates deterministic pseudo‑random telemetry samples for a single vehicle.
 * Emits 'sample' events containing TelemetrySample objects at a variable tick interval.
 *
 * DESIGN GOALS (MVP):
 * - Deterministic when provided a seed
 * - Lightweight physics approximations (not accurate racing physics)
 * - Realistic bounded values with smooth transitions
 * - Gear shifting logic with RPM smoothing
 * - Occasional anomaly injection for alert testing (coolant spikes)
 *
 * FUTURE (Phase 2+): multi-vehicle, track polyline geometry, advanced anomalies.
 */

import { EventEmitter } from 'events';
import type { TelemetrySample, Vehicle } from '@/types/telemetry';
import { TelemetrySampleSchema } from '@/types/telemetry';
import { mulberry32, range, normal, chance } from '../prng';

export interface SimulationOptions {
  minTickMs?: number; // Minimum tick interval
  maxTickMs?: number; // Maximum tick interval
  vehicle?: Partial<Vehicle>; // Partial allowed on input, normalized internally
  seed?: number; // Seed for deterministic PRNG
}

interface InternalState {
  running: boolean;
  timer?: NodeJS.Timeout;
  lastTs: number;
  gear: number;
  speedKph: number;
  rpm: number;
  throttlePct: number;
  brakePct: number;
  steeringDeg: number;
  coolantC: number;
  oilC: number;
  batteryV: number;
  stateOfCharge: number;
  tireTemps: { FL: number; FR: number; RL: number; RR: number };
  distanceM: number; // distance traveled along virtual track
  lap: number;
  anomalyCooldown: number; // ticks remaining for anomaly effect
}

export interface SimulationEngine {
  start(seed?: number): void;
  stop(): void;
  isRunning(): boolean;
  on(event: 'sample', listener: (sample: TelemetrySample) => void): this;
  once(event: 'sample', listener: (sample: TelemetrySample) => void): this;
  off(event: 'sample', listener: (sample: TelemetrySample) => void): this;
}

// Simple virtual vehicle defaults
const DEFAULT_VEHICLE: Vehicle = {
  id: 'vehicle-001',
  name: 'SimCar',
  model: 'MVP Prototype',
  maxRpm: 7000,
  tireSpec: 'Generic Sport',
  batterySpec: '12V Lead Acid',
};

// Approximate gear ratios (including final drive factor baked in)
const GEAR_RATIOS = [0, 3.2, 2.1, 1.55, 1.15, 0.95, 0.82]; // index 0 unused (neutral)
const MAX_GEAR = 6;
const SHIFT_RPM_FACTOR = 0.94; // shift up threshold (94% of max)
const DOWNSHIFT_RPM = 1600;

// Track assumptions
const TRACK_LENGTH_M = 3000; // 3 km simplified loop
const SECTORS = 3;

class Engine extends EventEmitter implements SimulationEngine {
  private opts: { minTickMs: number; maxTickMs: number; vehicle: Vehicle; seed: number };
  private rng = mulberry32(1);
  private state: InternalState;

  constructor(options: SimulationOptions = {}) {
    super();
    const vehicle: Vehicle = { ...DEFAULT_VEHICLE, ...options.vehicle };
    this.opts = {
      minTickMs: options.minTickMs ?? 100,
      maxTickMs: options.maxTickMs ?? 200,
      vehicle,
      seed: options.seed ?? 1,
    };

    this.rng = mulberry32(this.opts.seed);
    this.state = this.createInitialState();
  }

  private createInitialState(): InternalState {
    return {
      running: false,
      lastTs: Date.now(),
      timer: undefined,
      gear: 1,
      speedKph: 0,
      rpm: 1200,
      throttlePct: 10,
      brakePct: 0,
      steeringDeg: 0,
      coolantC: 70,
      oilC: 75,
      batteryV: 13.0,
      stateOfCharge: 95,
      tireTemps: { FL: 55, FR: 55, RL: 50, RR: 50 },
      distanceM: 0,
      lap: 0,
      anomalyCooldown: 0,
    };
  }

  start(seed?: number) {
    if (this.state.running) return;
    if (seed !== undefined) {
      this.rng = mulberry32(seed);
    }
    this.state = this.createInitialState();
    this.state.running = true;
    this.scheduleNextTick();
  }

  stop() {
    if (this.state.timer) clearTimeout(this.state.timer);
    this.state.running = false;
  }

  isRunning() {
    return this.state.running;
  }

  private scheduleNextTick() {
    if (!this.state.running) return;
    const delay = Math.round(range(this.rng, this.opts.minTickMs, this.opts.maxTickMs + 0.999));
    this.state.timer = setTimeout(() => this.tick(), delay);
  }

  private tick() {
    const now = Date.now();
    const dtMs = now - this.state.lastTs;
    this.state.lastTs = now;

    // Driver input dynamics --------------------------------------------------
    // Throttle meanders with some bias toward maintaining speed
    const throttleDrift = normal(this.rng, 0, 4);
    this.state.throttlePct = clamp(this.state.throttlePct + throttleDrift, 5, 100);

    // Occasional braking event
    if (chance(this.rng, 0.02)) {
      this.state.brakePct = clamp(this.state.brakePct + normal(this.rng, 20, 10), 0, 90);
    } else {
      this.state.brakePct *= 0.85; // decay brake
    }

    // Steering wandering
    this.state.steeringDeg = clamp(this.state.steeringDeg + normal(this.rng, 0, 3), -45, 45);

    // Speed & RPM ------------------------------------------------------------
    const accelFactor = (this.state.throttlePct / 100) - (this.state.brakePct / 70);
    const accelMps2 = accelFactor * 7 - 0.012 * this.state.speedKph; // basic drag decel
    const deltaSpeedKph = (accelMps2 * (dtMs / 1000)) * 3.6;
    this.state.speedKph = clamp(this.state.speedKph + deltaSpeedKph, 0, 320);

    // Gear shifting logic
    const targetRpmFromSpeed = speedToRpm(this.state.speedKph, this.state.gear, this.opts.vehicle.maxRpm);
    const upshiftThreshold = this.opts.vehicle.maxRpm * SHIFT_RPM_FACTOR;
    if (targetRpmFromSpeed > upshiftThreshold && this.state.gear < MAX_GEAR) {
      this.state.gear += 1;
    } else if (targetRpmFromSpeed < DOWNSHIFT_RPM && this.state.gear > 1) {
      this.state.gear -= 1;
    }

    // Recompute rpm with possibly updated gear
    const rawRpm = speedToRpm(this.state.speedKph, this.state.gear, this.opts.vehicle.maxRpm);
    // Smooth RPM transitions
    this.state.rpm = lerp(this.state.rpm, rawRpm, 0.25);

    // Temps ------------------------------------------------------------------
    const loadFactor = this.state.throttlePct / 100;
    const targetCoolant = 75 + loadFactor * 55; // up to ~130C
    const targetOil = 80 + loadFactor * 60; // up to ~140C
    this.state.coolantC = approach(this.state.coolantC, targetCoolant, 0.05) + normal(this.rng, 0, 0.4);
    this.state.oilC = approach(this.state.oilC, targetOil, 0.04) + normal(this.rng, 0, 0.5);

    // Anomaly injection (coolant spike)
    if (this.state.anomalyCooldown > 0) {
      this.state.coolantC += 0.9; // sustained spike
      this.state.anomalyCooldown -= 1;
    } else if (chance(this.rng, 0.001)) {
      this.state.anomalyCooldown = intRange(this.rng, 10, 25); // 1–2.5s depending on tick rate
    }

    // Battery & SoC ---------------------------------------------------------
    const drain = loadFactor * 0.006 * (dtMs / 100); // scaling to tick
    const regen = (this.state.brakePct / 100) * 0.004 * (dtMs / 100);
    this.state.stateOfCharge = clamp(this.state.stateOfCharge - drain + regen, 0, 100);
    // Minor voltage variance
    this.state.batteryV = 12.6 + (this.state.stateOfCharge / 100) * 0.8 + normal(this.rng, 0, 0.02);

    // Tires ------------------------------------------------------------------
    const baseTire = 50 + (this.state.speedKph / 320) * 35 + loadFactor * 15; // 50–100C typical
    this.state.tireTemps.FL = approach(this.state.tireTemps.FL, baseTire + normal(this.rng, 0, 1.8), 0.15);
    this.state.tireTemps.FR = approach(this.state.tireTemps.FR, baseTire + normal(this.rng, 0, 1.8), 0.15);
    this.state.tireTemps.RL = approach(this.state.tireTemps.RL, baseTire - 2 + normal(this.rng, 0, 1.5), 0.14);
    this.state.tireTemps.RR = approach(this.state.tireTemps.RR, baseTire - 1 + normal(this.rng, 0, 1.5), 0.14);

    // Distance / Lap / Sector ------------------------------------------------
    const speedMps = this.state.speedKph / 3.6;
    this.state.distanceM += speedMps * (dtMs / 1000);
    if (this.state.distanceM >= TRACK_LENGTH_M) {
      this.state.distanceM -= TRACK_LENGTH_M;
      this.state.lap += 1;
    }
    const sectorLength = TRACK_LENGTH_M / SECTORS;
    const sector = Math.min(SECTORS - 1, Math.floor(this.state.distanceM / sectorLength));

    // Build sample -----------------------------------------------------------
    const sample: TelemetrySample = {
      timestamp: now,
      vehicleId: this.opts.vehicle.id,
      speedKph: round2(this.state.speedKph),
      rpm: Math.round(this.state.rpm),
      gear: this.state.gear,
      throttlePct: round2(this.state.throttlePct),
      brakePct: round2(this.state.brakePct),
      steeringDeg: round2(this.state.steeringDeg),
      coolantC: round2(this.state.coolantC),
      oilC: round2(this.state.oilC),
      batteryV: round2(this.state.batteryV),
      stateOfCharge: round2(this.state.stateOfCharge),
      tireTemps: {
        FL: round1(this.state.tireTemps.FL),
        FR: round1(this.state.tireTemps.FR),
        RL: round1(this.state.tireTemps.RL),
        RR: round1(this.state.tireTemps.RR),
      },
      latitude: 37.77 + Math.sin(this.state.distanceM / 500) * 0.01, // placeholder orbit
      longitude: -122.41 + Math.cos(this.state.distanceM / 500) * 0.01,
      lap: this.state.lap,
      sector,
    };

    // Validate (dev safety) – in production could skip for perf
    const parsed = TelemetrySampleSchema.safeParse(sample);
    if (!parsed.success) {
      console.error('Invalid TelemetrySample generated', parsed.error.format());
    } else {
      this.emit('sample', parsed.data);
    }

    this.scheduleNextTick();
  }
}

// Helper Math ----------------------------------------------------------------
function clamp(v: number, min: number, max: number) { return v < min ? min : v > max ? max : v; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function approach(current: number, target: number, factor: number) { return current + (target - current) * factor; }
function round2(n: number) { return Math.round(n * 100) / 100; }
function round1(n: number) { return Math.round(n * 10) / 10; }
function intRange(rng: () => number, min: number, max: number) { return Math.floor(range(rng, min, max + 0.999)); }

function speedToRpm(speedKph: number, gear: number, maxRpm: number): number {
  if (gear <= 0) return 900; // idle
  const ratio = GEAR_RATIOS[gear] || 1;
  // Arbitrary scaling: rpm proportional to speed * gear ratio
  const rpm = speedKph * ratio * 55; // scaling constant tuned for ~7000 rpm at top speed
  return clamp(rpm, 900, maxRpm * 1.05); // allow slight overshoot transient
}

// Singleton Accessor ---------------------------------------------------------

export interface SimulationSingleton {
  engine: SimulationEngine;
}

declare global {
  var __SIM_ENGINE__: SimulationSingleton | undefined;
}

export function getSimulationEngine(opts?: SimulationOptions): SimulationEngine {
  if (!globalThis.__SIM_ENGINE__) {
    globalThis.__SIM_ENGINE__ = { engine: new Engine(opts) };
  }
  return globalThis.__SIM_ENGINE__.engine;
}

export default getSimulationEngine;
