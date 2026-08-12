import { describe, expect, it } from 'vitest'
import { computeLegacySelection, fromLegacySelection, type LegacySelection } from '../../src/engine/legacyAdapter'

const legacy: LegacySelection = {
  gender: 'male', ageMin: 26, ageMax: 34, cities: ['全国'], marital: ['未婚'],
  heightMin: null, bmi: [], incomeMin: null, wealthMin: null, needHouse: false,
  houseLoc: null, houseArea: null, houseType: null, needCar: false, edu: [], school: null,
  noSmoke: false, drink: 'any', tattooFree: false, hair: [], zodiacs: [], carBands: [],
  health: [], intimacy: [], bonus: [], emotion: [], mbti: [],
}

describe('legacy UI migration adapter', () => {
  it('does not resurrect never-married when all chips are removed', () => {
    const parsed = fromLegacySelection({ ...legacy, marital: [] })
    expect(parsed.target.maritalStatuses).toEqual([])
    expect(computeLegacySelection({ ...legacy, marital: [] }).population.base)
      .toBeGreaterThan(computeLegacySelection(legacy).population.base)
  })

  it('migrates both legacy divorced-with-children variants to one official census category', () => {
    const parsed = fromLegacySelection({ ...legacy, marital: ['离异无孩', '离异有孩'] })
    expect(parsed.target.maritalStatuses).toEqual(['divorced'])
  })

  it('moves old soft and entertainment filters out of the population funnel', () => {
    const base = computeLegacySelection(legacy)
    const migrated = computeLegacySelection({
      ...legacy,
      tattooFree: true,
      health: ['每周锻炼', '睡眠良好', '牙齿整齐'],
      intimacy: ['功能在线', '持久战', '恋爱史简单'],
      bonus: ['体制内', '父母有退休金', '独生子女', '会做饭'],
      emotion: ['目前单身', '取向为异性'],
      mbti: ['E', 'N', 'F', 'J'],
      zodiacs: ['狮子座'],
    })
    expect(migrated.population).toEqual(base.population)
    expect(migrated.scoreDetails.selectedSoftPreferences).toBeGreaterThan(10)
    expect(migrated.scores.entertainment).toBeGreaterThan(0)
  })
})
