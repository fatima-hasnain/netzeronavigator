# Model catalogue

The home page loads `public/models/catalog.json`. The catalogue is generated from source directories, not a hand-maintained list. `/s/<modelId>` identifies a model persistently; `?tf=<manifest-model-path>` retains a configuration. All catalogue records are selectable. The stored `status` describes prediction readiness, not whether selection is allowed. Prediction-ready records open the existing Explorer. Other records open `ModelPreview`, showing the selected model's metadata, output names, outstanding reasons, and reconstructed input table where available. Both Explorer and expanded-chart direct URLs support this details view. No unready model requests a missing manifest or silently falls back. Unknown IDs and genuine fetch/manifest failures show errors.

The home page labels these states **Prediction ready** and **Details only**. All 484 records can be selected; five currently support numerical predictions. Selecting a model with unresolved preprocessing does not imply its predictions were enabled or validated.

## Repository inspection

| Source | Convention | Contents |
| --- | --- | --- |
| Dashboard `public/models/<id>/` | `_manifest.json`, relative TFJS model path and binary shards | Simple Office and approximate Calgary pilot |
| Pipeline `Surrogate Development/Universal/Projects/<project>/surrogate_runs/<run>/outputs/` | `models/<archetype>_<weather>.epw_model_<index>.json/.h5`, `metadata/<stem>_metadata_<index>.p` | Trained run versions and per-run scalers, parameter metadata, output labels and offsets |
| Pipeline `Surrogate Development/Universal/pulled_data/<run>/models/` | `<archetype>_<weather>.epw_model.json/.h5` | Archived models |
| Pipeline Git ref `origin/dev-main:NZN_Archetype_Surrogate_Models/NZN_transfer/` | `<archetype>_<year_month_day>/<archetype>_<weather>_<year_month_day>/model.json/.h5/.p` | 280 models; 14 archetypes × 20 weather locations |
| Legacy `Documents/NZN/core_interface/models{,_v2,_v3}/<version>/` | `_manifest.json`, relative TFJS paths, scaler JSON and sample data | 14 non-template manifest records |

Weights-only and best-checkpoint files are companion training artifacts, not additional independently configured models. Training run versions are separate records. Templates are excluded. Source paths, source commit for Git artifacts, counts, names, versions, and reasons are recorded for each entry. Missing output names remain explicitly unknown, rather than being guessed from another model.

Before this change, `HomePage.tsx` contained a one-element hard-coded list (`20200224`). Explorer already loaded `_manifest.json` and its TFJS model with `useManifest` and `useTfModel`, but output readouts and charts assumed joules and exponential output inversion.

## Inference and validation

Each model's ordered features supply its inputs, defaults, ranges, units, scaler means/scales, output labels, and transforms. Original Simple Office uses standardized inputs and exponential output inversion. Imported physical-output bundles explicitly declare `output-transform: linear`. Optional output offsets and the existing Box-Cox path are supported independently. Generic physical-unit outputs are never converted as joules. Legacy derived metrics are offered only when the necessary joule outputs and floor-area context exist.

Generator checks include feature ordering, numeric defaults, finite positive scales, model dimensions, shard existence, actual TFJS loading, and finite default predictions. Imported legacy bundles additionally require paired samples: physical sample statistics must be compatible with the output scaler, and paired predictions must have normalized RMSE at most 0.35 for each output. These are **output-scale plausibility checks, not accuracy certification or a design fitness verdict**. The report includes sample count and maximum normalized RMSE. The archived sample sets need not be the training set, so their statistics are not assumed identical. Models failing these checks remain disabled.

The approximate Calgary pilot explicitly states that its true input scaler was not recovered. It is disabled. The 280 transfer artifacts have Keras architecture and HDF5 weights but no validated browser manifest/scaler export. They now reference a separate, explicitly unverified shared reconstruction profile described below. Local training artifacts use Python pickled scalers and offsets (`inputs_scaler.transform(x + in_params)` and `outputs_scaler.inverse_transform(y) - out_params`); they require a faithful export, not substitution of the Simple Office scaler. Reconstructed estimates are not passed to production inference.

## Shared recovery for all 280 transfer models

The user supplied Dave Rulff's complete 41-column input table and a sampling screenshot showing NZ 2,400, MAIN 3,700, CODE 560 and ALL 1,100 (7,760 total). This evidence is transcribed in `scripts/transfer-evidence.json`. `scripts/transfer-recovery.mjs` statically inspects the six parameter modules for each of the four bins, records the exact Git commit and source hashes, and writes `public/models/_recovery/nzn-transfer-2024-dave-reconstruction-v1.json` during catalogue generation. All 280 saved architectures have 41 inputs and three outputs. Each catalogue entry references the shared profile with status `reconstructed-unverified`; a dimension match alone does not prove preprocessing compatibility.

The profile contains:

- The 37 numeric input positions followed by four categorical columns: DCV None / OccupancySchedule at 37/38, economizer DifferentialEnthalpy / NoEconomizer at 39/40. This ordering is taken from the supplied table, not the parameter module order.
- Candidate per-bin ranges for all numeric parameters and weighted population scaler estimates for 36 of them. Mean is `sum(w * binMean)` and variance is `sum(w * (binVariance + (binMean - mean)^2))`. Within-bin variance for a uniform range is `(max-min)^2 / 12`.
- Conditional mean 0.5 / scale 0.5 estimates for the four one-hot inputs, explicitly assuming equal category frequencies. The original fitted frequencies are unknown.
- Three author-supplied output meanings: aggregate space heating, space cooling and electricity excluding heating/cooling. The exact output column order and units remain unconfirmed. The historical CSV labels say ekWh/m2 while its units field says J, so neither is silently selected.
- The author-supplied, code-corroborated output transform: `z = (((y^0.17 - 1)/0.17) - 7)/1.7`, reversed as `y = (1 + 0.17*(1.7*z + 7))^(1/0.17)`. The disabled pilot's `training-mean` was corrected from -7 to +7 to match the dashboard's de-standardization convention.

**Unresolved PV conflict:** supplied tensor position 34 is `PV Capacity (Wp/m2(roof))`; the checked-in bin modules instead use total `PV Capacity (Wp)`. The root/MAIN/NZ upper bound is 10,000,000 Wp and CODE uses 0.02 Wp. Git history shows commit `543a35c0` (2023-05-23) changed the root definition from 0.001–500 Wp/m2(roof), with a fixed roof-area multiplier, to total Wp. The historical table may predate this change. No PV scaler estimate is emitted, and no roof area is guessed for the 14 archetypes.

ALL is provisionally mapped to the root parameter directory, whose wider bounds match the conversation. The screenshot does not identify the historical code revision. Even with the correct ranges, finite sampling, failed simulations, the training split, and categorical frequencies may change the actual fitted scaler. These estimates therefore remain a separate evidence artifact, not a runnable manifest. Model weights are unchanged and numerical predictions for all 280 remain disabled pending resolution, browser export, and numerical parity checks; their metadata details remain selectable. This profile is not applied to unrelated training runs or older models.

Example conditional estimates: North WWR mean 0.4064497423, scale 0.2040727575; occupancy mean 32.80927835, scale 46.86286988. These differ substantially from using one uniform distribution across the widest bounds.

## Regeneration

From the dashboard directory on this installation:

```powershell
npm.cmd run catalog -- --repository ../mitacs-project/NZN --legacy ../NZN/core_interface
npm.cmd test
npm.cmd run test:recovery
npm.cmd run lint
npm.cmd run build
```

Use `--ref <git-ref>` to inspect a different transfer-model revision. Both source-directory arguments are mandatory to prevent accidentally replacing a full catalogue with a partial scan. Git inspection is read-only; it does not switch branches or change training files. A missing source/ref fails generation. Deploy the resulting `public/models/` tree with the application; the browser needs neither Git nor directory scanning nor Python. `VITE_MODELS_BASE` applies to catalogue, manifests, and weights alike.

Stable IDs are derived from source-relative paths (existing public IDs are retained). Generated browser bundles use `model-<hash>` directories and are excluded from rediscovery. The generator copies only validated manifests, topology and weight shards into public assets, not training data or pickles.

## Verification in this checkout

484 records discovered: 280 transfer models, 188 local/archive training records, 14 legacy browser manifests, and two dashboard bundles. Five available, 479 unavailable. Available bundles are Simple Office plus Victoria Primary School, Secondary School, Retail Stand-Alone and Retail Strip Mall. They have 19–29 inputs and 6–8 outputs.

All five are loaded by the inference regression suite. Defaults and changed inputs produce finite, changing predictions. Routing tests verify selected-model URLs survive remounts and pending-model URLs open their own details and show the exact reasons without loading Simple Office. Unit tests cover filtering and per-model output transforms/units. Five additional recovery tests cover the supplied ordering, bin totals, between-bin variance, safe numeric parsing, output-transform sign and round trips, the corrected disabled pilot, all 280 model records across 14 archetypes and 20 locations, and the PV blocker. The current environment has no connected browser, so visual/browser refresh verification was not performed. No other location currently passes the metadata/export gate; cross-location inference therefore remains blocked by the source artifacts, not silently simulated.
