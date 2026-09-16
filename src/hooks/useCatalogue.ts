import { useEffect, useState } from 'react'
import { modelsBase } from '../lib/assetUrls'
import type { CatalogueModel } from '../lib/catalogue'

type State = { status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; models: CatalogueModel[] }

/**
 * Fetches the generated catalogue once per mount. `catalog.json` is machine-written
 * by `scripts/generate-catalog.mjs`, not hand-edited, but it's still fetched over
 * the network as plain JSON with no compile-time guarantee it matches
 * `CatalogueModel` — the shape/schemaVersion check below exists so a stale or
 * regenerated-with-a-different-shape catalogue fails loudly as a catalogue error
 * instead of the picker silently rendering `undefined` fields.
 */
export function useCatalogue() {
  const [state, setState] = useState<State>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${modelsBase()}/models/catalog.json`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw Error(`Catalogue request failed (${response.status})`)
        const data = await response.json()
        if (data.schemaVersion !== 1 || !Array.isArray(data.models) || data.models.some((m: CatalogueModel) => !m.id || !m.displayName || !Array.isArray(m.reasons) || !Array.isArray(m.outputNames))) throw Error('Invalid model catalogue')
        setState({ status: 'success', models: data.models })
      }).catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', error: String(error) }) })
    return () => controller.abort()
  }, [])
  return state
}
