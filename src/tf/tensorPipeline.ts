import type { ManifestFeature } from '../types/manifest'
import { deStandardize } from './standardize'

/**
 * Map raw model output row (one standardized output per column, order matches
 * `orderedOutputFeatures`) through de-standardization and `Math.exp`, matching legacy
 * `de-standardize-sample` + `exponentiate` in `nzn.browser.tfjs`.
 */
export function rawPredictionToOutputs(
  rawRow: Float32Array | number[],
  orderedOutputFeatures: ManifestFeature[],
): Record<string, number> {
  const len = rawRow instanceof Float32Array ? rawRow.length : rawRow.length
  if (len !== orderedOutputFeatures.length) {
    throw new Error(
      `Model output length ${len} does not match output feature count ${orderedOutputFeatures.length}`,
    )
  }
  const out: Record<string, number> = {}
  for (let i = 0; i < orderedOutputFeatures.length; i++) {
    const f = orderedOutputFeatures[i]
    const id = f.feature.id
    const u = f.tf?.['training-mean']
    const s = f.tf?.['training-scale']
    if (u === undefined || s === undefined) {
      throw new Error(`Missing training-mean/training-scale for output ${id}`)
    }
    const z = rawRow[i]
    const y = deStandardize(u, s, z)
    out[id] = Math.exp(y)
  }
  return out
}
