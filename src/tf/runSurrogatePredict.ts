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
