/**
 * Types for `_manifest.json` produced by the surrogate pipeline.
 * Kept permissive; tighten as you validate more surrogates.
 */

export interface FeatureRef {
  id: string
}

export interface ManifestUi {
  order?: number
  position?: number
  visibility?: string
  control?: string
  step?: number
}

export interface ManifestTf {
  position?: number
  'training-mean'?: number
  'training-scale'?: number
  'training-min'?: number
  'training-max'?: number
  'training-variance'?: number
}

export interface ManifestFeature {
  kind: string
  feature: FeatureRef
  ui?: ManifestUi
  tf?: ManifestTf
  units?: string
  default?: unknown
  description?: string
  'energy-plus-label'?: string
  'short-name'?: string
  'long-name'?: string
  'data-type'?: string
  notes?: string
  category?: { id?: string; name?: string }
  [key: string]: unknown
}

export interface TfModel {
  path: string
  selection?: Record<string, string>
  features: ManifestFeature[]
}

export interface Manifest {
  id: string
  name?: string
  description?: string
  'base-idf'?: string
  'climate-file'?: string
  'schema-version'?: string
  'building-type'?: string
  location?: string
  'tf-models': TfModel[]
  [key: string]: unknown
}
