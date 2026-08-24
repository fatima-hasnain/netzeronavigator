/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for static surrogate assets (no trailing slash). Empty = same origin. */
  readonly VITE_MODELS_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
