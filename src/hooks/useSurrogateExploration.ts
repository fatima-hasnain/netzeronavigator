import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { tfModelJsonUrl } from '../lib/assetUrls'
import { tensorInputFeatures, tensorOutputFeatures } from '../lib/tfFeatureSelection'
import { useTfModel } from './useTfModel'
import { runSurrogatePredict } from '../tf/runSurrogatePredict'
import { initialTensorValueMap } from '../tf/initialTensorValues'
import type { TfModel } from '../types/manifest'

/** Debounce for tensor `predict` when inputs change (ms). */
export const EXPLORATION_DEBOUNCE_MS = 300

/**
 * Manages load state, current input `values`, debounced `runSurrogatePredict`, and outputs.
 * Deduplicates in-flight work with a run sequence: only the latest run applies results.
 */
export function useSurrogateExploration(
  surrogateId: string,
  tfModel: TfModel,
  onOutputsChange?: (outputs: Record<string, number>) => void,
) {
  const onOutputsRef = useRef(onOutputsChange)
  useLayoutEffect(() => {
    onOutputsRef.current = onOutputsChange
  }, [onOutputsChange])

  const modelJsonUrl = useMemo(
    () => tfModelJsonUrl(surrogateId, tfModel.path),
    [surrogateId, tfModel.path],
  )
  const loadState = useTfModel(modelJsonUrl)
  const orderedIn = useMemo(
    () => tensorInputFeatures(tfModel),
    [tfModel],
  )
  const orderedOut = useMemo(
    () => tensorOutputFeatures(tfModel),
    [tfModel],
  )

  const [values, setValues] = useState<Record<string, number>>(() =>
    initialTensorValueMap(orderedIn),
  )
  const [outputs, setOutputs] = useState<Record<string, number> | null>(null)
  const [predictError, setPredictError] = useState<string | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)
  /** True during debounce and synchronous inference (skeleton on outputs). */
  const [isOutputUpdating, setIsOutputUpdating] = useState(false)
  const [inferenceWasSlow, setInferenceWasSlow] = useState(false)
  const runSeq = useRef(0)

  useEffect(() => {
    if (loadState.status === 'ready' && orderedIn.length > 0) {
      return
    }
    const r = requestAnimationFrame(() => {
      setIsOutputUpdating(false)
      setIsPredicting(false)
    })
    return () => cancelAnimationFrame(r)
  }, [loadState, orderedIn.length])

  useEffect(() => {
    if (loadState.status !== 'ready' || orderedIn.length === 0) {
      return
    }
    const model = loadState.model
    const r = requestAnimationFrame(() => {
      setIsOutputUpdating(true)
      setInferenceWasSlow(false)
    })
    const timer = setTimeout(() => {
      const seq = ++runSeq.current
      setIsPredicting(true)
      if (seq === runSeq.current) {
        setPredictError(null)
      }
      const t0 = performance.now()
      try {
        const out = runSurrogatePredict(
          model,
          orderedIn,
          orderedOut,
          values,
        )
        if (seq !== runSeq.current) {
          return
        }
        setOutputs(out)
        onOutputsRef.current?.(out)
        const ms = performance.now() - t0
        setInferenceWasSlow(ms > 1000)
      } catch (e: unknown) {
        if (seq !== runSeq.current) {
          return
        }
        const message = e instanceof Error ? e.message : String(e)
        setPredictError(message)
        setInferenceWasSlow(false)
      } finally {
        if (seq === runSeq.current) {
          setIsPredicting(false)
          setIsOutputUpdating(false)
        }
      }
    }, EXPLORATION_DEBOUNCE_MS)

    return () => {
      cancelAnimationFrame(r)
      clearTimeout(timer)
    }
  }, [loadState, orderedIn, orderedOut, values])

  const resetToDefaults = useCallback(() => {
    setValues(initialTensorValueMap(orderedIn))
  }, [orderedIn])

  return {
    modelJsonUrl,
    loadState,
    tfModel,
    orderedIn,
    orderedOut,
    values,
    setValues,
    outputs,
    predictError,
    isPredicting,
    isOutputUpdating,
    inferenceWasSlow,
    resetToDefaults,
  }
}
