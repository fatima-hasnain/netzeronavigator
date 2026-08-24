import { coerceNumericDefault } from './standardize'
import type { ManifestFeature } from '../types/manifest'

export function initialTensorValueMap(
  features: ManifestFeature[],
): Record<string, number> {
  const m: Record<string, number> = {}
  for (const f of features) {
    const id = f.feature.id
    m[id] = coerceNumericDefault(f.default, id)
  }
  return m
}
