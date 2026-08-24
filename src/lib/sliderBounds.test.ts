import { describe, expect, it } from 'vitest'
import { rangeStep, sliderBoundsForFeature } from './sliderBounds'
import type { ManifestFeature } from '../types/manifest'

describe('sliderBoundsForFeature', () => {
  it('uses training min/max when min < max', () => {
    const f: ManifestFeature = {
      kind: 'surrogate-input',
      feature: { id: 'X' },
      default: 50,
      tf: { position: 0, 'training-min': 0, 'training-max': 100 },
    }
    expect(sliderBoundsForFeature(f, 50)).toEqual({ min: 0, max: 100 })
  })

  it('falls back to 0,1 for values in (0,1] when training bounds missing', () => {
    const f: ManifestFeature = {
      kind: 'surrogate-input',
      feature: { id: 'R' },
      default: 0.4,
      tf: { position: 0 },
    }
    expect(sliderBoundsForFeature(f, 0.4)).toEqual({ min: 0, max: 1 })
  })

  it('uses default ± 20% span for other values', () => {
    const f: ManifestFeature = {
      kind: 'surrogate-input',
      feature: { id: 'Y' },
      default: 10,
      tf: { position: 0 },
    }
    const { min, max } = sliderBoundsForFeature(f, 10)
    expect(min).toBeCloseTo(8, 10)
    expect(max).toBeCloseTo(12, 10)
  })
})

describe('rangeStep', () => {
  it('returns a reasonable step for wide ranges', () => {
    expect(rangeStep(0, 1000)).not.toBe('any')
  })
})
