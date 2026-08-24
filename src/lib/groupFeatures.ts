import type { Manifest, ManifestFeature, TfModel } from '../types/manifest'

/** Sort key aligned with snapshot: `ui.order`, then `ui.position`, then `tf.position`. */
export function featureSortKey(f: ManifestFeature): number {
  const u = f.ui
  if (u?.order !== undefined) return u.order
  if (u?.position !== undefined) return u.position
  if (f.tf?.position !== undefined) return f.tf.position
  return 0
}

export function flattenFeatures(manifest: Manifest): ManifestFeature[] {
  const models = manifest['tf-models'] ?? []
  return models.flatMap((m: TfModel) => m.features ?? [])
}

export function groupFeaturesByKind(
  manifest: Manifest,
): Map<string, ManifestFeature[]> {
  const map = new Map<string, ManifestFeature[]>()
  for (const f of flattenFeatures(manifest)) {
    const k = f.kind
    const list = map.get(k)
    if (list) list.push(f)
    else map.set(k, [f])
  }
  for (const list of map.values()) {
    list.sort((a, b) => featureSortKey(a) - featureSortKey(b))
  }
  return map
}

export function firstTfModel(manifest: Manifest): TfModel | undefined {
  const models = manifest['tf-models']
  return models?.[0]
}
