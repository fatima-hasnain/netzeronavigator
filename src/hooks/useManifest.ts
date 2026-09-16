import { useEffect, useState } from 'react'
import { manifestUrl, modelsBase } from '../lib/assetUrls'
import type { Manifest } from '../types/manifest'
import { tensorInputFeatures, tensorOutputFeatures } from '../lib/tfFeatureSelection'
import { coerceNumericDefault } from '../tf/standardize'
import type { CatalogueModel } from '../lib/catalogue'

export type ManifestState =
  | { status: 'loading' }
  | { status: 'success'; data: Manifest }
  | { status: 'preview'; entry: CatalogueModel }
  | { status: 'error'; error: string }

/** Fetch `_manifest.json` for a surrogate. Pass a defined id (e.g. from a child keyed by route param). */
export function useManifest(surrogateId: string): ManifestState {
  const [state, setState] = useState<ManifestState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(modelsBase() + '/models/catalog.json')
      .then(async response => {
        if (!response.ok) throw Error('Could not load model catalogue: ' + response.status)
        const catalog = await response.json()
        const entry = catalog.models?.find((m: { id: string }) => m.id === surrogateId)
        if (!entry) throw Error('Unknown model ID: ' + surrogateId)
        if (entry.status !== 'available') {
          if (!cancelled) setState({ status: 'preview', entry })
          return null
        }
        return fetch(manifestUrl(surrogateId))
      })
      .then((res) => {
        if (!res) return null
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`)
        }
        return res.json() as Promise<Manifest>
      })
      .then((data) => {
        if (!data) return
        if (!Array.isArray(data['tf-models']) || !data['tf-models'].length || data['tf-models'].some(m => !m.path || !Array.isArray(m.features) || m.features.some(f => !f.feature?.id))) throw Error('Invalid model manifest')
        for (const model of data['tf-models']) {
          const inputs = tensorInputFeatures(model), outputs = tensorOutputFeatures(model)
          if (!inputs.length || !outputs.length) throw Error('Missing parameter metadata')
          for (const features of [inputs, outputs]) features.forEach((f, i) => {
            if (f.tf?.position !== i || !Number.isFinite(f.tf['training-mean']) || !Number.isFinite(f.tf['training-scale']) || f.tf['training-scale']! <= 0) throw Error('Missing or invalid scaler: ' + f.feature.id)
          })
          for (const f of inputs) if (!Number.isFinite(coerceNumericDefault(f.default, f.feature.id))) throw Error('Invalid input default: ' + f.feature.id)
        }
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e)
        if (!cancelled) setState({ status: 'error', error: message })
      })

    return () => {
      cancelled = true
    }
  }, [surrogateId])

  return state
}
