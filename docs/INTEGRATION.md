# Integrating TensorFlow.js and visualization

## TensorFlow.js (implemented)

The app includes `@tensorflow/tfjs`, [`SurrogateExploration`](../src/components/SurrogateExploration.tsx) (dual-pane inputs/outputs), and the following pipeline (aligned with legacy `nzn.browser.tfjs`):

1. **Load** — `tf.loadLayersModel(tfModelJsonUrl(surrogateId, tfModel.path))` after `tf.ready()` ([`useTfModel`](../src/hooks/useTfModel.ts)). A single hook instance serves both model status ([`TfjsModelStatus`](../src/components/TfjsModelStatus.tsx)) and inference.
2. **Input features** — [`tensorInputFeatures`](../src/lib/tfFeatureSelection.ts): manifest rows with `tf` metadata and `kind` in `exterior-context`, `exterior-selection`, or `surrogate-input`, sorted by `tf.position`. The bundled `20200224` fixture only has `surrogate-input` rows with `tf`.
3. **Standardize** — For each input, \(z = (x - \mu) / \sigma\) using `training-mean` and `training-scale` ([`buildStandardizedInputVector`](../src/tf/standardize.ts)).
4. **Predict** — [`runSurrogatePredict`](../src/tf/runSurrogatePredict.ts): `model.predict(tf.tensor2d([row]))` inside `tf.tidy`.
5. **Outputs** — [`tensorOutputFeatures`](../src/lib/tfFeatureSelection.ts): `kind === "surrogate-output"` with `tf`, sorted by `tf.position`. Each raw output dimension is de-standardized, then its declared linear, exponential, or Box-Cox inverse transform and optional output offset are applied ([`rawPredictionToOutputs`](../src/tf/tensorPipeline.ts)); see the per-model rules in [the model catalogue](MODEL_CATALOGUE.md#inference-and-validation).

**Not from the NN:** `derived-output` rows usually have no `tf` block; they are formula placeholders in the manifest, not tensor outputs.

**Backend:** TFJS defaults apply (typically WebGL when available). You can call `tf.setBackend(...)` after `tf.ready()` if you need to force CPU/WebGPU.

**Bundle size:** The production build pulls in the full TFJS bundle (~1MB+ JS). To reduce initial load, you can later switch to dynamic `import('@tensorflow/tfjs')` inside the exploration panel or a dedicated chunk.

Historical implementation references are background only; the linked TypeScript files in this repository are the current implementation.

## Exploration UI (dual pane)

On a surrogate route, [`useSurrogateExploration`](../src/hooks/useSurrogateExploration.ts) runs **debounced** predictions (default **300 ms**) whenever tensor **input values** change. Only the result of the **latest** completed run is applied (sequence id), so rapid slider changes do not show stale numbers.

- **Input pane** — [`InputSlidersPane`](../src/components/InputSlidersPane.tsx): `range` + number field per tensor input. Slider bounds use `tf.training-min` / `tf.training-max` when both are present and `min < max`; else see [`sliderBoundsForFeature`](../src/lib/sliderBounds.ts) (0–1 fallback for small positive values, otherwise default ± 20% span).
- **Output pane** — [`OutputReadoutPane`](../src/components/OutputReadoutPane.tsx): shows tensor outputs after the model-specific output transform, with an “Updating…” hint while a run is in progress.
- **Layout** — `lg:grid-cols-2`: inputs left, outputs right; single column on small viewports. Main page container uses `max-w-7xl` to fit the split.

For future **parallel coordinates** or multi-run charts, you can add a `samples: Record<featureId, number[]>` layer and plot when there are multiple indices per key.

## Static assets

Surrogate folders live under `public/models/<surrogateId>/`. For deployment behind a CDN, set `VITE_MODELS_BASE` to the public base URL (no trailing slash). See [.env.example](../.env.example).
