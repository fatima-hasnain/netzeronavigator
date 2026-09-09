import {
  computeDerivedMetrics,
  contextRecordForDerived,
  mergeDerivedContext,
  outputsRecordToJ,
} from './derivedMetrics'
import { jToKwh, jToMwh, type EnergyDisplayUnit } from './volumeConversion'
import type { TfModel } from '../types/manifest'

/** Shared by Sensitivity, Heatmap, and Tornado — the "which output to look at" dropdown. */
export const DERIVED_OPTIONS = [
  ['TEDI', 'Thermal Energy Demand Intensity'],
  ['CEDI', 'Cooling Energy Demand Intensity'],
  ['EUI', 'Energy Use Intensity'],
  ['GHGI', 'GHG Intensity'],
  ['OPERATING_COST', 'Operating Cost'],
] as const

export type DerivedKey = (typeof DERIVED_OPTIONS)[number][0]
export type OutputSelection = `tensor:${string}` | `derived:${DerivedKey}`

export function displayTensorValue(joules: number, mode: EnergyDisplayUnit): number {
  if (mode === 'kWh') return jToKwh(joules)
  if (mode === 'MWh') return jToMwh(joules)
  return joules
}

export function outputSelectionUnit(
  outputSelection: OutputSelection,
  energyMode: EnergyDisplayUnit,
): string {
  if (outputSelection.startsWith('tensor:')) return energyMode
  if (outputSelection === 'derived:GHGI') return 'kgCO₂/m²'
  if (outputSelection === 'derived:OPERATING_COST') return '$/m²'
  return 'kWh/m²'
}

export function outputSelectionLabel(outputSelection: string): string {
  return outputSelection.replace(/^(tensor|derived):/, '')
}

/** One prediction row → the number the current output selection displays. */
export function resolveOutputValue(
  outputSelection: OutputSelection,
  prediction: Record<string, number>,
  tfModel: TfModel,
  sampleValues: Record<string, number>,
  energyMode: EnergyDisplayUnit,
): number {
  if (outputSelection.startsWith('tensor:')) {
    const outputId = outputSelection.slice('tensor:'.length)
    return displayTensorValue(prediction[outputId], energyMode)
  }
  const rawOutputs = outputsRecordToJ(prediction)
  if (!rawOutputs) return Number.NaN
  const context = contextRecordForDerived(mergeDerivedContext(tfModel, sampleValues))
  const derived = computeDerivedMetrics(rawOutputs, context)
  const key = outputSelection.slice('derived:'.length) as DerivedKey
  return derived[key]
}
