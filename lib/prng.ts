/**
 * Deterministic pseudo-random utilities (seeded) for the simulation engine.
 * Mulberry32 provides a decent balance of speed & distribution for telemetry simulation.
 */

export type PRNG = () => number; // returns [0,1)

export function mulberry32(seed: number): PRNG {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a random number within [min, max) */
export function range(rng: PRNG, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Returns a random integer within [min, max] inclusive */
export function int(rng: PRNG, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

/** Approximate normal distribution via central limit of uniforms */
export function normal(rng: PRNG, mean = 0, stdDev = 1): number {
  // Sum of 6 uniforms - 3 ~ Normal(0,1) (rough)
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  const z = s - 3; // center
  return mean + z * stdDev;
}

/** Creates a jitter function that applies bounded gaussian noise */
export function createJitter(rng: PRNG, stdDev: number, clampMin?: number, clampMax?: number) {
  return (value: number) => {
    let v = value + normal(rng, 0, stdDev);
    if (clampMin !== undefined && v < clampMin) v = clampMin;
    if (clampMax !== undefined && v > clampMax) v = clampMax;
    return v;
  };
}

export function chance(rng: PRNG, probability: number): boolean {
  return rng() < probability;
}
