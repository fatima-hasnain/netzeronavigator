import * as tf from '@tensorflow/tfjs'
import type { ManifestFeature } from '../types/manifest'
import { buildStandardizedInputVector } from './standardize'
import { rawPredictionToOutputs } from './tensorPipeline'

/**
 * One forward pass: standardized inputs → `model.predict` → de-standardize + exp on outputs.
 * Shared by [`SurrogateExploration`](../components/SurrogateExploration.tsx) and tests.
 */
export function runSurrogatePredict(
  model: tf.LayersModel,
  orderedIn: ManifestFeature[],
  orderedOut: ManifestFeature[],
  values: Record<string, number>,
): Record<string, number> {
  const inCount = orderedIn.length
  const outCount = orderedOut.length
  const inputShape = model.inputs[0]?.shape
  const lastDim = inputShape?.[inputShape.length - 1]
  if (lastDim != null && lastDim > 0 && lastDim !== inCount) {
    throw new Error(
      `Model input width ${String(lastDim)} does not match manifest tensor inputs (${inCount})`,
    )
  }

  const row = buildStandardizedInputVector(orderedIn, values)
  const raw = tf.tidy(() => {
    const input = tf.tensor2d([row])
    const pred = model.predict(input) as tf.Tensor
    const arr = pred.dataSync()
    return Float32Array.from(arr)
  })

  if (raw.length !== outCount) {
    throw new Error(
      `Model output length ${raw.length} does not match manifest tensor outputs (${outCount})`,
    )
  }

  return rawPredictionToOutputs(raw, orderedOut)
}

/**
 * Run multiple input value maps as one `model.predict` call instead of looping
 * `runSurrogatePredict` per sample. Every sweep view (Sensitivity's 20 steps,
 * Tornado's 2 per input, All Inputs' 20 × input-count, Heatmap's 20 × 20 grid)
 * needs many predictions per slider move, and each `model.predict` call carries
 * fixed tensor-allocation and kernel-dispatch overhead regardless of batch size —
 * one call over a stacked `tensor2d` amortizes that overhead across every row
 * instead of paying it once per row, which is what keeps these views responsive
 * while a slider is being dragged.
 */
export function runSurrogatePredictBatch(
  model: tf.LayersModel,
  orderedIn: ManifestFeature[],
  orderedOut: ManifestFeature[],
  valueMaps: Record<string, number>[],
): Record<string, number>[] {
  if (valueMaps.length === 0) return []

  const inCount = orderedIn.length
  const outCount = orderedOut.length
  const inputShape = model.inputs[0]?.shape
  const lastDim = inputShape?.[inputShape.length - 1]
  if (lastDim != null && lastDim > 0 && lastDim !== inCount) {
    throw new Error(
      `Model input width ${String(lastDim)} does not match manifest tensor inputs (${inCount})`,
    )
  }

  const rows = valueMaps.map((values) =>
    buildStandardizedInputVector(orderedIn, values),
  )
  const raw = tf.tidy(() => {
    const input = tf.tensor2d(rows)
    const pred = model.predict(input) as tf.Tensor
    return Float32Array.from(pred.dataSync())
  })

  if (raw.length !== valueMaps.length * outCount) {
    throw new Error(
      `Model output length ${raw.length} does not match batch size ${valueMaps.length} × output count ${outCount}`,
    )
  }

  return valueMaps.map((_, rowIndex) => {
    const start = rowIndex * outCount
    return rawPredictionToOutputs(raw.slice(start, start + outCount), orderedOut)
  })
}
