/**
 * LTTB (Largest Triangle Three Buckets) downsampling implementation.
 * Reduces the number of points while preserving visual characteristics.
 * Suitable for time-series line charts.
 */
export interface Point { t: number; v: number }

export function lttb(points: Point[], threshold: number): Point[] {
  if (points.length <= threshold || threshold <= 0) return points;
  const sampled: Point[] = [];
  const bucketSize = (points.length - 2) / (threshold - 2);
  let a = 0; // initially index of the first point
  sampled.push(points[a]);

  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * bucketSize) + 1;
    const end = Math.floor((i + 2) * bucketSize) + 1;
    const endClamped = Math.min(end, points.length);

    // Avg of next bucket
    let avgT = 0;
    let avgV = 0;
    const avgRangeStart = start;
    const avgRangeEnd = endClamped;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgT += points[j].t;
      avgV += points[j].v;
    }
    avgT /= avgRangeLength || 1;
    avgV /= avgRangeLength || 1;

    // Range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    const rangeToClamped = Math.min(rangeTo, points.length - 1);

    const pointA = points[a];
    let maxArea = -1;
    let maxIndex = rangeOffs;
    for (let j = rangeOffs; j < rangeToClamped; j++) {
      const area = Math.abs(
        (pointA.t - avgT) * (points[j].v - pointA.v) -
        (pointA.t - points[j].t) * (avgV - pointA.v)
      ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }
    sampled.push(points[maxIndex]);
    a = maxIndex;
  }

  sampled.push(points[points.length - 1]);
  return sampled;
}

/**
 * Generates a downsampled copy of the points constrained to a time window (trailing).
 * Points must be sorted by ascending timestamp `t`.
 */
export function windowAndDownsample(points: Point[], windowMs: number, maxPoints: number): Point[] {
  if (!points.length) return points;
  const cutoff = points[points.length - 1].t - windowMs;
  let startIdx = 0;
  // binary-ish search (linear fallback due to small size) for simplicity
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].t < cutoff) { startIdx = i + 1; break; }
  }
  const slice = points.slice(startIdx);
  if (slice.length <= maxPoints) return slice;
  return lttb(slice, maxPoints);
}
