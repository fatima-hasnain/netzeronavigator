# Net Zero Navigator

Net Zero Navigator is a browser-based dashboard for exploring building-energy surrogate models: fast, learned approximations of EnergyPlus simulations. Choose a model, adjust building inputs, and explore predicted energy use plus, where supported, energy intensity, emissions, and operating cost. Predictions run locally in the browser using TensorFlow.js.

> **Screenshot placeholder:** Add an Explorer screenshot showing the input controls and visualization views here.

## Download and setup

**Clone the published Explorer branch:** [GitHub: fatima-ui](https://github.com/fatima-hasnain/netzeronavigator/tree/fatima-ui). The default `main` branch does not contain this complete Explorer handover.

Prerequisites: **Git**, **Node.js 22.12 or newer with npm**, and a modern browser. A clean GitHub clone was verified with Node.js 24.20.0 and npm 11.19.0 on Windows. Installers: [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/en/download).

```bash
git clone --single-branch --branch fatima-ui https://github.com/fatima-hasnain/netzeronavigator.git
cd netzeronavigator
npm ci
npm run dev
```

Open **http://localhost:5173** and choose a prediction-ready model. Use **localhost rather than 127.0.0.1**; if Vite reports another port, use that port with localhost. Stop with **Ctrl+C**; restart from the project directory with `npm run dev`.

If Windows PowerShell blocks npm scripts, use `npm.cmd ci` and `npm.cmd run dev`; use `npx.cmd` instead of `npx` for checks. No execution-policy change is needed.

**All JavaScript libraries are declared in [package.json](package.json); [package-lock.json](package-lock.json) records the exact dependency tree.** `npm ci` installs them together. This browser Explorer does not require Python, pip, EnergyPlus, Git LFS, or an Anthropic API key. Those requirements belong to the separate Streamlit AI dashboard. The five runnable models and their weight shards are included in [public/models](public/models).

Read the **[new-laptop and development guide](docs/DEVELOPMENT_SETUP.md)** for updates, library descriptions, production preview, optional configuration, and verification limits. **Security caveat:** the committed dependency tree reported 16 npm audit findings during this handover; see [dependency audit](docs/DEVELOPMENT_SETUP.md#dependency-audit). Dependency pins have not been changed.

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

- [New-laptop and development setup](docs/DEVELOPMENT_SETUP.md): Clone the right branch, install all libraries, run, update, and verify the Explorer.

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
