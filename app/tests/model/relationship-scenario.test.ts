import { describe, expect, it } from 'vitest'
import {
  RELATIONSHIP_DATA_VERSION,
  RELATIONSHIP_DATA_SNAPSHOT,
  RELATIONSHIP_EVIDENCE_SOURCES,
  RELATIONSHIP_FACTOR_SCENARIOS,
  RELATIONSHIP_SCENARIO_VERSION,
  validateRelationshipData,
} from '../../src/data/relationship'
import {
  computeRelationshipScenario,
  computeRelationshipScenarioFromModel,
  formatRelationshipCount,
  RelationshipScenarioInputError,
} from '../../src/engine/relationshipScenario'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION } from '../../src/model/schema'

const availablePopulation = {
  status: 'available' as const,
  estimate: 1_000_000,
  range: { conservative: 800_000, baseline: 1_000_000, optimistic: 1_200_000 },
  modelVersion: 'test-model',
  dataVersion: 'test-data',
}

describe('relationship scenario pairings', () => {
  it.each([
    ['male', 'female', 'male_female'],
    ['female', 'male', 'female_male'],
    ['male', 'male', 'male_male'],
    ['female', 'female', 'female_female'],
  ] as const)('supports %s seeking %s as an explicit pairing', (seekerGender, targetGender, pairing) => {
    const result = computeRelationshipScenario({ seekerGender, targetGender, targetPopulation: availablePopulation })
    expect(result.pairing).toBe(pairing)
    expect(result.versions).toMatchObject({
      relationshipScenarioVersion: RELATIONSHIP_SCENARIO_VERSION,
      relationshipDataVersion: RELATIONSHIP_DATA_VERSION,
    })
    expect(result.seekerGender).toBe(seekerGender)
    expect(result.targetGender).toBe(targetGender)
    expect(result.mainLayer.role).toBe('statistical_upper_bound')
    expect(result.combined.status).toBe('scenario')
    expect(result.combined.isObservedPopulationEstimate).toBe(false)
    expect(result.combined.isConfidenceInterval).toBe(false)
    expect(result.confidence).toMatchObject({ level: 'low', evidenceGrade: 'NA' })
  })

  it('uses pairing-specific orientation scenarios instead of soft preference overlap', () => {
    const maleMale = computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'male', targetPopulation: availablePopulation,
    })
    const femaleFemale = computeRelationshipScenario({
      seekerGender: 'female', targetGender: 'female', targetPopulation: availablePopulation,
    })
    const maleFemale = computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'female', targetPopulation: availablePopulation,
    })
    expect(maleMale.factors.orientationCompatibility.status).toBe('scenario')
    expect(femaleFemale.factors.orientationCompatibility.status).toBe('scenario')
    expect(maleFemale.factors.orientationCompatibility.status).toBe('scenario')
    if (
      maleMale.factors.orientationCompatibility.status !== 'scenario' ||
      femaleFemale.factors.orientationCompatibility.status !== 'scenario' ||
      maleFemale.factors.orientationCompatibility.status !== 'scenario'
    ) throw new Error('unexpected unavailable scenario')
    expect(maleMale.factors.orientationCompatibility.range.reference).toBe(0.035)
    expect(femaleFemale.factors.orientationCompatibility.range.reference).toBe(0.02)
    expect(maleFemale.factors.orientationCompatibility.range.reference).toBe(0.95)
  })
})

describe('relationship scenario calculation', () => {
  it('multiplies sequential conditional scenario ranges transparently', () => {
    const result = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'male',
      targetPopulation: availablePopulation,
      overrides: {
        orientationCompatibility: {
          status: 'scenario', range: { lower: 0.1, reference: 0.2, upper: 0.3 },
        },
        currentlySingle: {
          status: 'scenario', range: { lower: 0.4, reference: 0.5, upper: 0.6 },
        },
        relationshipWillingness: {
          status: 'scenario', range: { lower: 0.7, reference: 0.8, upper: 0.9 },
        },
      },
    })
    expect(result.combined.range?.lower).toBeCloseTo(800_000 * 0.1 * 0.4 * 0.7, 8)
    expect(result.combined.range?.reference).toBeCloseTo(1_000_000 * 0.2 * 0.5 * 0.8, 8)
    expect(result.combined.range?.upper).toBeCloseTo(1_200_000 * 0.3 * 0.6 * 0.9, 8)
    expect(result.explanation.join(' ')).toContain('条件链')
  })

  it('preserves the population range exactly when every conditional ratio is one', () => {
    const unitRange = { lower: 1, reference: 1, upper: 1 }
    const result = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        status: 'available',
        estimate: 10,
        range: { conservative: 10, baseline: 10, optimistic: 10 },
        modelVersion: 'test-model',
        dataVersion: 'test-data',
      },
      overrides: {
        orientationCompatibility: { status: 'scenario', range: unitRange },
        currentlySingle: { status: 'scenario', range: unitRange },
        relationshipWillingness: { status: 'scenario', range: unitRange },
      },
    })
    expect(result.combined.range).toEqual({ lower: 10, reference: 10, upper: 10 })
    expect(result.combined.zeroMeaning).toEqual({ lower: 'none', reference: 'none', upper: 'none' })
  })

  it('does not invent a count when a required factor is unavailable or not estimated', () => {
    const unavailable = computeRelationshipScenario({
      seekerGender: 'female', targetGender: 'female', targetPopulation: availablePopulation,
      overrides: {
        currentlySingle: { status: 'unavailable', reason: '没有同口径数据' },
      },
    })
    const notEstimated = computeRelationshipScenario({
      seekerGender: 'female', targetGender: 'female', targetPopulation: availablePopulation,
      overrides: {
        relationshipWillingness: { status: 'not_estimated', reason: '用户没有提供情境参数' },
      },
    })
    expect(unavailable.combined).toMatchObject({
      status: 'unavailable', range: null, blockingFactorIds: ['currentlySingle'],
    })
    expect(notEstimated.combined).toMatchObject({
      status: 'not_estimated', range: null, blockingFactorIds: ['relationshipWillingness'],
    })
  })

  it('does not turn an unavailable main population anchor into zero people', () => {
    const result = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: { status: 'unavailable', reason: '所选城市没有可靠人口锚点' },
    })
    expect(result.mainLayer.status).toBe('unavailable')
    expect(result.mainLayer.range).toBeNull()
    expect(result.combined).toMatchObject({
      status: 'unavailable',
      range: null,
      zeroMeaning: { lower: 'none', reference: 'none', upper: 'none' },
    })
    expect(result.explanation.join(' ')).toContain('不是 0 人')
  })

  it('distinguishes exact scenario zero from a positive expectation below one', () => {
    const zero = computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'male', targetPopulation: availablePopulation,
      overrides: {
        orientationCompatibility: {
          status: 'scenario', range: { lower: 0, reference: 0, upper: 0 },
        },
      },
    })
    expect(zero.combined.zeroMeaning.reference).toBe('explicit_zero_assumption')
    expect(zero.combined.display?.reference).toBe('0 人（由明确的零比例情境产生）')
    expect(formatRelationshipCount(0.4)).toBe('情境期望值低于 1 人')
  })

  it('marks an all-positive product below floating-point range as numeric underflow', () => {
    const tinyPositiveRange = { lower: 1e-300, reference: 1e-300, upper: 1e-300 }
    const result = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'male',
      targetPopulation: {
        status: 'available',
        estimate: 1,
        range: { conservative: 1, baseline: 1, optimistic: 1 },
        modelVersion: 'test-model',
        dataVersion: 'test-data',
      },
      overrides: {
        orientationCompatibility: { status: 'scenario', range: tinyPositiveRange },
        currentlySingle: { status: 'scenario', range: tinyPositiveRange },
        relationshipWillingness: { status: 'scenario', range: tinyPositiveRange },
      },
    })
    expect(result.combined.range).toEqual({ lower: 0, reference: 0, upper: 0 })
    expect(result.combined.zeroMeaning).toEqual({
      lower: 'numeric_underflow',
      reference: 'numeric_underflow',
      upper: 'numeric_underflow',
    })
    expect(result.combined.display?.reference).toBe('正值低于数值可表示范围（不是 0 人）')
    expect(result.explanation.join(' ')).toContain('不能解释为现实中 0 人')
  })

  it('does not promote a numeric main-model zero to a real-world logical zero', () => {
    const result = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        status: 'available',
        estimate: 0,
        range: { conservative: 0, baseline: 0, optimistic: 0 },
        modelVersion: 'test-model',
        dataVersion: 'test-data',
      },
    })
    expect(result.combined.status).toBe('unavailable')
    expect(result.combined.zeroMeaning.reference).toBe('none')
    expect(result.combined.range).toBeNull()
    expect(result.combined.note).toContain('不会把主人口数值 0 宣称为现实中 0 人')
  })

  it('rejects malformed ranges and mismatched population baselines', () => {
    expect(() => computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'female', targetPopulation: availablePopulation,
      overrides: {
        currentlySingle: {
          status: 'scenario', range: { lower: 0.8, reference: 0.5, upper: 0.7 },
        },
      },
    })).toThrow(RelationshipScenarioInputError)
    expect(() => computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        ...availablePopulation,
        estimate: 900_000,
      },
    })).toThrow(RelationshipScenarioInputError)
    expect(() => computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        ...availablePopulation,
        estimate: 1e-10,
        range: { conservative: 1e-10, baseline: 0, optimistic: 1e-10 },
      },
    })).toThrow(RelationshipScenarioInputError)
    expect(() => computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: {
        status: 'available',
        estimate: 0,
        zeroMeaning: 'positive_below_resolution',
        range: { conservative: 0, baseline: 0, optimistic: 0 },
        modelVersion: 'test-model',
        dataVersion: 'test-data',
      },
    })).toThrow(RelationshipScenarioInputError)
  })
})

describe('main-model adapter and traceability', () => {
  it('uses the population result but never reads the soft-match scores', () => {
    const modelResult = computeModel({
      ...DEFAULT_SELECTION,
      softPreferenceIds: ['relationship.orientation_compatible', 'relationship.currently_single'],
      selfPreferenceIds: ['relationship.orientation_compatible', 'relationship.currently_single'],
    }, { seekerGender: 'female' })
    expect(modelResult.scores.bidirectionalIllustration).toBe(100)
    const result = computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'female',
      targetGender: 'male',
    })
    expect(result.mainLayer.range?.reference).toBe(modelResult.comprehensivePopulation.estimate)
    expect(result.mainLayer.role).toBe('comprehensive_scenario')
    expect(result.factors.orientationCompatibility.status).toBe('scenario')
    expect(result.factors.orientationCompatibility.appliedInMainPopulation).toBe(true)
    expect(result.factors.currentlySingle.appliedInMainPopulation).toBe(true)
    expect(result.factors.relationshipWillingness.appliedInMainPopulation).toBe(false)
    if (result.factors.orientationCompatibility.status === 'scenario') {
      expect(result.factors.orientationCompatibility.range).toEqual({ lower: 1, reference: 1, upper: 1 })
    }
    expect(result.combined.note).not.toContain('Jaccard')
    expect(result.explanation.join(' ')).toContain('不会使用软偏好重合分数')
  })

  it('applies each relationship factor at most once after the comprehensive layer', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.target.gender = 'male'
    input.softPreferenceIds = [
      'relationship.orientation_compatible',
      'relationship.currently_single',
    ]
    const modelResult = computeModel(input, { seekerGender: 'female' })
    const result = computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'female',
      targetGender: 'male',
    })
    expect(result.mainLayer.range?.reference).toBe(modelResult.comprehensivePopulation.estimate)
    if (
      result.combined.status === 'scenario' &&
      result.combined.range != null &&
      result.factors.relationshipWillingness.status === 'scenario'
    ) {
      expect(result.combined.range.reference).toBeCloseTo(
        modelResult.comprehensivePopulation.estimate *
          result.factors.relationshipWillingness.range.reference,
        5,
      )
    }
    expect(() => computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male',
      targetGender: 'male',
    })).toThrow('本人统计性别不一致')
  })

  it('rejects a target-gender mismatch between the two layers', () => {
    const modelResult = computeModel(DEFAULT_SELECTION)
    expect(() => computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male', targetGender: 'female', overrides: {},
    })).toThrow('目标性别')
  })

  it('validates adapter request options at runtime', () => {
    const modelResult = computeModel(DEFAULT_SELECTION)
    expect(() => computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male',
      targetGender: 'male',
      overrides: { currentlySingle: { status: 'scenario', range: { lower: -0.1, reference: 0.5, upper: 0.8 } } },
    })).toThrow(RelationshipScenarioInputError)
    expect(() => computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male',
      targetGender: 'male',
      unexpected: true,
    })).toThrow(RelationshipScenarioInputError)
  })

  it('preserves a proven main-population logical zero without confusing it with underflow', () => {
    const modelResult = {
      versions: { modelVersion: 'test-model', dataVersion: 'test-data' },
      input: { target: { gender: 'male' as const } },
      population: {
        status: 'estimated' as const,
        zeroMeaning: 'logical_zero' as const,
        estimate: 0,
        range: { conservative: 0, baseline: 0, optimistic: 0 },
      },
    }
    const result = computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male', targetGender: 'male',
    })
    expect(result.combined.status).toBe('scenario')
    expect(result.combined.range).toEqual({ lower: 0, reference: 0, upper: 0 })
    expect(result.combined.zeroMeaning).toEqual({
      lower: 'main_population_zero',
      reference: 'main_population_zero',
      upper: 'main_population_zero',
    })
    expect(result.combined.display?.reference).toContain('主人口逻辑空集')
  })

  it('does not call a zero sensitivity lower bound a logical empty population', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.target.heightCm = { min: 175, max: null }
    selection.correlated.smoking = 'non_smoker'
    const modelResult = computeModel(selection)
    expect(modelResult.population.estimate).toBeGreaterThan(0)
    expect(modelResult.population.range.conservative).toBe(0)
    expect(modelResult.population.zeroMeaning).toBe('not_zero')

    const result = computeRelationshipScenarioFromModel(modelResult, {
      seekerGender: 'male',
      targetGender: 'male',
    })
    expect(result.combined.zeroMeaning.lower).toBe('main_population_scenario_zero')
    expect(result.combined.zeroMeaning.reference).toBe('none')
    expect(result.combined.display?.lower).toContain('敏感性边界')
    expect(result.combined.display?.lower).toContain('不代表现实无人')
  })

  it('reports zero causes per bound rather than hiding a zero lower scenario', () => {
    const result = computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'male', targetPopulation: availablePopulation,
      overrides: {
        orientationCompatibility: {
          status: 'scenario', range: { lower: 0, reference: 0.1, upper: 0.2 },
        },
      },
    })
    expect(result.combined.zeroMeaning).toEqual({
      lower: 'explicit_zero_assumption',
      reference: 'none',
      upper: 'none',
    })
    expect(result.combined.display?.lower).toContain('明确的零比例')
  })

  it('returns only registered, fully described sources', () => {
    const registered = new Set(RELATIONSHIP_EVIDENCE_SOURCES.map((source) => source.id))
    const result = computeRelationshipScenario({
      seekerGender: 'male', targetGender: 'male', targetPopulation: availablePopulation,
    })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) {
      expect(registered.has(source.id)).toBe(true)
      if (source.kind === 'study') {
        expect(source.url).toMatch(/^https:\/\//)
        expect(source.documentPath).toBeNull()
      } else {
        expect(source.url).toBeNull()
        expect(source.documentPath).toBe('docs/RELATIONSHIP_SCENARIO_METHOD.md')
      }
      expect(source.applicablePopulation).toBeTruthy()
      expect(source.measure).toBeTruthy()
      expect(source.limitations.length).toBeGreaterThan(0)
    }
  })
})

describe('relationship evidence release validation', () => {
  it('accepts the registered sources, scenarios, dates and independent versions', () => {
    expect(validateRelationshipData('2026-08-14')).toEqual({
      valid: true,
      sourceCount: RELATIONSHIP_EVIDENCE_SOURCES.length,
      scenarioCount: Object.keys(RELATIONSHIP_FACTOR_SCENARIOS).length,
      issues: [],
    })
  })

  it('rejects future dates, insecure study URLs, unsafe analyst paths and unknown source IDs', () => {
    const brokenSources = RELATIONSHIP_DATA_SNAPSHOT.sources.map((source, index) => index === 0
      ? { ...source, url: 'http://example.test/study', retrievedAt: '2099-01-01' }
      : source.kind === 'analyst_scenario'
        ? { ...source, documentPath: '../outside.md' }
        : source)
    const brokenScenarios = {
      ...RELATIONSHIP_DATA_SNAPSHOT.scenarios,
      currentlySingle: {
        ...RELATIONSHIP_DATA_SNAPSHOT.scenarios.currentlySingle,
        sourceIds: ['missing-source'],
      },
    }
    const result = validateRelationshipData('2026-08-14', {
      ...RELATIONSHIP_DATA_SNAPSHOT,
      scenarioVersion: 'not-semver',
      dataVersion: '2099.01.01',
      evidenceRetrievedAt: '2099-01-01',
      sources: brokenSources,
      scenarios: brokenScenarios,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toMatch(/HTTPS/)
    expect(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toMatch(/documentPath/)
    expect(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toMatch(/不能晚于构建日期/)
    expect(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toContain('未登记来源：missing-source')
    expect(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toContain('语义版本号')
  })
})
