export interface CatalogueModel {
  id: string
  displayName: string
  archetype: string
  location: string
  version: string
  source?: string
  modelPath: string
  format: string
  inputCount: number | null
  outputCount: number | null
  outputNames: string[]
  status: 'available' | 'unavailable'
  validationStatus: string
  reasons: string[]
  recovery?: {
    profilePath: string
    totalSamples: number
    rawInputCount: number
    summary: string
    outputOrderStatus: string
    counts: { continuousEstimates: number; categoricalConditionalEstimates: number; blockedInputs: number }
  }
}

/** Groups cosmetic spelling variants ("Retail Stand-Alone" vs "Retail Stand Alone") from different source pipelines into one filter bucket. */
export function normalizeArchetype(archetype: string) {
  return archetype.replaceAll('-', ' ').replace(/\s+/g, ' ').trim()
}

/** A handful of older per-run exports lost their run-folder segment during parsing and picked up a literal "undefined" suffix. */
export function cleanDisplayName(displayName: string) {
  return displayName.replace(/\s*[—-]\s*undefined$/, '')
}

/** Coarse provenance label for the batch a model came from, used to summarize the non-interactive catalogue. */
export function sourceBucket(model: CatalogueModel): string {
  if (model.recovery) return 'archetype sweep (reconstructed)'
  if (model.source?.startsWith('public/models/')) return 'published bundle'
  if (model.source?.startsWith('core_interface/')) return 'legacy interface'
  return 'pilot run export'
}

export function filterModels(models: CatalogueModel[], search: string, archetype: string, location: string, status: string) {
  return models.filter(m => (!archetype || normalizeArchetype(m.archetype) === archetype) && (!location || m.location === location) &&
    (!status || m.status === status || m.validationStatus === status) &&
    cleanDisplayName(m.displayName).toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
}
