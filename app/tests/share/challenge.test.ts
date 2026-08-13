import { describe, expect, it } from 'vitest'
import { buildChallengeText, CHALLENGE_URL, copyChallenge } from '../../src/share'

describe('反向挑战书', () => {
  it('contains the permanent entry and no user data placeholders', () => {
    const text = buildChallengeText()
    expect(text).toContain(CHALLENGE_URL)
    expect(text).toContain('🆚')
    // 固定文案: 不应出现任何需要注入数据的插值残留
    expect(text).not.toMatch(/\$\{|undefined|null/)
  })

  it('copyChallenge resolves a boolean even when clipboard APIs are unavailable', async () => {
    await expect(copyChallenge()).resolves.toBe(false)
  })
})
