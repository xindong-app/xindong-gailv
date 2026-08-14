import { describe, expect, it } from 'vitest'
import { buildVerdict, fmtRarity, rarityTier } from '../../src/fun/rarity'

describe('fmtRarity 数值边界', () => {
  it('100% 是"遍地都是", 不是十里挑一', () => {
    expect(fmtRarity(1)).toContain('遍地都是')
    expect(fmtRarity(0.997)).toContain('遍地都是')
  })

  it('低比例端不再出现"概率约等于 0"这类把下溢当现实的说法', () => {
    expect(fmtRarity(0)).not.toContain('概率')
    expect(fmtRarity(1e-12)).toContain('数不出来')
  })

  it('中段阶梯连续', () => {
    expect(fmtRarity(0.5)).toContain('两三个里就有一个')
    expect(fmtRarity(0.2)).toContain('5 里挑一')
    expect(fmtRarity(0.01)).toContain('千分之 10.0')
  })
})

describe('rarityTier 分级', () => {
  it('100% 落 N 普通款', () => {
    expect(rarityTier(10_000).key).toBe('N')
  })
})

describe('buildVerdict 空帧', () => {
  it('没有可量化帧时整段省略', () => {
    expect(buildVerdict([])).toBeNull()
  })
})
