import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

describe('model properties', () => {
  it('always returns finite bounded population and range for valid threshold grids', () => {
    fc.assert(fc.property(
      fc.integer({ min: 18, max: 50 }),
      fc.integer({ min: 0, max: 1_000 }),
      fc.integer({ min: 0, max: 100_000 }),
      fc.constantFrom('male' as const, 'female' as const),
      (age, income, wealth, gender) => {
        const input: ModelSelection = {
          ...DEFAULT_SELECTION,
          target: { ...DEFAULT_SELECTION.target, gender, age: { min: age, max: age }, maritalStatuses: [] },
          correlated: {
            ...DEFAULT_SELECTION.correlated,
            minAnnualIncomeWan: income,
            minHouseholdWealthWan: wealth,
          },
        }
        const result = computeModel(input)
        expect(result.population.estimate).toBeGreaterThanOrEqual(0)
        expect(result.population.estimate).toBeLessThanOrEqual(result.population.base)
        expect(Object.values(result.population.range).every(Number.isFinite)).toBe(true)
      },
    ), { numRuns: 150 })
  })

  it('adding a true hard/correlated condition cannot increase the estimate', () => {
    fc.assert(fc.property(
      fc.integer({ min: 18, max: 49 }),
      fc.integer({ min: 0, max: 200 }),
      (ageMin, income) => {
        const ageMax = Math.min(50, ageMin + 1)
        const base: ModelSelection = {
          ...DEFAULT_SELECTION,
          target: { ...DEFAULT_SELECTION.target, age: { min: ageMin, max: ageMax }, maritalStatuses: [] },
          correlated: { ...DEFAULT_SELECTION.correlated, minAnnualIncomeWan: income },
        }
        const stricter: ModelSelection = {
          ...base,
          correlated: { ...base.correlated, smoking: 'non_smoker' },
        }
        expect(computeModel(stricter).population.estimate).toBeLessThanOrEqual(computeModel(base).population.estimate + 1e-6)
      },
    ), { numRuns: 100 })
  })
})
