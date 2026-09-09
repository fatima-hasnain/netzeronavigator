export function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'

  const magnitude = Math.abs(value)
  if (magnitude >= 1_000_000) {
    return value.toLocaleString('en-CA', {
      notation: 'compact',
      maximumFractionDigits: 2,
    })
  }
  if (magnitude >= 1_000) {
    return value.toLocaleString('en-CA', { maximumFractionDigits: 0 })
  }
  if (magnitude >= 1) {
    return value.toLocaleString('en-CA', { maximumFractionDigits: 2 })
  }
  return value.toLocaleString('en-CA', { maximumSignificantDigits: 3 })
}
