// 分享下溢/逻辑空集反例 —— v4 起 DTO 数字全部来自「仅公开条件」副本的整体重算,
// 注入 result 不再影响输出, 因此这里用模块级 mock 让公开副本本身进入对应状态。
import { describe, expect, it, vi } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION } from '../../src/model/schema'

vi.mock('../../src/engine/modelEngine', async (importActual) => {
  const actual = await importActual<typeof import('../../src/engine/modelEngine')>()
  return {
    ...actual,
    // 公开副本重算时返回被注入状态的结果
    tryComputeModel: (input: unknown, options?: unknown) => {
      const computed = actual.tryComputeModel(input, options)
      if (!computed.success) return computed
      const zeroMeaning = (globalThis as { __shareZeroMeaning?: string }).__shareZeroMeaning
      if (!zeroMeaning) return computed
      return {
        success: true as const,
        data: {
          ...computed.data,
          comprehensivePopulation: {
            ...computed.data.comprehensivePopulation,
            estimate: 0,
            range: { conservative: 0, baseline: 0, optimistic: 0 },
            zeroMeaning,
            resolutionExceeded: zeroMeaning === 'model_underflow',
          },
        },
      }
    },
  }
})

// mock 声明必须在导入被测模块之前
const { buildShareDto, buildTextFallback, createDefaultShareSettings } = await import('../../src/share')

function setZeroMeaning(value?: string) {
  ;(globalThis as { __shareZeroMeaning?: string }).__shareZeroMeaning = value
}

describe('share fun-block suppression on degenerate states', () => {
  it('derives no fun block at all when the public copy reports numeric underflow', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    const result = computeModel(selection)
    setZeroMeaning('model_underflow')
    try {
      const dto = buildShareDto(selection, result, createDefaultShareSettings(selection))
      // 下溢不是现实零人: 稀有度/幸存者/毒舌一个都不许派生
      expect(dto.fun).toBeUndefined()
      expect(buildTextFallback(dto)).not.toContain('全员下班')
      expect(buildTextFallback(dto)).not.toContain('片尾字幕')
    } finally {
      setZeroMeaning(undefined)
    }
  })

  it('derives no fun block at all when the public copy is a logical zero', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    const result = computeModel(selection)
    setZeroMeaning('logical_zero')
    try {
      const dto = buildShareDto(selection, result, createDefaultShareSettings(selection))
      // 逻辑空集是条件互相打架: 稀有度/幸存者/总评同样不派生
      expect(dto.fun).toBeUndefined()
      expect(buildTextFallback(dto)).not.toContain('全员下班')
    } finally {
      setZeroMeaning(undefined)
    }
  })
})
