import { toNumber } from "./execution-utils.js";
import { buildModelStatsKey, ExecutionDurationAggregates } from "./model-stats.js";

export interface DurationSampleRow {
  provider: string | null;
  model: string | null;
  durationMs: number | string;
}

export interface DurationAggregateRow {
  provider: string | null;
  model: string | null;
  sampleCount: number | string;
  minMs: number | string;
  maxMs: number | string;
  avgMs: number | string;
}

export interface ComputedDurationAggregates {
  allDurations: number[];
  modelDurations: Map<string, number[]>;
  modelDurationAggs: Map<string, ExecutionDurationAggregates>;
  overallDurationAggs: ExecutionDurationAggregates;
}

export function computeAggregatesFromSamples(rows: DurationSampleRow[]): ComputedDurationAggregates {
  const allDurations: number[] = [];
  const modelDurations = new Map<string, number[]>();
  const modelDurationAggs = new Map<string, ExecutionDurationAggregates>();

  for (const row of rows) {
    const durationMs = toNumber(row.durationMs);
    if (durationMs <= 0) continue;
    allDurations.push(durationMs);
    const key = buildModelStatsKey(row.provider, row.model);
    const samples = modelDurations.get(key) || [];
    samples.push(durationMs);
    modelDurations.set(key, samples);
  }

  let overallSampleCount = 0;
  let overallMinMs = Number.MAX_SAFE_INTEGER;
  let overallMaxMs = 0;
  let overallSumMs = 0;

  for (const [key, samples] of modelDurations.entries()) {
    let minMs = Number.MAX_SAFE_INTEGER;
    let maxMs = 0;
    let sumMs = 0;
    for (const val of samples) {
      minMs = Math.min(minMs, val);
      maxMs = Math.max(maxMs, val);
      sumMs += val;
    }
    modelDurationAggs.set(key, {
      sampleCount: samples.length,
      minMs: samples.length > 0 ? minMs : 0,
      maxMs: maxMs,
      avgMs: samples.length > 0 ? sumMs / samples.length : 0,
    });

    overallSampleCount += samples.length;
    overallMinMs = Math.min(overallMinMs, minMs);
    overallMaxMs = Math.max(overallMaxMs, maxMs);
    overallSumMs += sumMs;
  }

  const overallDurationAggs = {
    sampleCount: overallSampleCount,
    minMs: overallSampleCount > 0 ? overallMinMs : 0,
    maxMs: overallMaxMs,
    avgMs: overallSampleCount > 0 ? overallSumMs / overallSampleCount : 0,
  };

  return { allDurations, modelDurations, modelDurationAggs, overallDurationAggs };
}

export function computeAggregatesFromAggregations(rows: DurationAggregateRow[]): ComputedDurationAggregates {
  const allDurations: number[] = [];
  const modelDurations = new Map<string, number[]>();
  const modelDurationAggs = new Map<string, ExecutionDurationAggregates>();

  let overallSampleCount = 0;
  let overallMinMs = Number.MAX_SAFE_INTEGER;
  let overallMaxMs = 0;
  let overallSumMs = 0;

  for (const row of rows) {
    const key = buildModelStatsKey(row.provider, row.model);
    modelDurationAggs.set(key, {
      sampleCount: toNumber(row.sampleCount),
      minMs: toNumber(row.minMs),
      maxMs: toNumber(row.maxMs),
      avgMs: toNumber(row.avgMs),
    });

    const count = toNumber(row.sampleCount);
    overallSampleCount += count;
    overallMinMs = Math.min(overallMinMs, toNumber(row.minMs));
    overallMaxMs = Math.max(overallMaxMs, toNumber(row.maxMs));
    overallSumMs += toNumber(row.avgMs) * count;
  }

  const overallDurationAggs = {
    sampleCount: overallSampleCount,
    minMs: overallSampleCount > 0 ? overallMinMs : 0,
    maxMs: overallMaxMs,
    avgMs: overallSampleCount > 0 ? overallSumMs / overallSampleCount : 0,
  };

  return { allDurations, modelDurations, modelDurationAggs, overallDurationAggs };
}
