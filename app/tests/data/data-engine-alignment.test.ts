import { describe, expect, it } from 'vitest'
import { CITIES, NATIONAL_WAGE } from '../../src/data/cities'
import {
  EVIDENCE_REGISTRY,
  declaredEvidenceForDimension,
  evidenceById,
  validateEvidenceRegistry,
} from '../../src/data/evidence-validation'
import {
  CAR_RATE,
  HOUSE_LOCAL_RATE,
  drinkingRate,
  nonSmokerRate,
} from '../../src/data/model'
import { populationPolicyForDimension } from '../../src/data/population-policy'
import {
  CENSUS_2020_MAINLAND_POPULATION_WAN,
  NATIONAL_POPULATION_WAN,
  cityPopulationScale,
  cityWageScale,
} from '../../src/data/population'
import { computeModel } from '../../src/engine/modelEngine'
import { DIMENSION_REGISTRY } from '../../src/model/dimensions'
import { DEFAULT_SELECTION } from '../../src/model/schema'
import { POPULATION_QUANTIFICATION_POLICY } from '../../src/data/population-policy'

describe('evidence registry to runtime alignment', () => {
  it('keeps every population policy traceable and aligned with dimension population use', () => {
    const evidenceIds = new Set(EVIDENCE_REGISTRY.entries.map((entry) => entry.id))
    const dimensions = new Map(DIMENSION_REGISTRY.map((dimension) => [dimension.id, dimension]))
    for (const [dimensionId, policy] of Object.entries(POPULATION_QUANTIFICATION_POLICY)) {
      expect(policy.dimensionId).toBe(dimensionId)
      expect(dimensions.has(dimensionId), dimensionId).toBe(true)
      expect(policy.evidenceIds.every((evidenceId) => evidenceIds.has(evidenceId)), dimensionId).toBe(true)
      expect(policy.status === 'included_estimate' ? policy.mainEstimateEffect : 'do_not_apply')
        .toBe(policy.mainEstimateEffect)
      expect(dimensions.get(dimensionId)?.populationUse).toBe(
        policy.mainEstimateEffect === 'apply' ? 'included' : 'scenario',
      )
      const multiplierMethod = policy.scenarioMethod === 'city_structure_multiplier' ||
        policy.scenarioMethod === 'all_age_to_target_age_multiplier'
      expect(policy.scenarioRange != null, `${dimensionId} multiplier-method alignment`).toBe(multiplierMethod)
      if (policy.mainEstimateEffect === 'do_not_apply') {
        expect(policy.scenarioMethod).toBe('not_applied')
      }
      if (policy.scenarioRange) {
        expect(policy.scenarioRange.isConfidenceInterval).toBe(false)
        expect(policy.scenarioRange.conservativeMultiplier).toBeGreaterThanOrEqual(0)
        expect(policy.scenarioRange.conservativeMultiplier).toBeLessThanOrEqual(1)
        expect(policy.scenarioRange.optimisticMultiplier).toBeGreaterThanOrEqual(1)
      }
    }

    expect(POPULATION_QUANTIFICATION_POLICY['base.region'].scenarioMethod)
      .toBe('city_structure_multiplier')
    expect(POPULATION_QUANTIFICATION_POLICY['appearance.height'].scenarioMethod)
      .toBe('height_parameter_endpoints')
    expect(POPULATION_QUANTIFICATION_POLICY['lifestyle.smoking'].scenarioMethod)
      .toBe('all_age_to_target_age_multiplier')
    expect(POPULATION_QUANTIFICATION_POLICY['lifestyle.drinking'].scenarioMethod)
      .toBe('drinking_raking_endpoints')
    for (const dimension of DIMENSION_REGISTRY.filter((entry) => entry.populationUse === 'included')) {
      expect(POPULATION_QUANTIFICATION_POLICY[dimension.id]?.mainEstimateEffect, dimension.id).toBe('apply')
    }
  })

  it('resolves every declared evidence id exactly and never overstates its grade', () => {
    const summary = validateEvidenceRegistry()
    expect(summary.missingDeclaredEvidenceIds).toEqual([])
    expect(summary.overstatedDeclaredGrades).toEqual([])
    expect(summary.declaredClassificationMismatches).toEqual([])
    expect(summary.declaredDimensionMismatches).toEqual([])
    for (const dimension of DIMENSION_REGISTRY.filter((item) => item.evidenceId != null)) {
      expect(declaredEvidenceForDimension(dimension.id)?.id, dimension.id).toBe(dimension.evidenceId)
    }
    expect(DIMENSION_REGISTRY.find((dimension) => dimension.id === 'base.marital')?.evidenceGrade).toBe('B')
    expect(DIMENSION_REGISTRY.find((dimension) => dimension.id === 'lifestyle.drinking')?.evidenceGrade).toBe('C')
  })

  it('prevents excluded evidence from entering any population route', () => {
    const summary = validateEvidenceRegistry()
    expect(summary.populationDimensionsUsingExcludedEvidence).toEqual([])
    const excludedDimensionIds = new Set(EVIDENCE_REGISTRY.entries
      .filter((entry) => entry.modelUse === 'excluded')
      .map((entry) => entry.dimensionId))
    const routedPopulationIds = new Set(DIMENSION_REGISTRY.filter((dimension) => dimension.population).map((dimension) => dimension.id))
    expect(routedPopulationIds.has('health.chronic')).toBe(false)
    expect(routedPopulationIds.has('health.myopia')).toBe(false)
    expect(excludedDimensionIds.has('health.chronic')).toBe(true)
  })

  it('does not change population when excluded chronic/myopia criteria are selected', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const input = {
      ...DEFAULT_SELECTION,
      correlated: {
        ...DEFAULT_SELECTION.correlated,
        healthCriteria: ['no_major_chronic', 'no_myopia'],
      },
    } as const
    const withExcludedHealthCriteria = computeModel(input)
    expect(withExcludedHealthCriteria.population.estimate).toBe(base.population.estimate)
    expect(withExcludedHealthCriteria.population.status).toBe('estimated')
    expect(withExcludedHealthCriteria.coverage.unquantifiedHardConditions).toEqual([])
    const declaredHard = computeModel(input, { hardRequirementIds: ['health.chronic', 'health.myopia'] })
    expect(declaredHard.population.status).toBe('upper_bound')
    expect(declaredHard.coverage.unquantifiedHardConditions.map((item) => item.dimensionId))
      .toEqual(expect.arrayContaining(['health.chronic', 'health.myopia']))
    expect(withExcludedHealthCriteria.scores.softMatch).toBe(base.scores.softMatch)
    expect(withExcludedHealthCriteria.scoreDetails.selectedSoftPreferences).toBe(2)
  })
})

describe('registered national and city anchors', () => {
  const cityAnchors = [
    ['北京', 2180, 'evidence.base.region.beijing-2025'],
    ['上海', 2485.41, 'evidence.base.region.shanghai-2025'],
    ['深圳', 1824.85, 'evidence.base.region.shenzhen-2025'],
    ['广州', 1910.10, 'evidence.base.region.guangzhou-2025'],
    ['苏州', 1304.77, 'evidence.base.region.suzhou-2025'],
    ['武汉', 1386.19, 'evidence.base.region.wuhan-2025'],
  ] as const

  it('uses the 2020 census denominator with exact registered city resident anchors', () => {
    const censusDenominator = evidenceById('evidence.base.region.census-mainland-total-2020')
    const national2025Calibration = evidenceById('evidence.base.region.population-2025')

    expect(NATIONAL_POPULATION_WAN).toBe(140_489)
    expect(CENSUS_2020_MAINLAND_POPULATION_WAN).toBe(140_977.8724)
    expect(censusDenominator?.estimate.unit).toBe('people')
    expect(censusDenominator?.estimate.baseline).toBe(1_409_778_724)
    expect(censusDenominator!.estimate.baseline! / 10_000).toBe(CENSUS_2020_MAINLAND_POPULATION_WAN)
    expect(censusDenominator?.modelUse).toBe('direct')
    expect(national2025Calibration?.estimate.baseline).toBe(NATIONAL_POPULATION_WAN * 10_000)
    expect(national2025Calibration?.modelUse).toBe('calibration')
    expect(national2025Calibration?.transformation).toContain('不以本条为分母')
    expect(populationPolicyForDimension('base.region').evidenceIds).toEqual([
      'evidence.base.region.census-mainland-total-2020',
      'evidence.base.region.population-2025',
    ])
    for (const [name, populationWan, evidenceId] of cityAnchors) {
      const city = CITIES.find((candidate) => candidate.name === name)
      expect(city?.pop, name).toBe(populationWan)
      expect(city?.populationYear, name).toBe(2025)
      expect(city?.sourceEvidenceId, name).toBe(evidenceId)
      expect(cityPopulationScale([name]), name).toBeCloseTo(populationWan / CENSUS_2020_MAINLAND_POPULATION_WAN, 12)
    }
    expect(cityPopulationScale(['北京', '北京'])).toBe(cityPopulationScale(['北京']))
  })

  it('keeps every supported city transformation on the same census denominator', () => {
    const supportedCities = CITIES.filter((city) => city.mainEstimateStatus === 'included_estimate')
    expect(supportedCities).toHaveLength(56)

    for (const city of supportedCities) {
      const evidence = evidenceById(city.sourceEvidenceId)
      expect(evidence?.modelUse, city.name).toBe('anchor')
      expect(evidence?.transformation, city.name).toContain('140,977.8724万人')
      expect(evidence?.transformation, city.name).toContain('1,409,778,724人')
      expect(evidence?.transformation, city.name).toContain('2025全国人口只作宏观校准')
      expect(evidence?.transformation, city.name).toContain('不参与该比例')
      expect(cityPopulationScale([city.name]), city.name)
        .toBeCloseTo(city.pop / CENSUS_2020_MAINLAND_POPULATION_WAN, 12)
    }
  })

  it('uses the registered 2025 wage anchor only as a relative city calibration', () => {
    expect(NATIONAL_WAGE).toBe(106_080)
    expect(cityWageScale(['北京'])).toBeCloseTo(218_312 / NATIONAL_WAGE, 12)
    expect(cityWageScale(['全国'])).toBe(1)
  })

  it('uses current smoking and recall-period alcohol complements', () => {
    expect(nonSmokerRate('male')).toBe(0.561)
    expect(nonSmokerRate('female')).toBe(0.982)
    expect(drinkingRate('male', 'notRegular')).toBe(0.657)
    expect(drinkingRate('female', 'notRegular')).toBe(0.941)
    expect(drinkingRate('male', 'none')).toBe(0.555)
    expect(drinkingRate('female', 'none')).toBe(0.898)
    expect(drinkingRate('male', 'none')).toBeLessThan(drinkingRate('male', 'notRegular'))
    expect(drinkingRate('male', 'notRegular', 22)).toBeGreaterThan(drinkingRate('male', 'notRegular', 32))
    expect(drinkingRate('female', 'none', 32)).toBeLessThan(drinkingRate('female', 'none', 22))
  })

  it('uses the registry C-grade individual housing and vehicle baselines', () => {
    expect(HOUSE_LOCAL_RATE).toBe(0.45)
    expect(CAR_RATE).toBe(0.35)
  })
})
