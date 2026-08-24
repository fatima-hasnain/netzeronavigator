import { describe, expect, it } from 'vitest'
import { buildStandardizedInputVector, deStandardize, standardize } from './standardize'
import { rawPredictionToOutputs } from './tensorPipeline'
import type { ManifestFeature } from '../types/manifest'

describe('standardize', () => {
  it('matches sklearn-style z-score', () => {
    expect(standardize(10, 2, 14)).toBe(2)
    expect(deStandardize(10, 2, 2)).toBe(14)
  })

  it('throws on zero scale', () => {
    expect(() => standardize(0, 0, 1)).toThrow(/training-scale/)
  })
})

describe('buildStandardizedInputVector', () => {
  it('matches fixture ORIENTATION row (20200224)', () => {
    const f: ManifestFeature = {
      kind: 'surrogate-input',
      feature: { id: 'ORIENTATION' },
      default: 1,
      tf: {
        position: 0,
        'training-mean': 179.7791911304746,
        'training-scale': 104.02631548541432,
        'training-min': 0.029660055104692287,
        'training-max': 359.92606386920426,
      },
      units: 'degree',
    }
    const vec = buildStandardizedInputVector([f], { ORIENTATION: 1 })
    const expected = standardize(
      179.7791911304746,
      104.02631548541432,
      1,
    )
    expect(vec).toHaveLength(1)
    expect(vec[0]).toBeCloseTo(expected, 10)
  })
})

describe('rawPredictionToOutputs', () => {
  it('de-standardizes and exponentiates', () => {
    const outs: ManifestFeature[] = [
      {
        kind: 'surrogate-output',
        feature: { id: 'HEATING_DEMAND' },
        tf: {
          position: 0,
          'training-mean': 2,
          'training-scale': 0.5,
        },
        units: 'J',
      },
    ]
    const z = 0
    const y = deStandardize(2, 0.5, z)
    const expected = Math.exp(y)
    expect(rawPredictionToOutputs([z], outs)).toEqual({
      HEATING_DEMAND: expected,
    })
  })
})
