// v4 分享一致性反例 —— 隐藏敏感条件后, 分享输出必须与"从未选过"逐位一致;
// 幸存者数量永远钳制在 0–80; 总评归因与条件点选顺序无关。
import { describe, expect, it } from 'vitest'
import { computeComprehensiveConditionAnalysis, computeModel } from '../../src/engine/modelEngine'
import { buildVerdict } from '../../src/fun/rarity'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'
import { buildShareDto, createDefaultShareSettings } from '../../src/share'

function baseSelection(): ModelSelection {
  return structuredClone(DEFAULT_SELECTION)
}

describe('分享一致性(v4 公开副本整体重算)', () => {
  it('隐藏收入后, 分享数字与从未选过收入逐位一致', () => {
    const withIncome = baseSelection()
    withIncome.correlated.minAnnualIncomeWan = 500 // 敏感, 默认不公开
    const without = baseSelection()

    const dtoA = buildShareDto(withIncome, computeModel(withIncome), createDefaultShareSettings(withIncome))
    const dtoB = buildShareDto(without, computeModel(without), createDefaultShareSettings(without))
    expect(dtoA.population).toEqual(dtoB.population)
    expect(dtoA.fun).toEqual(dtoB.fun)
  })

  it('隐藏取向条件后, 分享数字与从未选过逐位一致', () => {
    const withOrientation = baseSelection()
    withOrientation.softPreferenceIds = ['relationship.orientation_compatible'] // 敏感, 默认不公开
    const without = baseSelection()

    const dtoA = buildShareDto(
      withOrientation,
      computeModel(withOrientation, { seekerGender: 'female' }),
      createDefaultShareSettings(withOrientation),
    )
    const dtoB = buildShareDto(without, computeModel(without, { seekerGender: 'female' }), createDefaultShareSettings(without))
    expect(dtoA.population).toEqual(dtoB.population)
    expect(dtoA.fun).toEqual(dtoB.fun)
  })

  it('幸存者数量在任何场景下都保持 0–80', () => {
    const scenarios: ModelSelection[] = [
      baseSelection(),
      (() => { const s = baseSelection(); s.correlated.minAnnualIncomeWan = 30; return s })(),
      (() => {
        const s = baseSelection()
        s.target.heightCm = { min: 210, max: 220 }
        s.correlated.minAnnualIncomeWan = 10_000
        s.correlated.minHouseholdWealthWan = 1_000_000
        return s
      })(),
    ]
    for (const selection of scenarios) {
      const dto = buildShareDto(selection, computeModel(selection), createDefaultShareSettings(selection))
      if (dto.fun) {
        expect(dto.fun.survivors).toBeGreaterThanOrEqual(0)
        expect(dto.fun.survivors).toBeLessThanOrEqual(80)
      }
    }
  })

  it('相同条件换点选顺序, 毒舌总评逐字一致(leave-one-out 与顺序无关)', () => {
    const a = baseSelection()
    a.softPreferenceIds = ['lifestyle.cooking', 'lifestyle.exercise', 'communication.conflict_repair']
    const b = baseSelection()
    b.softPreferenceIds = ['communication.conflict_repair', 'lifestyle.exercise', 'lifestyle.cooking']

    const verdictA = buildVerdict(computeComprehensiveConditionAnalysis(computeModel(a)).impacts)
    const verdictB = buildVerdict(computeComprehensiveConditionAnalysis(computeModel(b)).impacts)
    expect(verdictA).toBeTruthy()
    expect(verdictB).toBe(verdictA)
  })
})
