/** Single-hue scale for line-segment slope: pale grey-violet where the curve is
 * flat, saturating into violet where it's changing fastest. `t` is the segment's
 * slope magnitude normalized to [0, 1] by the steepest slope in the series. Fixed
 * across colour themes, same as the magnitude scale it replaced. */
const SLOPE_FLAT = [139, 135, 150] as const // #8b8796
const SLOPE_STEEP = [167, 129, 250] as const // #a781fa

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
