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

`buildStandardizedInputVector()` in `src/tf/standardize.ts` applies `(value − training-mean) / training-scale`. `rawPredictionToOutputs()` in `src/tf/tensorPipeline.ts` de-standardizes results, exponentiates them, and maps them back to feature IDs.

## Derived metrics

`src/lib/derivedMetrics.ts` contains `computeDerivedMetrics()`. It calculates TEDI from heating demand divided by floor area and EUI from the summed modeled end uses divided by floor area. It also calculates CEDI, GHGI, and operating cost.

In `src/components/OutputReadoutPane.tsx`, `OutputReadoutPane()` uses `outputsRecordToJ()`, `mergeDerivedContext()`, `contextRecordForDerived()`, and `computeDerivedMetrics()` in a memoized calculation whenever predictions or slider values change.
