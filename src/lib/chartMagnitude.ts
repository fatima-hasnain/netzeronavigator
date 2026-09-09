/** Cividis sequential palette: blue through neutral tones to warm gold. */
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
