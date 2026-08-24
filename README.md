# Net Zero Navigator (React skeleton)

Vite + React + TypeScript SPA for exploring surrogate manifests and running TensorFlow.js inference from static assets. Manifests, `model.json`, and weight shards live under `public/models/`.

## Run locally

```bash
npm install
npm run dev
```

Open the app (Vite prints the URL, usually `http://localhost:5173`). Use **Home** → sample surrogate, or go directly to `/s/20200224`.

## Environment

Copy [.env.example](.env.example) to `.env` if needed.

- **`VITE_MODELS_BASE`** — Optional base URL for static models (no trailing slash). If unset, requests use the same origin (`/models/...` from `public/models/`).

## Surrogate assets (anti-pollution)

- **Only** copy **data** into this repo: `_manifest.json`, TensorFlow.js `model.json`, weight shards, and related static files under `public/models/<surrogateId>/`.
- Do **not** copy Clojure/ClojureScript application code from the legacy snapshot into `src/`.
- Record provenance in [public/models/SOURCES.md](public/models/SOURCES.md) when adding bundles.

## Labels

English strings for feature ids and unit keys live in [src/i18n/labels.en.json](src/i18n/labels.en.json). Regenerate from a manifest with:

```bash
node scripts/extract-label-keys.mjs public/models/20200224/_manifest.json
```

The `t()` helper in [src/i18n/t.ts](src/i18n/t.ts) falls back to the raw key if missing.

## TensorFlow.js

Inference uses `tf.loadLayersModel`, manifest-driven standardization, and `exp` on outputs (see [docs/INTEGRATION.md](docs/INTEGRATION.md)). The production bundle is large (~1MB+ TFJS); consider lazy-loading TFJS later if needed.

## Integration notes

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for TFJS tensor rules, the dual-pane exploration UI, and debounce behavior.

## Scripts

| Command        | Purpose        |
| -------------- | -------------- |
| `npm run dev`  | Dev server     |
| `npm run build`| Production build |
| `npm run preview` | Preview prod build |
| `npm run test` | Vitest (math pipeline) |
