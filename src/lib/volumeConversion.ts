/** m³/s → L/s (spec §4). */
export const M3S_TO_L_PER_S = 1000

/** (m³/s)/m² → L/(s·m²) */
export const M3S_M2_TO_L = 1000

export const J_PER_kWh = 3_600_000

export function jToKwh(j: number): number {
  return j / J_PER_kWh
}

export function jToMwh(j: number): number {
  return j / 3.6e9
}

export type EnergyDisplayUnit = 'J' | 'kWh' | 'MWh'

export function formatEnergy(
  j: number,
  mode: EnergyDisplayUnit,
  locale: string = 'en-CA',
): { text: string; unit: string } {
  if (mode === 'J') {
    if (!Number.isFinite(j)) {
      return { text: '—', unit: 'J' }
    }
    if (Math.abs(j) >= 1e6) {
      return { text: j.toExponential(4), unit: 'J' }
    }
    return { text: j.toLocaleString(locale, { maximumFractionDigits: 0 }), unit: 'J' }
  }
  if (mode === 'MWh') {
    const mwh = jToMwh(j)
    if (!Number.isFinite(mwh)) {
      return { text: '—', unit: 'MWh' }
    }
    return { text: mwh.toFixed(1), unit: 'MWh' }
  }
  const kwh = jToKwh(j)
  if (!Number.isFinite(kwh)) {
    return { text: '—', unit: 'kWh' }
  }
  return { text: kwh.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }), unit: 'kWh' }
}
