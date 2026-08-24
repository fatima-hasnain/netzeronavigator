import type { TfModel } from '../types/manifest'

function selectionKeyUnion(models: TfModel[]): string[] {
  const s = new Set<string>()
  for (const m of models) {
    for (const k of Object.keys(m.selection ?? {})) s.add(k)
  }
  return [...s]
}

/**
 * For each `selection` key, collect distinct string values from all `tf-models`
 * (used for configuration dropdowns).
 */
export function collectSelectionOptions(
  models: TfModel[],
  id: string,
): string[] {
  const o = new Set<string>()
  for (const m of models) {
    const v = m.selection?.[id]
    if (v != null && v !== '') o.add(String(v))
  }
  return [...o]
}

/**
 * Return the index of the first `tf` whose `selection` exactly matches
 * `active` (same keys, same string values; missing keys in `m.selection` must match
 * as undefined unless both sides omit the key or both equal).
 */
export function findTfIndexBySelection(
  models: TfModel[],
  active: Record<string, string>,
  keys: string[],
): number {
  const klist = keys.length > 0 ? keys : Object.keys(active)
  const matches = (m: TfModel): boolean => {
    const s = m.selection
    for (const k of klist) {
      if ((s?.[k] ?? '') !== (active[k] ?? '')) {
        return false
      }
    }
    return true
  }
  return models.findIndex((m) => matches(m))
}

/**
 * If no exact match, pick the first model; caller may keep previous index
 * to avoid spurious remounts.
 */
export function getSelectionFromModel(
  m: TfModel | undefined,
  keys: string[],
): Record<string, string> {
  const s = m?.selection
  if (!s) {
    return Object.fromEntries(keys.map((k) => [k, '']))
  }
  const o: Record<string, string> = {}
  for (const k of keys) {
    o[k] = s[k] != null ? String(s[k]) : ''
  }
  return o
}

export function allSelectionKeys(models: TfModel[]): string[] {
  return selectionKeyUnion(models)
}
