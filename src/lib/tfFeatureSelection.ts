import type { ManifestFeature, TfModel } from '../types/manifest'

const INPUT_KINDS = new Set([
  'exterior-context',
  'exterior-selection',
  'surrogate-input',
])

/** Features that feed the NN input tensor: have `tf` metadata and an input-side `kind`. */
export function tensorInputFeatures(tfModel: TfModel): ManifestFeature[] {
  return (tfModel.features ?? [])
    .filter(
      (f) =>
        f.tf != null &&
        f.tf.position !== undefined &&
        INPUT_KINDS.has(f.kind),
    )
    .sort((a, b) => (a.tf!.position ?? 0) - (b.tf!.position ?? 0))
}

/** Features produced by the NN (standardized then de-standardized + exp in this app). */
export function tensorOutputFeatures(tfModel: TfModel): ManifestFeature[] {
  return (tfModel.features ?? [])
    .filter(
      (f) =>
        f.tf != null &&
        f.tf.position !== undefined &&
        f.kind === 'surrogate-output',
    )
    .sort((a, b) => (a.tf!.position ?? 0) - (b.tf!.position ?? 0))
}
