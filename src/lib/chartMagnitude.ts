/**
 * Cividis sequential palette: blue through neutral tones to warm gold. Used for the
 * heatmap's per-cell magnitude (`fraction` is the cell's value normalized to the
 * heatmap's own min→max range, always [0, 1] here — unlike `slopeColor`, which
 * handles out-of-range input defensively because its `t` comes from a derivative
 * that can occasionally exceed the series' own range). Cividis specifically because
 * it was designed to be perceptually uniform *and* to remain distinguishable under
 * red-green and blue-yellow colour-vision deficiency simulations, which a
 * hand-picked blue-to-gold ramp would not guarantee; a diverging (e.g. blue-red)
 * scale was not used because this encodes an unsigned magnitude, not a signed
 * quantity, and blue-red would wrongly suggest a positive/negative split.
 */
export const MAGNITUDE_STOPS = ['#00224e', '#123570', '#3b496c', '#575d6d', '#707173', '#8a8678', '#a59c74', '#c3b369', '#e1cc55', '#fee838']
export const MAGNITUDE_GRADIENT = 'linear-gradient(90deg, ' + MAGNITUDE_STOPS.join(', ') + ')'
export function magnitudeColor(fraction: number): string {
  if (!Number.isFinite(fraction)) return '#697b88'
  const t = Math.max(0, Math.min(1, fraction)) * (MAGNITUDE_STOPS.length - 1)
  const index = Math.min(Math.floor(t), MAGNITUDE_STOPS.length - 2)
  const u = t - index
  const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16))
  const a = rgb(MAGNITUDE_STOPS[index]), b = rgb(MAGNITUDE_STOPS[index + 1])
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',') + ')'
}
