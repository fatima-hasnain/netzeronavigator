# Explorer: new-laptop and development setup

This guide is for the React/TensorFlow.js **Surrogate Explorer**, not the separate Python/Streamlit AI dashboard. Start with the [README download commands](../README.md#download-and-setup).

## What you need

- Git and Node.js 22.12 or newer, including npm. Windows verification used Node.js 24.20.0 and npm 11.19.0.
- A modern browser; internet access to clone and download npm packages initially.
- No Python environment, pip requirements, EnergyPlus installation, API key, Git LFS, or external model download is required to run the bundled Explorer.

Confirm the tools in a new terminal:

```powershell
git --version
node --version
npm.cmd --version
```

Use the clone command in the README to get `fatima-ui` from `fatima-hasnain/netzeronavigator`. A default-branch clone gets older code. Run every command below from the resulting project directory. On macOS/Linux, use `npm` and `npx` in place of `npm.cmd` and `npx.cmd`.

## Install every library and run

```powershell
npm.cmd ci
npm.cmd run dev
```

`npm ci` uses the committed lockfile and replaces any existing `node_modules` directory. Do not copy `node_modules` from another laptop. Open **http://localhost:5173**, using localhost rather than 127.0.0.1. If that port is busy, use the localhost URL printed by Vite. Keep the terminal running. Stop with **Ctrl+C**, then restart with `npm.cmd run dev`.

[package.json](../package.json) is the authoritative library and command list; [package-lock.json](../package-lock.json) fixes their resolved versions and transitive dependencies. There is no Python `requirements.txt` for this app. No additional manual library installs are needed:

| Libraries | Purpose |
| --- | --- |
| React, React DOM, React Router DOM | Interface rendering and navigation |
| TensorFlow.js | Browser model loading and predictions |
| Vite and its React plugin | Development server and production build |
| TypeScript and Node/React type packages | Typechecking |
| Tailwind CSS and its Vite plugin | Styling |
| ESLint, JavaScript/TypeScript ESLint packages, React hooks/refresh plugins, globals | Code checks |
| Vitest, its V8 coverage package, happy-dom | Automated tests and browser-like test environment |

Development dependencies are required for local development and builds; do not use `npm ci --omit=dev` for this workflow.

## Configuration and included models

No `.env` file is required. The optional setting in [.env.example](../.env.example), `VITE_MODELS_BASE`, changes the public host for model assets. Leave it unset for the bundled files. Vite environment values are exposed in the browser, so never put private API keys there.

[public/models](../public/models) contains the catalogue, manifests, model topologies and binary weight shards needed by all five prediction-ready models. Ordinary Git downloads these files; Git LFS is not used for these bundles. Start with **Medium Office - Simple** or one of the four Victoria models listed in [current status](../README.md#current-status).

The 484 catalogue records do not mean 484 runnable models. The other 479 are details-only. In particular, the 280-model set still needs output-scale validation. Original training datasets, Python environments, and the full external model archives are not supplied by this clone. See [known limitations](architecture.md#known-limitations).

Do not run catalogue regeneration during normal setup. It requires separately obtained pipeline and legacy source directories; see [regeneration](MODEL_CATALOGUE.md#regeneration). Existing browser assets are already committed.

## Continue working and get updates

Before editing, create your own branch:

```powershell
git switch -c my-explorer-work
```

To update the downloaded handover branch later, first run `git status` and commit or otherwise save your own changes. With a clean worktree:

```powershell
git switch fatima-ui
git pull --ff-only origin fatima-ui
npm.cmd ci
```

Here `origin` means the GitHub fork used in the README clone command. Check `git remote -v` if using an existing checkout. Updating `fatima-ui` does not automatically update your own work branch; integrate those changes deliberately. Read [project structure](../README.md#project-structure) and [architecture](architecture.md) before changing model preprocessing or outputs.

## Checks and production preview

```powershell
npm.cmd run lint
npx.cmd tsc -b
npm.cmd test
npm.cmd run test:recovery
npm.cmd run build
npm.cmd run preview -- --host localhost
```

Open **http://localhost:4173** for the production preview, or the localhost port printed by Vite. Stop with Ctrl+C. Rebuild after source changes before restarting preview. `npm.cmd run test:watch` runs tests while editing. The generated `dist` directory and installed `node_modules` are ignored by Git; build them locally.

## Verification and remaining checks

A fresh clone from GitHub, independent of the original laptop's installed dependencies, passed `npm.cmd ci`, lint, TypeScript checks, 23 Vitest tests, five recovery tests, and the production build on 2026-09-21. The inference suite loads all five bundled ready models and checks finite, changing predictions. The build warns about a large JavaScript bundle; it still succeeds.

These automated checks do not certify scientific accuracy or replace a manual browser check. On the receiving laptop, launch the app, select a ready model, change an input, inspect All Inputs, Sensitivity, Tornado, Heatmap and Comparison, then refresh a model URL. Confirm a details-only model shows its limitations without numerical predictions. Manual visual/browser validation remains pending.

## Dependency audit

The committed dependency tree reported **16 vulnerabilities: one low, five moderate and ten high** with `npm.cmd audit` on 2026-09-21. This is a known security maintenance task, not a missing-library installation error. Do not describe this handover as security-clean.

An isolated trial of `npm.cmd audit fix` within existing package version ranges reduced the report to three moderate findings involving Vitest and its mocker/coverage packages, but a second pass did not resolve them. That experimental lockfile was not published: the handover preserves the existing dependency pins. Review advisories and test a deliberate dependency update separately; do not run `npm audit fix --force` as a setup step.

To inspect current advisories (results can change):

```powershell
npm.cmd audit
```
