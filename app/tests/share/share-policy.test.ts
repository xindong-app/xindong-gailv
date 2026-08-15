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

  it('computes the verdict only from public quantified conditions, omitting it otherwise', () => {
    const selection = privateSelection()
    selection.correlated.minAnnualIncomeWan = 10_000
    const result = computeModel(selection)
    const defaults = createDefaultShareSettings(selection)

    // v4: 综合层里公开的软偏好(如运动频率)也是真实关卡, 可以出现在总评里;
    // 但敏感且未公开的条件(吸烟/收入/婚史/慢性病)连链式影响都不许进入。
    const dto = buildShareDto(selection, result, defaults)
    expect(JSON.stringify(dto)).not.toContain('神秘条件')
    expect(buildTextFallback(dto)).not.toContain('最低年收入')
    expect(dto.fun?.verdict ?? '').not.toContain('吸烟')
    expect(dto.fun?.verdict ?? '').not.toContain('婚')
    expect(dto.fun?.verdict ?? '').not.toContain('慢性病')

    // 有公开的可量化条件(身高)时: 总评只基于公开副本重算;
    // 归因是 leave-one-out(与出刀顺序无关), 不锁定点名谁, 只锁隐私边界:
    // 隐藏的吸烟条件对总评措辞零影响
    const withHeight = structuredClone(selection)
    withHeight.target.heightCm = { min: 180, max: null }
    const publicDto = buildShareDto(withHeight, computeModel(withHeight), createDefaultShareSettings(withHeight))
    expect(publicDto.fun?.verdict).toBeTruthy()
    expect(publicDto.fun?.verdict).not.toContain('吸烟')

    const heightOnly = structuredClone(withHeight)
    heightOnly.correlated.smoking = 'any'
    const heightOnlyDto = buildShareDto(heightOnly, computeModel(heightOnly), createDefaultShareSettings(heightOnly))
    expect(publicDto.fun?.verdict).toBe(heightOnlyDto.fun?.verdict)

    // 明确公开收入后: v4 收入已按宽口径包络计入综合层, 可以成为"淘汰最多的一刀";
    // 但不公开时仍然连链式影响都不进入(见下一条反例测试)
    const explicit: ShareSettings = {
      ...defaults,
      includedDimensionIds: [...defaults.includedDimensionIds, 'economy.income'],
      sensitiveConsentDimensionIds: ['economy.income'],
    }
    const explicitDto = buildShareDto(selection, result, explicit)
    expect(explicitDto.conditions)
      .toEqual(expect.arrayContaining([expect.objectContaining({ dimensionId: 'economy.income' })]))
    expect(explicitDto.fun?.verdict ?? '').not.toContain('吸烟')
  })

  it('recomputes the verdict on a public-only selection so hidden conditions cannot leak through the chain', () => {
    // Codex 反例: 公开"过去 12 个月未饮酒"不变(显式确认公开), 仅隐藏婚史不同,
    // 总评必须逐字一致 —— 隐藏条件连链式影响都不进入
    const base = structuredClone(DEFAULT_SELECTION)
    base.correlated.drinking = 'none'
    const withHiddenMarital = structuredClone(base)
    withHiddenMarital.target.maritalStatuses = ['divorced'] // 敏感, 默认不公开

    const settingsFor = (selection: typeof base): ShareSettings => {
      const settings = createDefaultShareSettings(selection)
      settings.includedDimensionIds = [...settings.includedDimensionIds, 'lifestyle.drinking']
      settings.sensitiveConsentDimensionIds = ['lifestyle.drinking']
      return settings
    }
    const dtoA = buildShareDto(base, computeModel(base), settingsFor(base))
    const dtoB = buildShareDto(withHiddenMarital, computeModel(withHiddenMarital), settingsFor(withHiddenMarital))
    expect(dtoA.fun?.verdict).toBeTruthy()
    expect(dtoB.fun?.verdict).toBe(dtoA.fun?.verdict)
    expect(dtoB.fun?.verdict).toContain('饮酒')
    // v4 强化: 不只总评, 整个人数块+趣味块都必须来自公开副本重算,
    // 隐藏婚史后所有数字逐位一致(差值反推不可能)
    expect(dtoB.population).toEqual(dtoA.population)
    expect(dtoB.fun).toEqual(dtoA.fun)
  })

  // 下溢/逻辑空集不派生趣味块的反例测试已迁至 share-underflow.test.ts:
  // v4 起 DTO 的一切数字都在「仅公开条件」副本上整体重算,
  // 注入 result 不再影响输出, 必须用模块级 mock 让公开副本本身下溢。

  it('never leaks the reciprocal-derived bidirectional score into any share output', () => {
    const selection = privateSelection() // 已填反向自评, 引擎侧派生分存在
    const result = computeModel(selection)
    expect(result.scoreDetails.reciprocalPreferencesProvided).toBe(true)

    const dto = buildShareDto(selection, result, createDefaultShareSettings(selection))
    expect(dto.scores).not.toHaveProperty('bidirectional')
    expect(JSON.stringify(dto)).not.toContain('bidirectional')
    expect(buildTextFallback(dto)).not.toContain('双向命中')
  })

  it('uses only nationwide generic people on the card when region is hidden', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.target.cities = ['北京']
    const result = computeModel(selection)
    const settings = { ...createDefaultShareSettings(selection), showRegion: false }

    const dto = buildShareDto(selection, result, settings)
    // 北京皮肤角色(胡同大爷/京剧名角)不得出现在幸存者报幕里
    expect(dto.fun?.survivor.name && ['胡同大爷', '京剧名角'].includes(dto.fun.survivor.name)).toBe(false)
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
