import { describe, expect, it } from 'vitest'
import {
  computeModel,
  ModelInputError,
  ModelOptionsError,
} from '../../src/engine/modelEngine'
import {
  computeRelationshipScenario,
  RelationshipScenarioInputError,
} from '../../src/engine/relationshipScenario'
import {
  DEFAULT_SELECTION,
  parseSelection,
  safeParseSelection,
} from '../../src/model/schema'

const availablePopulation = {
  status: 'available' as const,
  estimate: 1_000,
  range: { conservative: 800, baseline: 1_000, optimistic: 1_200 },
  modelVersion: 'test-model',
  dataVersion: 'test-data',
}

describe('Zod Mini runtime contracts', () => {
  it('keeps legacy preprocessing, strict objects, uniqueness, and integer bounds', () => {
    const legacy = structuredClone(DEFAULT_SELECTION) as unknown as {
      target: { maritalStatuses: string[] }
    }
    legacy.target.maritalStatuses = ['divorced_no_children', 'divorced_with_children']
    expect(parseSelection(legacy).target.maritalStatuses).toEqual(['divorced'])

    const unknownKey = safeParseSelection({ ...DEFAULT_SELECTION, unexpected: true })
    expect(unknownKey.success).toBe(false)
    if (!unknownKey.success) {
      expect(unknownKey.error.issues).toContainEqual(expect.objectContaining({
        code: 'unrecognized_keys',
        path: [],
      }))
    }

    const duplicateCity = structuredClone(DEFAULT_SELECTION)
    duplicateCity.target.cities = ['杭州', '杭州']
    const duplicateResult = safeParseSelection(duplicateCity)
    expect(duplicateResult.success).toBe(false)
    if (!duplicateResult.success) {
      expect(duplicateResult.error.issues).toContainEqual(expect.objectContaining({
        code: 'custom',
        path: ['target', 'cities'],
        message: '不能包含重复值',
      }))
    }

    const fractionalAge = structuredClone(DEFAULT_SELECTION)
    fractionalAge.target.age.min = 26.5
    expect(safeParseSelection(fractionalAge).success).toBe(false)
  })

  it('preserves application-facing model input and option error classes', () => {
    expect(() => computeModel({ ...DEFAULT_SELECTION, unexpected: true }))
      .toThrow(ModelInputError)
    expect(() => computeModel(DEFAULT_SELECTION, {
      hardRequirementIds: ['base.age', 'base.age'],
    })).toThrow(ModelOptionsError)
    expect(() => computeModel(DEFAULT_SELECTION, {
      hardRequirementIds: ['not.registered'],
    })).toThrow(ModelOptionsError)
  })

  it('preserves relationship defaults, strict unions, finite numbers, and custom paths', () => {
    const valid = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: availablePopulation,
    })
    expect(valid.seekerGender).toBe('male')

    expect(() => computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: availablePopulation,
      unexpected: true,
    })).toThrow(RelationshipScenarioInputError)

    try {
      computeRelationshipScenario({
        seekerGender: 'male',
        targetGender: 'female',
        targetPopulation: availablePopulation,
        overrides: {
          currentlySingle: {
            status: 'scenario',
            range: { lower: 0.8, reference: 0.5, upper: 0.9 },
          },
        },
      })
      throw new Error('expected relationship validation to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(RelationshipScenarioInputError)
      expect((error as RelationshipScenarioInputError).issues).toContainEqual(expect.objectContaining({
        code: 'custom',
        path: ['overrides', 'currentlySingle', 'range', 'reference'],
        message: '参考比例不能低于下界',
      }))
    }

    expect(() => computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        ...availablePopulation,
        estimate: Number.POSITIVE_INFINITY,
      },
    })).toThrow(RelationshipScenarioInputError)
  })
})
