import { useEffect, useState } from 'react'
import { manifestUrl } from '../lib/assetUrls'
import type { Manifest } from '../types/manifest'

export type ManifestState =
  | { status: 'loading' }
  | { status: 'success'; data: Manifest }
  | { status: 'error'; error: string }

/** Fetch `_manifest.json` for a surrogate. Pass a defined id (e.g. from a child keyed by route param). */
export function useManifest(surrogateId: string): ManifestState {
  const [state, setState] = useState<ManifestState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(manifestUrl(surrogateId))
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`)
        }
        return res.json() as Promise<Manifest>
      })
      .then((data) => {
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
