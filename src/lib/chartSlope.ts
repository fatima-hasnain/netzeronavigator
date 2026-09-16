/** Single-hue scale for line-segment slope: pale lavender-grey where the curve is
 * flat, saturating into vivid violet where it's changing fastest. `t` is the
 * segment's slope magnitude normalized to [0, 1] — by the series' own min→max
 * |slope| range (see OutputSensitivityChart), not an absolute scale, so curves
 * with no near-zero segments still use the full range. Fixed across colour
 * themes, same as the magnitude scale it replaced. Widened from an earlier
 * #8b8796→#a781fa pair that was too subtle to read at a glance. */
const SLOPE_FLAT = [221, 217, 234] as const // #ddd9ea
const SLOPE_STEEP = [160, 32, 240] as const // #a020f0

export const SLOPE_GRADIENT =
  'linear-gradient(90deg, rgb(139,135,150), rgb(167,129,250))'

export function slopeColor(t: number): string {
  if (!Number.isFinite(t)) return `rgb(${SLOPE_FLAT.join(',')})`
  const u = Math.max(0, Math.min(1, Math.abs(t)))
  return (
    'rgb(' +
    SLOPE_FLAT.map((v, i) => Math.round(v + (SLOPE_STEEP[i] - v) * u)).join(',') +
    ')'
  )
}
