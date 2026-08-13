import { describe, expect, it } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'
import {
  buildShareDto,
  buildTextFallback,
  createDefaultShareSettings,
  listShareFieldCandidates,
  type ShareSettings,
} from '../../src/share'

function privateSelection(): ModelSelection {
  const selection = structuredClone(DEFAULT_SELECTION)
  selection.target.cities = ['北京']
  selection.target.maritalStatuses = ['divorced']
  selection.correlated.minAnnualIncomeWan = 50
  selection.correlated.minHouseholdWealthWan = 600
  selection.correlated.healthCriteria = ['no_major_chronic']
  selection.correlated.smoking = 'non_smoker'
  selection.softPreferenceIds = [
    'lifestyle.exercise',
    'family.parents_pension',
    'relationship.orientation_compatible',
    'relationship.intimacy_health',
  ]
  selection.selfPreferenceIds = ['relationship.orientation_compatible']
  return selection
}

describe('share privacy policy', () => {
  it('excludes every selected sensitive dimension by default', () => {
    const selection = privateSelection()
    const candidates = listShareFieldCandidates(selection)
    const sensitiveIds = candidates.filter((field) => field.sensitive).map((field) => field.dimensionId)
    const settings = createDefaultShareSettings(selection)

    expect(sensitiveIds).toEqual(expect.arrayContaining([
      'base.marital',
      'economy.income',
      'economy.wealth',
      'health.chronic',
      'family.parents_pension',
      'relationship.orientation_compatible',
      'relationship.intimacy_health',
    ]))
    expect(settings.sensitiveConsentDimensionIds).toEqual([])
    expect(settings.includedDimensionIds).not.toEqual(expect.arrayContaining(sensitiveIds))

    const dto = buildShareDto(selection, computeModel(selection), settings)
    const serialized = JSON.stringify(dto)
    for (const candidate of candidates.filter((field) => field.sensitive)) {
      expect(serialized).not.toContain(candidate.dimensionId)
    }
    // Reverse/self assessment is never part of the sharing DTO allowlist.
    expect(serialized).not.toContain('selfPreferenceIds')
    expect(serialized).not.toContain('softMatch')
    expect(serialized).not.toContain('bidirectionalIllustration')
    expect(buildTextFallback(dto)).not.toContain('双向条件命中')
    expect(buildTextFallback(dto)).not.toContain('软偏好契合')
  })

  it('requires both inclusion and explicit sensitive consent', () => {
    const selection = privateSelection()
    const base = createDefaultShareSettings(selection)
    const includeOnly: ShareSettings = {
      ...base,
      includedDimensionIds: [...base.includedDimensionIds, 'economy.income'],
    }
    expect(buildShareDto(selection, computeModel(selection), includeOnly).conditions)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ dimensionId: 'economy.income' })]))

    const consentOnly: ShareSettings = {
      ...base,
      sensitiveConsentDimensionIds: ['economy.income'],
    }
    expect(buildShareDto(selection, computeModel(selection), consentOnly).conditions)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ dimensionId: 'economy.income' })]))

    const explicit: ShareSettings = {
      ...includeOnly,
      sensitiveConsentDimensionIds: ['economy.income'],
    }
    expect(buildShareDto(selection, computeModel(selection), explicit).conditions)
      .toEqual(expect.arrayContaining([expect.objectContaining({ dimensionId: 'economy.income' })]))
  })

  it('masks the verdict top killer when that sensitive dimension is not public', () => {
    const selection = privateSelection()
    selection.correlated.minAnnualIncomeWan = 10_000 // 确保收入是淘汰最多的那一刀
    const result = computeModel(selection)
    const defaults = createDefaultShareSettings(selection)

    // 默认(收入未二次确认): 毒舌总评只亮"神秘条件", 不点名最低年收入
    const dto = buildShareDto(selection, result, defaults)
    expect(dto.fun?.verdict).toContain('某个神秘条件')
    expect(dto.fun?.verdict).not.toContain('最低年收入')
    expect(buildTextFallback(dto)).not.toContain('最低年收入')

    // 用户明确公开收入后: 恢复点名与专属玩笑
    const explicit: ShareSettings = {
      ...defaults,
      includedDimensionIds: [...defaults.includedDimensionIds, 'economy.income'],
      sensitiveConsentDimensionIds: ['economy.income'],
    }
    expect(buildShareDto(selection, result, explicit).fun?.verdict).toContain('最低年收入')
  })

  it('strictly ignores unknown ids instead of copying arbitrary input into the DTO', () => {
    const selection = privateSelection()
    const settings = createDefaultShareSettings(selection)
    settings.includedDimensionIds.push('raw.profile.secret')
    settings.sensitiveConsentDimensionIds.push('raw.profile.secret')

    expect(JSON.stringify(buildShareDto(selection, computeModel(selection), settings)))
      .not.toContain('raw.profile.secret')
  })
})

describe('share visibility controls and text fallback', () => {
  it('can independently hide population, region, and every condition', () => {
    const selection = privateSelection()
    const result = computeModel(selection)
    const defaults = createDefaultShareSettings(selection)
    const settings: ShareSettings = {
      ...defaults,
      showCount: false,
      showRegion: false,
      showConditions: false,
      showEntertainment: false,
    }
    const dto = buildShareDto(selection, result, settings)
    const text = buildTextFallback(dto)

    expect(dto).not.toHaveProperty('population')
    expect(dto).not.toHaveProperty('region')
    expect(dto).not.toHaveProperty('conditions')
    expect(dto.scores).not.toHaveProperty('entertainment')
    expect(text).not.toContain('满足硬条件的估算人群')
    expect(text).not.toContain('北京')
    expect(text).not.toContain('公开条件')
  })

  it('does not leak region through the condition list when only region is hidden', () => {
    const selection = privateSelection()
    const settings = createDefaultShareSettings(selection)
    settings.showRegion = false
    const dto = buildShareDto(selection, computeModel(selection), settings)

    expect(dto.region).toBeUndefined()
    expect(dto.conditions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ dimensionId: 'base.region' }),
    ]))
    expect(buildTextFallback(dto)).not.toContain('北京')
  })

  it('does not leak age through audience or condition list when age is hidden', () => {
    const selection = privateSelection()
    const settings = createDefaultShareSettings(selection)
    settings.showAge = false
    const dto = buildShareDto(selection, computeModel(selection), settings)

    expect(dto.audience.ageRange).toBeUndefined()
    expect(dto.conditions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ dimensionId: 'base.age' }),
    ]))
    expect(buildTextFallback(dto)).not.toContain('26–34 岁')
  })

  it('includes audit versions and an unambiguous non-official entertainment notice', () => {
    const selection = privateSelection()
    const dto = buildShareDto(selection, computeModel(selection), createDefaultShareSettings(selection))
    const text = buildTextFallback(dto)

    expect(dto.versions.modelVersion).toBeTruthy()
    expect(dto.versions.dataVersion).toBeTruthy()
    expect(text).toContain('仅供娱乐参考')
    expect(text).toContain('不是官方结论')
    expect(text).not.toContain('心动概率')
  })

  it('uses a bounded, honest label when an extreme result falls below resolution', () => {
    const selection = privateSelection()
    selection.target.age = { min: 50, max: 50 }
    selection.target.heightCm = { min: 210, max: 220 }
    selection.correlated.minAnnualIncomeWan = 10_000
    selection.correlated.minHouseholdWealthWan = 1_000_000
    const result = computeModel(selection)
    const dto = buildShareDto(selection, result, createDefaultShareSettings(selection))

    expect(result.population.resolutionExceeded).toBe(true)
    expect(dto.population?.estimateLabel).toBe('低于模型可靠分辨率（不代表不存在）')
  })
})
