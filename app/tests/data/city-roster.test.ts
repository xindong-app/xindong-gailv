import { describe, expect, it } from 'vitest'
import { CITIES } from '../../src/data/cities'
import cityPopulationSourcesJson from '../../src/data/city-population-sources.json'
import { CITY_TIER_ROSTER, validateCityRoster } from '../../src/data/city-validation'
import { EVIDENCE_REGISTRY } from '../../src/data/evidence-validation'
import { computeModel, type ModelResult } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

const EXPECTED_FIRST = ['上海', '北京', '深圳', '广州'] as const
const EXPECTED_NEW_FIRST = [
  '成都', '杭州', '重庆', '武汉', '苏州', '西安', '南京', '长沙',
  '郑州', '天津', '合肥', '青岛', '东莞', '宁波', '佛山',
] as const
const EXPECTED_SECOND = [
  '济南', '无锡', '沈阳', '昆明', '福州', '厦门', '温州', '石家庄',
  '大连', '哈尔滨', '金华', '泉州', '南宁', '长春', '常州', '南昌',
  '南通', '贵阳', '嘉兴', '徐州', '惠州', '太原', '烟台', '临沂',
  '保定', '台州', '绍兴', '珠海', '洛阳', '潍坊',
] as const
const EXPECTED_RETAINED = ['兰州', '乌鲁木齐', '海口', '银川', '西宁', '呼和浩特', '拉萨'] as const
const HANGZHOU_SHAOXING_NINGBO = ['杭州', '绍兴', '宁波'] as const

function selectionForCities(cities: readonly string[]): ModelSelection {
  const selection = structuredClone(DEFAULT_SELECTION)
  selection.target.cities = [...cities]
  return selection
}

function modelForCities(cities: readonly string[]): ModelResult {
  return computeModel(selectionForCities(cities))
}

function expectAdditive(union: number, parts: readonly number[]): void {
  const sum = parts.reduce((total, value) => total + value, 0)
  const tolerance = Math.max(1e-6, Math.abs(sum) * 1e-10)
  expect(Math.abs(union - sum)).toBeLessThanOrEqual(tolerance)
}

function isOfficialGovernmentHttps(sourceUrl: string): boolean {
  const url = new URL(sourceUrl)
  return url.protocol === 'https:' && (url.hostname === 'gov.cn' || url.hostname.endsWith('.gov.cn'))
}

describe('city roster and official population anchors', () => {
  it('locks the complete 2025 4/15/30 roster and the seven retained cities', () => {
    expect(CITY_TIER_ROSTER.tiers.first).toEqual(EXPECTED_FIRST)
    expect(CITY_TIER_ROSTER.tiers.newFirst).toEqual(EXPECTED_NEW_FIRST)
    expect(CITY_TIER_ROSTER.tiers.second).toEqual(EXPECTED_SECOND)
    expect(CITY_TIER_ROSTER.retainedAdditionalCities).toEqual(EXPECTED_RETAINED)

    const roster = [...EXPECTED_FIRST, ...EXPECTED_NEW_FIRST, ...EXPECTED_SECOND]
    const selectable = [...roster, ...EXPECTED_RETAINED]
    expect(roster).toHaveLength(49)
    expect(new Set(roster)).toHaveLength(49)
    expect(selectable).toHaveLength(56)
    expect(new Set(selectable)).toHaveLength(56)
    expect(CITIES.map((city) => city.name)).toEqual(selectable)

    expect(validateCityRoster()).toEqual(expect.objectContaining({
      valid: true,
      issues: [],
      rosterCityCount: 49,
      selectableCityCount: 56,
      supportedCityCount: 56,
      evidenceCityCount: 56,
    }))
  })

  it('locks the Hangzhou-Shaoxing-Ningbo official resident-population values and years', () => {
    expect(CITIES.filter((city) => HANGZHOU_SHAOXING_NINGBO.includes(
      city.name as typeof HANGZHOU_SHAOXING_NINGBO[number],
    )).map(({ name, pop, populationYear, sourceEvidenceId }) => ({
      name,
      pop,
      populationYear,
      sourceEvidenceId,
    }))).toEqual([
      {
        name: '杭州',
        pop: 1270,
        populationYear: 2025,
        sourceEvidenceId: 'evidence.base.region.hangzhou-2025',
      },
      {
        name: '宁波',
        pop: 983.3,
        populationYear: 2025,
        sourceEvidenceId: 'evidence.base.region.ningbo-2025',
      },
      {
        name: '绍兴',
        pop: 544.3,
        populationYear: 2025,
        sourceEvidenceId: 'evidence.base.region.shaoxing-2025',
      },
    ])
    expect(HANGZHOU_SHAOXING_NINGBO.reduce((total, name) =>
      total + (CITIES.find((city) => city.name === name)?.pop ?? 0), 0,
    )).toBeCloseTo(2797.6, 10)
  })

  it('keeps every selectable city computable with a positive, fully supported result', () => {
    for (const city of CITIES) {
      const result = modelForCities([city.name])
      expect(result.population.status, city.name).not.toBe('unavailable')
      expect(result.population.numericStatus, city.name).toBe('available')
      expect(result.population.base, city.name).toBeGreaterThan(0)
      expect(result.population.estimate, city.name).toBeGreaterThan(0)
      expect(result.population.range.conservative, city.name).toBeGreaterThan(0)
      expect(result.coverage.unsupportedCities, city.name).toEqual([])
    }
  })

  it('makes the Hangzhou-Shaoxing-Ningbo union additive for base, estimate and all range endpoints', () => {
    const union = modelForCities(HANGZHOU_SHAOXING_NINGBO).population
    const parts = HANGZHOU_SHAOXING_NINGBO.map((name) => modelForCities([name]).population)

    expect(union.status).not.toBe('unavailable')
    expectAdditive(union.base, parts.map((part) => part.base))
    expectAdditive(union.scopeCeiling, parts.map((part) => part.scopeCeiling))
    expectAdditive(union.estimate, parts.map((part) => part.estimate))
    for (const endpoint of ['conservative', 'baseline', 'optimistic'] as const) {
      expectAdditive(union.range[endpoint], parts.map((part) => part.range[endpoint]))
    }
  })

  it('matches every runtime city exactly to an official source row and A-grade anchor evidence', () => {
    const sourceByName = new Map(cityPopulationSourcesJson.entries.map((source) => [source.name, source]))
    const evidenceById = new Map(EVIDENCE_REGISTRY.entries.map((evidence) => [evidence.id, evidence]))

    expect(sourceByName.size).toBe(56)
    expect(cityPopulationSourcesJson.entries.filter((source) => source.populationYear === 2025)).toHaveLength(44)
    expect(cityPopulationSourcesJson.entries.filter((source) => source.populationYear === 2024)).toHaveLength(12)
    expect(cityPopulationSourcesJson.futureMissingAnchorPolicy).toMatchObject({
      status: 'registered_but_unused',
      currentProxyCityCount: 0,
      priority: [
        'latest_official_city_resident_population',
        'prior_year_official_city_resident_population',
        'comparable_city_proxy_scenario',
      ],
      proxyRequirements: {
        mustNameReferenceCities: true,
        mustExplainMatch: true,
        mustUseWideRange: true,
        mustNotPresentAsOfficialPointEstimate: true,
        maximumEvidenceGrade: 'D',
      },
    })
    for (const city of CITIES) {
      const source = sourceByName.get(city.name)
      expect(source, city.name).toBeDefined()
      if (source == null) continue

      expect(isOfficialGovernmentHttps(source.sourceUrl), city.name).toBe(true)
      expect(source).toMatchObject({
        name: city.name,
        province: city.province,
        popWan: city.pop,
        populationYear: city.populationYear,
        sourceEvidenceId: city.sourceEvidenceId,
      })

      const evidence = evidenceById.get(city.sourceEvidenceId)
      expect(evidence, city.name).toBeDefined()
      if (evidence == null) continue

      expect(isOfficialGovernmentHttps(evidence.sourceUrl), city.name).toBe(true)
      expect(evidence).toMatchObject({
        id: city.sourceEvidenceId,
        dimensionId: 'base.region',
        classification: 'hard',
        geography: source.geography,
        dataYear: `${city.populationYear}-year-end`,
        publisher: source.publisher,
        sourceTitle: source.sourceTitle,
        sourceUrl: source.sourceUrl,
        directValue: source.directValue,
        estimate: {
          conservative: city.pop,
          baseline: city.pop,
          optimistic: city.pop,
          unit: 'wan',
        },
        grade: 'A',
        modelUse: 'anchor',
      })
      expect(evidence.transformation, city.name).toContain('140,977.8724万人')
      expect(evidence.transformation, city.name).toContain('1,409,778,724人')
      expect(evidence.transformation, city.name).toContain('不参与该比例')
    }
  })
})
