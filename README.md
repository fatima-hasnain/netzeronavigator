# Net Zero Navigator

Net Zero Navigator is a browser-based dashboard for exploring building-energy surrogate models: fast, learned approximations of EnergyPlus simulations. Choose a model, adjust building inputs, and explore predicted energy use plus, where supported, energy intensity, emissions, and operating cost. Predictions run locally in the browser using TensorFlow.js.

> **Screenshot placeholder:** Add an Explorer screenshot showing the input controls and visualization views here.

## Setup

Install Node.js 22.12 or newer, with npm. From the `netzeronavigator` project root, run:

```bash
npm install
npm run dev
```

Open **http://localhost:5173** and choose a prediction-ready model from the catalogue. Use **localhost rather than 127.0.0.1**; if Vite reports another port, use that port with localhost.

If Windows PowerShell blocks npm because of script execution restrictions, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Use `npm.cmd` and `npx.cmd` instead of `npm` and `npx` for the development checks below too.

## Features

- **All Inputs:** Scan small charts showing how each input affects a selected output.
- **Sensitivity:** Sweep one input to inspect its effect on a selected output.
- **Tornado:** Rank inputs by the output change between their low and high values.
- **Heatmap:** Explore a selected output across combinations of two inputs.
- **Comparison:** Compare two designs and their predicted performance side by side.
- **Catalogue picker:** Choose ready models or filter the archive to inspect metadata and readiness blockers.

## Project structure

| Directory | Contents |
| --- | --- |
| `src/components/` | Input controls, output readouts, visualization views, model pickers, and previews. |
| `src/lib/` | Shared catalogue, feature-selection, formatting, units, and derived-metric helpers. |
| `src/tf/` | Input standardization, tensor preparation, inference, and output decoding. |
| `src/hooks/` | Catalogue, manifest, and model loading, plus debounced exploration state. |
| `src/pages/` | Home catalogue, surrogate Explorer, and expanded-chart routes. |
| `scripts/` | Catalogue generation, transfer-model recovery and its tests, and label extraction. |
| `docs/` | Architecture, model catalogue and validation, and integration guides. |

## Documentation

- [Architecture](docs/architecture.md): Prediction flow, visualization design, model discovery, and known limitations.
- [Model catalogue](docs/MODEL_CATALOGUE.md): Model sources, readiness checks, transfer-model recovery, and catalogue regeneration.
- [Integration](docs/INTEGRATION.md): TensorFlow.js integration, exploration controls, and static model asset configuration.

## Current status

The bundled catalogue contains **484 selectable records, with five prediction-ready models**:

- Simple Office (catalogue name: Medium Office - Simple; ID `20200224`).
- Primary School - Victoria, BC.
- Secondary School - Victoria, BC.
- Retail Stand-Alone - Victoria, BC.
- Retail Strip Mall - Victoria, BC.

Other entries open model details without numerical predictions. The **280-model transfer set is pending output-scale validation**: the order and units of its outputs still need confirmation before its predictions can be interpreted reliably. See [known limitations](docs/architecture.md#known-limitations) for the remaining blockers and validation caveats.

## Development checks

Run from the project root:

```bash
npm run lint          # ESLint
npx tsc -b            # Typecheck the app and tooling
npm test              # Unit, routing, and inference regression tests
npm run test:recovery # Transfer-model recovery tests
```

Use `npm run test:watch` for watch mode. `npm run build` typechecks and creates a production build.

License: [MIT](LICENSE). Bundled surrogate weights were generated with the NZN pipeline.
