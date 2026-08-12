import { describe, expect, it } from 'vitest'
import { CITIES, NATIONAL_WAGE } from '../../src/data/cities'
import {
  EVIDENCE_REGISTRY,
  declaredEvidenceForDimension,
  validateEvidenceRegistry,
} from '../../src/data/evidence'
import {
  CAR_RATE,
  HOUSE_LOCAL_RATE,
  drinkingRate,
  nonSmokerRate,
} from '../../src/data/model'
import {
  NATIONAL_POPULATION_WAN,
  cityPopulationScale,
  cityWageScale,
} from '../../src/data/population'
import { computeModel } from '../../src/engine/modelEngine'
import { DIMENSION_REGISTRY } from '../../src/model/dimensions'
import { DEFAULT_SELECTION } from '../../src/model/schema'

describe('evidence registry to runtime alignment', () => {
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
    const withExcludedHealthCriteria = computeModel({
      ...DEFAULT_SELECTION,
      correlated: {
        ...DEFAULT_SELECTION.correlated,
        healthCriteria: ['no_major_chronic', 'no_myopia'],
      },
    })
    expect(withExcludedHealthCriteria.population).toEqual(base.population)
    expect(withExcludedHealthCriteria.scores.softMatch).toBe(base.scores.softMatch)
    expect(withExcludedHealthCriteria.scoreDetails.selectedSoftPreferences).toBe(2)
  })
})

describe('registered 2025 anchors', () => {
  const cityAnchors = [
    ['北京', 2180, 'evidence.base.region.beijing-2025'],
    ['上海', 2485.41, 'evidence.base.region.shanghai-2025'],
    ['深圳', 1824.85, 'evidence.base.region.shenzhen-2025'],
    ['广州', 1910.10, 'evidence.base.region.guangzhou-2025'],
    ['苏州', 1304.77, 'evidence.base.region.suzhou-2025'],
    ['武汉', 1386.19, 'evidence.base.region.wuhan-2025'],
  ] as const

  it('uses the 2025 national denominator and exact registered city populations', () => {
    expect(NATIONAL_POPULATION_WAN).toBe(140_489)
    for (const [name, populationWan, evidenceId] of cityAnchors) {
      const city = CITIES.find((candidate) => candidate.name === name)
      expect(city?.pop, name).toBe(populationWan)
      expect(city?.populationYear, name).toBe(2025)
      expect(city?.sourceEvidenceId, name).toBe(evidenceId)
      expect(cityPopulationScale([name]), name).toBeCloseTo(populationWan / NATIONAL_POPULATION_WAN, 12)
    }
    expect(cityPopulationScale(['北京', '北京'])).toBe(cityPopulationScale(['北京']))
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
