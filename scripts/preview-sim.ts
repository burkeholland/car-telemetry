#!/usr/bin/env tsx
/**
 * Simulation Preview Script
 * Runs the simulation engine for a short burst and logs sample lines.
 * Usage (npm script will provide tsx):
 *   npm run sim:preview -- --seed=42 --samples=15
 */

import getSimulationEngine from '@/lib/simulation/engine';

interface CliArgs {
  seed: number;
  samples: number;
  intervalLog?: number; // optional: log every N samples (default 1)
}

function parseArgs(): CliArgs {
  const seedArg = process.argv.find(a => a.startsWith('--seed='));
  const samplesArg = process.argv.find(a => a.startsWith('--samples='));
  const everyArg = process.argv.find(a => a.startsWith('--every='));
  return {
    seed: seedArg ? Number(seedArg.split('=')[1]) : 1,
    samples: samplesArg ? Number(samplesArg.split('=')[1]) : 12,
    intervalLog: everyArg ? Number(everyArg.split('=')[1]) : 1,
  };
}

const { seed, samples, intervalLog } = parseArgs();

const engine = getSimulationEngine({ seed });
let count = 0;
let firstTs: number | null = null;

console.log(`\nStarting simulation preview (seed=${seed}, targetSamples=${samples})...`);

engine.on('sample', sample => {
  if (firstTs == null) firstTs = sample.timestamp;
  count++;
  if (count % (intervalLog || 1) === 0) {
    const tRel = sample.timestamp - firstTs;
    const line = [
      tRel.toString().padStart(5, ' '), 'ms',
      `spd=${sample.speedKph.toFixed(1)}km/h`,
      `rpm=${sample.rpm}`,
      `g=${sample.gear}`,
      `thr=${sample.throttlePct.toFixed(0)}%`,
      `brk=${sample.brakePct.toFixed(0)}%`,
      `cool=${sample.coolantC.toFixed(1)}C`,
      `oil=${sample.oilC.toFixed(1)}C`,
      `soc=${sample.stateOfCharge.toFixed(1)}%`,
      `tT(FL)=${sample.tireTemps.FL.toFixed(1)}C`,
    ].join(' ');
    console.log(line);
  }
  if (count >= samples) {
    engine.stop();
    console.log('\nPreview complete.');
    // small delay to ensure no late timers
    setTimeout(() => process.exit(0), 30);
  }
});

engine.start(seed);
