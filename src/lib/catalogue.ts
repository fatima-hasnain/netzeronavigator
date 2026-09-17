/**
 * Shape of one entry in the generated `public/models/catalog.json` (built by
 * `scripts/generate-catalog.mjs` from several source pipelines — hand-exported
 * TF.js bundles, a legacy interface, and a reconstructed archetype sweep) plus the
 * filtering/display helpers the catalogue picker (HomePage) builds on. `status`
 * is the load-bearing field: only `'available'` entries have a working TF.js
 * export and can actually predict; everything else is metadata-only.
 */
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

/** Output names come from several source pipelines with no shared naming convention:
 * SNAKE_CASE ids, hyphenated variants, raw EnergyPlus meter names ("Electricity:Facility"),
 * or already human-written strings ("Aggregate space heating demand"). This is a
 * best-effort display transform for the catalogue cards, not a lookup table like
 * i18n/t.ts (which only covers known manifest feature ids and would mangle acronyms
 * like "TEDI" that don't appear in it). */
const OUTPUT_NAME_ACRONYMS = new Set(['PV', 'NG', 'DHW', 'HVAC', 'TEDI', 'TEUI', 'TED', 'TEU', 'EUI', 'GHGI'])
export function humanizeOutputName(raw: string): string {
  if (/[a-z]/.test(raw) && / /.test(raw)) return raw
  const spaced = raw.replace(/[:_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim()
  return spaced
    .split(/\s+/)
    .map(w => (OUTPUT_NAME_ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
}

export const MAX_OUTPUT_NAMES_SHOWN = 3

export function filterModels(models: CatalogueModel[], search: string, archetype: string, location: string, status: string) {
  return models.filter(m => (!archetype || normalizeArchetype(m.archetype) === archetype) && (!location || m.location === location) &&
    (!status || m.status === status || m.validationStatus === status) &&
    cleanDisplayName(m.displayName).toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
}
