import type { ManifestFeature } from '../types/manifest'

/**
 * Min/max for `<input type="range">` in **physical (pre-standardization) units**.
 * If manifest has `tf.training-min` and `tf.training-max` and min < max, use them.
 * Otherwise fall back: for values in (0,1] and typical "ratio" style, use [0, 1];
 * else use default ± 20% span (minimum width to avoid zero range).
 */
export function sliderBoundsForFeature(
  feature: ManifestFeature,
  value: number,
): { min: number; max: number } {
  const tmin = feature.tf?.['training-min']
  const tmax = feature.tf?.['training-max']
  if (
    tmin !== undefined &&
    tmax !== undefined &&
    tmin < tmax &&
    Number.isFinite(tmin) &&
    Number.isFinite(tmax)
  ) {
    return { min: tmin, max: tmax }
  }

  if (value > 0 && value <= 1) {
    return { min: 0, max: 1 }
  }

  const span = Math.max(Math.abs(value) * 0.2, 1e-9)
  const min = value - span
  let max = value + span
  if (min >= max) {
    max = min + 1e-6
  }
  return { min, max }
}

export function rangeStep(min: number, max: number): string {
  const w = max - min
  if (w <= 0) return 'any'
  const s = w / 1000
  if (s >= 1) return '1'
  if (s >= 0.01) return s.toExponential(2)
  return String(s)
}
