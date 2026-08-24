/** Map manifest unit keys to display strings (spec §7). */
export function normalizeUnitLabel(u: string | undefined): string {
  if (!u || u === 'n/a') return ''
  if (u === 'degree') return '°'
  if (u === 'eff %') return '%'
  if (u === 'C' || u === '°C') return '°C'
  if (u === 'RH') return '%RH'
  return u
}
