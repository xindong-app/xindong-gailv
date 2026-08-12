import { describe, expect, it } from 'vitest'
import {
  MARITAL_BY_AGE_BAND,
  maritalBandShare,
  maritalShareAtAge,
  type PopulationGender,
  type PopulationMaritalStatus,
} from '../../src/data/population'

const expected = [
  ['male', 25, 29, 0.52926476, 0.01188245, 0.00021033],
  ['female', 25, 29, 0.33191323, 0.01343111, 0.00065155],
  ['male', 30, 34, 0.20545444, 0.02999395, 0.00065216],
  ['female', 30, 34, 0.09329824, 0.02632812, 0.00176959],
  ['male', 45, 49, 0.04443346, 0.04102933, 0.00591710],
  ['female', 45, 49, 0.01257297, 0.03757286, 0.01877201],
] as const

describe('official five-year marital status table alignment', () => {
  it('contains complete mutually-exclusive source rows whose numerators fit the denominator', () => {
    expect(MARITAL_BY_AGE_BAND).toHaveLength(16)
    for (const row of MARITAL_BY_AGE_BAND) {
      expect(row.total).toBeGreaterThan(0)
      expect(row.neverMarried + row.divorced + row.widowed).toBeLessThanOrEqual(row.total)
    }
  })

  it.each(expected)('%s %i–%i reproduces official never-married/divorced/widowed shares',
    (gender, minAge, maxAge, neverMarried, divorced, widowed) => {
      const sex = gender as PopulationGender
      expect(maritalBandShare(minAge, maxAge, sex, 'never_married')).toBeCloseTo(neverMarried, 8)
      expect(maritalBandShare(minAge, maxAge, sex, 'divorced')).toBeCloseTo(divorced, 8)
      expect(maritalBandShare(minAge, maxAge, sex, 'widowed')).toBeCloseTo(widowed, 8)
    })

  it('uses the exact group rate at every age in a published five-year band', () => {
    for (const [gender, minAge, maxAge] of expected) {
      for (const status of ['never_married', 'divorced', 'widowed'] as PopulationMaritalStatus[]) {
        const expectedShare = maritalBandShare(minAge, maxAge, gender as PopulationGender, status)
        for (let age = minAge; age <= maxAge; age += 1) {
          expect(maritalShareAtAge(age, gender as PopulationGender, [status])).toBeCloseTo(expectedShare, 12)
        }
      }
    }
  })

  it('keeps empty unrestricted and selected categories additive without invented child splits', () => {
    for (const gender of ['male', 'female'] as const) {
      for (const age of [25, 32, 47]) {
        expect(maritalShareAtAge(age, gender, [])).toBe(1)
        const statuses: PopulationMaritalStatus[] = ['never_married', 'divorced', 'widowed']
        const union = maritalShareAtAge(age, gender, statuses)
        const sum = statuses.reduce((total, status) => total + maritalShareAtAge(age, gender, [status]), 0)
        expect(union).toBeCloseTo(sum, 12)
        expect(union).toBeLessThanOrEqual(1)
      }
    }
  })
})
