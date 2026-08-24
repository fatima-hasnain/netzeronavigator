import * as tf from '@tensorflow/tfjs'
import { useEffect, useState } from 'react'

export type TfModelLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; model: tf.LayersModel }
  | { status: 'error'; error: string }

/**
 * Load a TFJS `LayersModel` from a URL (e.g. from `tfModelJsonUrl`).
 * Disposes the model when the URL changes or the component unmounts.
 * Remount this hook's consumer (or change `key`) when `modelJsonUrl` changes so
 * loading state resets without synchronous setState in the effect.
 */
export function useTfModel(modelJsonUrl: string | undefined): TfModelLoadState {
  const [state, setState] = useState<TfModelLoadState>(() =>
    modelJsonUrl ? { status: 'loading' } : { status: 'idle' },
  )

  useEffect(() => {
    if (!modelJsonUrl) return

    let cancelled = false
    let loaded: tf.LayersModel | null = null

    void (async () => {
      try {
        await tf.ready()
        const model = await tf.loadLayersModel(modelJsonUrl)
        if (cancelled) {
          model.dispose()
          return
        }
        loaded = model
        setState({ status: 'ready', model })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        if (!cancelled) setState({ status: 'error', error: message })
      }
    })()

    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [modelJsonUrl])

  if (!modelJsonUrl) {
    return { status: 'idle' }
  }
  return state
}
