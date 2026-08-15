import { describe, expect, it } from 'vitest'
import {
  computeComprehensiveConditionAnalysis,
  computeModel,
  sanitizeModelComputationOptions,
} from '../../src/engine/modelEngine'
import { removeSelectionDimension } from '../../src/model/selectionUtils'
import { DEFAULT_SELECTION } from '../../src/model/schema'

describe('v4 public numeric contracts', () => {
  it('exposes a stable target pool before every optional condition', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.correlated.educationLevels = ['bachelor']
    const result = computeModel(input)

    expect(result.comprehensivePopulation.initialPool.estimate).toBeGreaterThan(
      result.comprehensivePopulation.base,
    )
    expect(result.comprehensivePopulation.initialPool.estimate).toBeGreaterThanOrEqual(
      result.comprehensivePopulation.estimate,
    )
    expect(result.comprehensivePopulation.initialPool.range.conservative).toBeLessThanOrEqual(
      result.comprehensivePopulation.initialPool.estimate,
    )
    expect(result.comprehensivePopulation.initialPool.range.optimistic).toBeGreaterThanOrEqual(
      result.comprehensivePopulation.initialPool.estimate,
    )
  })

  it('grades the comprehensive layer instead of inheriting reliable confidence', () => {
    const directOnly = computeModel(DEFAULT_SELECTION)
    expect(directOnly.comprehensivePopulation.confidence.grade).toBe('A')

    const priorInput = structuredClone(DEFAULT_SELECTION)
    priorInput.softPreferenceIds = ['values.loyalty']
    const prior = computeModel(priorInput)
    expect(prior.confidence.grade).toBe('A')
    expect(prior.comprehensivePopulation.confidence.grade).toBe('NA')
    expect(prior.comprehensivePopulation.confidence.reasons.join(' ')).toContain('先验')

    const incomeInput = structuredClone(DEFAULT_SELECTION)
    incomeInput.correlated.minAnnualIncomeWan = 20
    expect(computeModel(incomeInput).comprehensivePopulation.confidence.grade).toBe('D')
  })

  it('includes direct conditions in comprehensive impacts and relaxation values', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.target.heightCm = { min: 180, max: null }
    input.correlated.minAnnualIncomeWan = 20
    const result = computeModel(input)
    const analysis = computeComprehensiveConditionAnalysis(result)
    expect(analysis.impacts.map((impact) => impact.dimensionId)).toEqual(
      expect.arrayContaining(['base.age', 'appearance.height', 'economy.income']),
    )

    const ageSuggestion = analysis.relaxations.find(
      (suggestion) => suggestion.dimensionId === 'base.age',
    )
    expect(ageSuggestion).toBeTruthy()
    const relaxed = structuredClone(input)
    relaxed.target.age = { min: 18, max: 50 }
    expect(ageSuggestion?.currentEstimate).toBeCloseTo(result.comprehensivePopulation.estimate, 8)
    expect(ageSuggestion?.relaxedEstimate).toBeCloseTo(
      computeModel(relaxed).comprehensivePopulation.estimate,
      8,
    )
  })

  it('sanitizes reusable hard declarations after a draft removes their conditions', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.softPreferenceIds = ['lifestyle.exercise']
    const draft = removeSelectionDimension(input, 'lifestyle.exercise')
    expect(sanitizeModelComputationOptions(draft, {
      seekerGender: 'male',
      hardRequirementIds: ['lifestyle.exercise'],
    })).toEqual({ seekerGender: 'male', hardRequirementIds: [] })
  })

  it('removes both structured and generic twins through one canonical helper', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.correlated.schoolTier = '985'
    input.correlated.healthCriteria = ['no_major_chronic', 'no_myopia']
    input.softPreferenceIds = ['education.school', 'health.chronic', 'health.myopia']

    const withoutSchool = removeSelectionDimension(input, 'education.school')
    expect(withoutSchool.correlated.schoolTier).toBeNull()
    expect(withoutSchool.softPreferenceIds).not.toContain('education.school')

    const withoutChronic = removeSelectionDimension(input, 'health.chronic')
    expect(withoutChronic.correlated.healthCriteria).not.toContain('no_major_chronic')
    expect(withoutChronic.softPreferenceIds).not.toContain('health.chronic')
  })
})
