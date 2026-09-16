# Architecture overview

> **Model discovery is URL-driven; the app does not scan model directories.**

Net Zero Navigator is a React app for interactively exploring building-energy surrogate models and their predicted performance metrics.

The prediction pipeline is:

`route ID → manifest → selected TF.js model → slider state → standardized tensor → prediction → de-standardized outputs → derived metrics`

## Model files and discovery

`public/models/` contains each surrogate under its ID, currently `20200224/`. Each directory has `_manifest.json`; model folders contain `model.json` and weight shards.

`src/lib/assetUrls.ts` provides `manifestUrl()` and `tfModelJsonUrl()`. The `/s/:surrogateId` route supplies the model directory name, and the manifest's `tf-models[].path` identifies each `model.json`. `VITE_MODELS_BASE` can redirect these URLs to another host.

## Manifest parsing and model selection

`src/hooks/useManifest.ts` contains `useManifest()`, which fetches `_manifest.json` and parses it with `response.json()`. Its permissive TypeScript shape is defined by `Manifest`, `TfModel`, and `ManifestFeature` in `src/types/manifest.ts`.

In `src/pages/SurrogatePage.tsx`, `SurrogateContent()` reads `manifest['tf-models']`. Configuration changes use `findTfIndexBySelection()` from `src/lib/tfModelSelection.ts` to choose the appropriate trained model.

## Loading and TensorFlow.js inference

`src/hooks/useTfModel.ts` contains `useTfModel()`, which calls `tf.ready()` and `tf.loadLayersModel(modelJsonUrl)`.

The actual forward pass is `runSurrogatePredict()` in `src/tf/runSurrogatePredict.ts`. It creates a `tensor2d`, calls `model.predict()`, reads the result, and disposes temporary tensors through `tf.tidy()`.

## Slider-to-prediction state flow

`src/components/SurrogateExploration.tsx` defines `onInputChange()`, passes it to `InputSlidersPane`, and uses it to update the exploration hook's `values` map.

`src/hooks/useSurrogateExploration.ts` owns that state and runs inference after a 300 ms debounce whenever `values` changes. `tensorInputFeatures()` and `tensorOutputFeatures()` in `src/lib/tfFeatureSelection.ts` establish tensor order from each feature's `tf.position`.

`buildStandardizedInputVector()` in `src/tf/standardize.ts` applies `(value − training-mean) / training-scale`. `rawPredictionToOutputs()` in `src/tf/tensorPipeline.ts` de-standardizes the raw prediction and maps it back to feature IDs — see below for exactly how each output column is decoded.

### Output decoding and the Box-Cox path

`rawPredictionToOutputs()` (`src/tf/tensorPipeline.ts`) decodes each output column independently based on that feature's own `tf` metadata:

- `output-transform: 'linear'` — the de-standardized value is used as-is.
- No `boxcox-lambda` — legacy path, `Math.exp()` of the de-standardized value (mirrors `de-standardize-sample` + `exponentiate` in the original `nzn.browser.tfjs` pipeline).
- `boxcox-lambda` present — the feature was standardized *inside* Box-Cox space during training, so decoding reverses both steps: de-standardize, then apply the inverse Box-Cox transform `t = (y·λ + 1)^(1/λ)` (or `t = exp(y)` when `λ = 0`).
- An optional `output-offset` is subtracted last, regardless of which branch produced the value.

Box-Cox is only defined for positive pre-images. `inverseBoxCox()` clamps a would-be non-positive pre-image (`y·λ + 1 ≤ 0`) to `Number.EPSILON` instead of throwing. This matters because `runSurrogatePredictBatch` decodes every row of a sweep/heatmap through this same function in one pass — without the clamp, one sample landing outside the valid domain near the edge of a slider's training range would throw and abort the entire batch (all 20 Sensitivity steps, or all 400 Heatmap cells) instead of just that one sample.

## Derived metrics

`src/lib/derivedMetrics.ts` contains `computeDerivedMetrics()`. It calculates TEDI from heating demand divided by floor area and EUI from the summed modeled end uses divided by floor area. It also calculates CEDI, GHGI, and operating cost.

In `src/components/OutputReadoutPane.tsx`, `OutputReadoutPane()` uses `outputsRecordToJ()`, `mergeDerivedContext()`, `contextRecordForDerived()`, and `computeDerivedMetrics()` in a memoized calculation whenever predictions or slider values change.

This calculation assumes every input value is already in joules — see [Known limitations](#known-limitations).

## Visualization views

`OutputReadoutPane` (`src/components/OutputReadoutPane.tsx`) owns a tab strip of five views over the same active model and slider state, plus the energy display unit (J / kWh / MWh) shared across all of them:

| View | Component | What it sweeps | Question it answers |
| --- | --- | --- | --- |
| All Inputs | `OutputAllInputsView` | Every input, one mini curve each, `SWEEP_STEPS` points, shared y-axis | Which inputs move the output at all, at a glance? Click a tile to open it in Sensitivity. |
| Sensitivity | `OutputSensitivityView` | One chosen input, full training range, `SWEEP_STEPS` (20) points | What happens to output X as input Y moves, with everything else fixed at its current value? |
| Tornado | `OutputTornadoView` | Every input, its two range endpoints only (2 points each) | Given the design currently on screen, which input matters most *from here*? Ranked by output swing. |
| Heatmap | `OutputHeatmapView` | Two chosen inputs, `GRID_STEPS × GRID_STEPS` (20×20 = 400 cells) | Do these two inputs interact, beyond what either one's Sensitivity curve alone would show? |
| Comparison | `OutputComparisonView` | Two independently-set input tables | How do two specific designs compare (e.g. current vs. a proposed retrofit), rather than sweeping around one? |

All Inputs, Sensitivity, Tornado, and Heatmap each hold every *other* input at the user's current slider position (`valueMap`), not the model's defaults — the views describe local behavior around the design currently being explored, and re-rank/re-plot as sliders move. Comparison is the exception: it predicts two independent input sets and shows them side by side with their own outputs, derived metrics, and a radar chart.

Every sweep/grid view calls `runSurrogatePredictBatch()` (`src/tf/runSurrogatePredict.ts`) once with all of its samples stacked into a single `tensor2d`, rather than looping a single-row predict call per sample. `model.predict()` carries fixed tensor-allocation and kernel-dispatch overhead per call regardless of batch size, so batching amortizes that overhead across every row — this is what keeps Heatmap's 400 cells (the most expensive view) responsive while a slider is being dragged.

`ExpandableChart` (`src/components/ExpandableChart.tsx`) wraps each view's chart and re-renders the same `children` larger inside a native `<dialog>` modal, so `showModal()` provides focus trapping, Escape-to-close, and `::backdrop` styling without a hand-rolled overlay.

## Catalogue and model discovery

The home page (`src/pages/HomePage.tsx`) does not read `public/models/` directly — it loads the generated `public/models/catalog.json` through `useCatalogue()` (`src/hooks/useCatalogue.ts`), typed by `CatalogueModel` (`src/lib/catalogue.ts`).

`catalog.json` is built by `scripts/generate-catalog.mjs`, which walks several source pipelines (hand-exported TF.js bundles, a legacy interface, pilot-run exports, and the 280-model reconstructed archetype sweep) and, for each, records a `status` of `'available'` or `'unavailable'` plus a finer-grained `validationStatus` (`runtime-checked`, `sample-checked`, `reconstructed-unverified`, `unverified`, …). `status` is the load-bearing field: only `'available'` entries have a working TF.js export and can actually predict. Everything else is metadata-only.

`HomePage` splits the catalogue on that field:

- **Ready to explore** — always-visible grid of `status: 'available'` models; each opens the interactive Explorer at `/s/:surrogateId`.
- **Archive** (`ArchivePicker`) — collapsed by default, filterable by search / archetype / location / status. Holds everything else, which currently outnumbers the ready models roughly 100 to 1 (mostly the 280-model archetype sweep). Collapsing it keeps the handful of predictable models from being buried; the per-source-bucket counts in its summary line (`sourceBucket()` in `catalogue.ts`) keep that scale visible without expanding. Non-available entries route to `ModelPreview` instead of the Explorer, showing metadata, output names, and the specific `reasons` each one isn't predictable yet.

See `docs/MODEL_CATALOGUE.md` for the full generator logic and the transfer-model recovery process.

## Known limitations

**The 280-set archetype sweep is blocked on output-scale validation.** These models have Keras architecture and HDF5 weights (recovered via `scripts/transfer-recovery.mjs` from a partially-reconstructed input scaler profile, see `docs/MODEL_CATALOGUE.md`), but no validated browser export, and their `catalog.json` entries stay `status: 'unavailable'` / `validationStatus: 'reconstructed-unverified'` until that changes. Their `reasons` explicitly include "Output column order and units need confirmation" — the recovery profile could reconstruct plausible *input* ranges from evidence external to the training run, but has no equivalent check for output ordering or units, and none of the 280 have paired physical samples to run the output-scale plausibility check that gates the hand-exported models (see `generate-catalog.mjs`'s normalized-RMSE ≤ 0.35 check). This is a metadata/export gap, not an accuracy claim either way — the models are simply not wired up to predict yet.

**`computeDerivedMetrics()` trusts, rather than verifies, that its inputs are in joules.** `src/lib/derivedMetrics.ts` computes TEDI/CEDI/EUI/GHGI/operating cost directly from whatever numeric values arrive under the `HEATING_DEMAND` / `COOLING_DEMAND` / etc. ids — it does not check what unit those predictions are actually expressed in. The only gate is upstream, in `isJoules()` (`src/lib/modelDisplay.ts`), which allows the derived-metrics path to run when the manifest *declares* an output's `units` as `"J"`. That declaration is reliable for `20200224` and the other hand-exported models, whose manifests are written by a controlled export step. For the 280-model sweep, "J" would come from the same unverified recovery profile described above — a label recovered alongside an unconfirmed scaler, not something physically confirmed against the training run. None of those 280 are `available` today, so this can't happen yet; if one is ever promoted to `available` without independently confirming its output units, `isJoules` would trust the manifest's label at face value and silently compute all five derived metrics from values that may not be joules at all.

**The Lower / Typical / Higher output bands are fixed display thresholds, not calibrated benchmarks.** `src/lib/outputCardMeta.ts` classifies every output and derived metric against hardcoded cutoffs: energy outputs at 5,000 / 500,000 kWh, energy intensities at 30 / 120 kWh/m², GHG intensity at 12.5 / 40 kgCO₂/m², and operating cost at 6.25 / 20 $/m² (the latter two derived as fixed fractions — 0.25× / 0.8× — of a hardcoded "high" reference, not of any model- or archetype-specific data). These are the same three bands for every surrogate in the catalogue, regardless of building archetype, location, or floor area, and are not derived from the training data's own distribution, a code-minimum benchmark, or model confidence. `OutputReadoutPane` discloses this in-app (the "How Lower / Typical / Higher are assigned" details element), but the numbers themselves are not currently configurable per model — a small archetype and a large one are judged against the identical cutoffs.
