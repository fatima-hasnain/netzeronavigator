import { describe, expect, it } from 'vitest'
import { filterModels, type CatalogueModel } from './catalogue'
import { rawPredictionToOutputs } from '../tf/tensorPipeline'
import { resolveOutputValue, outputSelectionUnit, derivedOptionsFor } from './outputSelection'
import { formatModelOutput } from './modelDisplay'
import type { ManifestFeature, TfModel } from '../types/manifest'

const models = [
  { id: 'a', displayName: 'Office Calgary', archetype: 'Office', location: 'Calgary', status: 'available', validationStatus: 'sample-checked' },
  { id: 'b', displayName: 'School Victoria', archetype: 'School', location: 'Victoria', status: 'unavailable', validationStatus: 'unverified' },
] as CatalogueModel[]
const output: ManifestFeature = { kind: 'surrogate-output', feature: { id: 'energy' }, units: 'ekWh/m2', tf: { position: 0, 'training-mean': 10, 'training-scale': 2, 'output-transform': 'linear', 'output-offset': 1 } }
const model: TfModel = { path: 'model.json', features: [output] }
describe('catalogue and model-specific inference', () => {
  it('combines filters and keeps all options inclusive', () => {
    expect(filterModels(models, '', '', '', '')).toHaveLength(2)
    expect(filterModels(models, ' OFFICE ', 'Office', 'Calgary', 'sample-checked').map(m => m.id)).toEqual(['a'])
    expect(filterModels(models, '', '', '', 'unavailable').map(m => m.id)).toEqual(['b'])
    expect(filterModels(models, '', 'School', 'Calgary', '')).toEqual([])
  })
  it('applies each model output transform and rejects non-finite predictions', () => {
    expect(rawPredictionToOutputs([3], [output])).toEqual({ energy: 15 })
    expect(rawPredictionToOutputs([0], [{ ...output, tf: { 'training-mean': 2, 'training-scale': 1 } }]).energy).toBeCloseTo(Math.exp(2))
    expect(rawPredictionToOutputs([1], [{ ...output, tf: { 'training-mean': 0, 'training-scale': 1, 'boxcox-lambda': 0.5 } }]).energy).toBeCloseTo(2.25)
    expect(() => rawPredictionToOutputs([Infinity], [output])).toThrow('Non-finite')
    expect(() => rawPredictionToOutputs([1,2], [output])).toThrow('feature count')
  })
  it('does not convert physical intensities as though they were joules', () => {
    expect(resolveOutputValue('tensor:energy', { energy: 125 }, model, {}, 'MWh')).toBe(125)
    expect(outputSelectionUnit('tensor:energy', 'MWh', model)).toBe('ekWh/m2')
    expect(formatModelOutput(125, output, 'MWh').unit).toBe('ekWh/m2')
    expect(derivedOptionsFor(model)).toEqual([])
  })
})
