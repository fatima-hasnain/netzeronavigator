import type { ManifestFeature } from '../types/manifest'

/** z = (x - u) / s (sklearn StandardScaler-style). */
export function standardize(u: number, s: number, x: number): number {
  if (s === 0) {
    throw new Error('training-scale is zero')
  }
  return (x - u) / s
}

/** x = z * s + u */
export function deStandardize(u: number, s: number, z: number): number {
  return z * s + u
}

export function coerceNumericDefault(defaultValue: unknown, featureId: string): number {
  if (typeof defaultValue === 'number' && !Number.isNaN(defaultValue)) {
    return defaultValue
  }
  if (typeof defaultValue === 'string') {
    const n = Number(defaultValue)
    if (!Number.isNaN(n)) return n
  }
  throw new Error(
    `Non-numeric default for tensor feature ${featureId}; categorical encoding not implemented`,
  )
}

/**
 * Build one row of standardized inputs in `tf.position` order for `orderedInputFeatures`.
 */
export function buildStandardizedInputVector(
  orderedInputFeatures: ManifestFeature[],
  valueMap: Record<string, number>,
): number[] {
  return orderedInputFeatures.map((f) => {
    const id = f.feature.id
    const raw =
      valueMap[id] ?? coerceNumericDefault(f.default, id)
    const u = f.tf?.['training-mean']
    const s = f.tf?.['training-scale']
    if (u === undefined || s === undefined) {
      throw new Error(`Missing training-mean/training-scale for input ${id}`)
    }
    return standardize(u, s, raw)
  })
}
