import { jToKwh } from './volumeConversion'

/**
 * Default output card level (text + style) when no model-level thresholds exist.
 * Not colour-only: `label` is always present for accessibility.
 */
export function outputLevelBand(
  value: number,
  low: number,
  high: number,
): { label: string; className: string } {
  if (!Number.isFinite(value)) {
    return { label: '—', className: 'bg-zinc-600 text-zinc-100' }
  }
  if (value <= low) {
    return { label: 'Lower', className: 'bg-emerald-700/90 text-emerald-50' }
  }
  if (value >= high) {
    return { label: 'Higher', className: 'bg-amber-700/90 text-amber-50' }
  }
  return { label: 'Typical', className: 'bg-zinc-600 text-zinc-100' }
}

/** Heuristic kWh bands (from J) for six end-use outputs. */
export function energyOutputLevelJ(j: number): { label: string; className: string } {
  if (!Number.isFinite(j)) {
    return { label: '—', className: 'bg-zinc-600 text-zinc-100' }
  }
  const kwh = jToKwh(j)
  return outputLevelBand(kwh, 5_000, 500_000)
}

export const DEFAULT_REFERENCE_EUI_KWH_M2 = 150

export function derivedMetricBarFraction(
  value: number,
  reference: number = DEFAULT_REFERENCE_EUI_KWH_M2,
): number {
  if (!Number.isFinite(value) || reference <= 0) return 0
  return Math.min(1, Math.max(0, value / reference))
}

/** Simple bands for TEDI / EUI in kWh/m² (P2 display). */
export function derivedIntensityLevel(v: number): { label: string; className: string } {
  if (!Number.isFinite(v)) {
    return { label: '—', className: 'bg-zinc-600 text-zinc-100' }
  }
  return outputLevelBand(v, 30, 120)
}

export function ghgOrCostLevel(v: number, high: number): { label: string; className: string } {
  if (!Number.isFinite(v)) {
    return { label: '—', className: 'bg-zinc-600 text-zinc-100' }
  }
  return outputLevelBand(v, high * 0.25, high * 0.8)
}
