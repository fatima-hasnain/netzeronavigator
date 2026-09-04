import { describe, expect, it } from 'vitest'
import { formatEnergy } from './volumeConversion'

describe('formatEnergy', () => {
  it('keeps large values in kWh when kWh is selected', () => {
    expect(formatEnergy(847_111_414_109.4119, 'kWh', 'en-CA')).toEqual({
      text: '235,308.7',
      unit: 'kWh',
    })
  })

  it('converts the same raw joule value to MWh only when MWh is selected', () => {
    expect(formatEnergy(847_111_414_109.4119, 'MWh', 'en-CA')).toEqual({
      text: '235.3',
      unit: 'MWh',
    })
  })
})
