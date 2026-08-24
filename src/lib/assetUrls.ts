/**
 * Resolve URLs for static surrogate assets served from `public/models/`
 * or from `VITE_MODELS_BASE` when set.
 */

export function modelsBase(): string {
  const raw = import.meta.env.VITE_MODELS_BASE ?? ''
  return raw.replace(/\/$/, '')
}

/** Absolute or root-relative URL to a surrogate `_manifest.json`. */
export function manifestUrl(surrogateId: string): string {
  const base = modelsBase()
  const path = `/models/${encodeURIComponent(surrogateId)}/_manifest.json`
  if (!base) return path
  return `${base}${path}`
}

/**
 * Full URL to a TensorFlow.js `model.json` given manifest id and the relative path
 * from the manifest (e.g. `model_new/model.json`).
 */
export function tfModelJsonUrl(surrogateId: string, modelPath: string): string {
  const base = modelsBase()
  const rel = modelPath.startsWith('/') ? modelPath.slice(1) : modelPath
  const path = `/models/${encodeURIComponent(surrogateId)}/${rel}`
  if (!base) return path
  return `${base}${path}`
}
