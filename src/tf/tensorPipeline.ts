import type { ManifestFeature } from '../types/manifest'
import { deStandardize } from './standardize'

/**
 * Inverse Box-Cox: y(lambda) = (t^lambda - 1) / lambda  =>  t = (y*lambda + 1)^(1/lambda),
 * or t = exp(y) when lambda = 0. Domain guard: box-cox is only defined for t > 0, so a
 * pre-image that would go non-positive (y*lambda + 1 <= 0) clamps to a tiny positive
 * number rather than producing NaN.
 */
function inverseBoxCox(y: number, lambda: number): number {
  if (lambda === 0) return Math.exp(y)
  const base = y * lambda + 1
  if (base <= 0) return Number.EPSILON
  return Math.pow(base, 1 / lambda)
}

/**
 * Map raw model output row (one standardized output per column, order matches
 * `orderedOutputFeatures`) back to real units. Legacy path: de-standardize then
 * `Math.exp` (`de-standardize-sample` + `exponentiate` in `nzn.browser.tfjs`). When a
 * feature carries `tf['boxcox-lambda']`, de-standardize into box-cox space instead (per
 * the NZN pipeline's "standardize inside box-cox" convention) then apply inverse Box-Cox.
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
    const t = deStandardize(u, s, z)
    const lambda = f.tf?.['boxcox-lambda']
    const transform = f.tf?.['output-transform']
    out[id] = (transform === 'linear' ? t : lambda === undefined ? Math.exp(t) : inverseBoxCox(t, lambda)) - (f.tf?.['output-offset'] ?? 0)
    if (!Number.isFinite(out[id])) throw new Error(`Non-finite prediction for ${id}`)
  }
  return out
}
