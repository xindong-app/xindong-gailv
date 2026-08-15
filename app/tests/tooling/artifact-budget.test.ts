import { describe, expect, it } from 'vitest'
import {
  CSS_GZIP_BUDGET_KIB,
  JS_GZIP_BUDGET_KIB,
  exceedsGzipBudget,
} from '../../scripts/artifact-budgets'

describe('production artifact gzip budgets', () => {
  it('keeps the batch-2 JavaScript budget at a hard 166 KiB boundary', () => {
    expect(JS_GZIP_BUDGET_KIB).toBe(166)
    expect(exceedsGzipBudget(166 * 1024, JS_GZIP_BUDGET_KIB)).toBe(false)
    expect(exceedsGzipBudget(166 * 1024 + 1, JS_GZIP_BUDGET_KIB)).toBe(true)
  })

  it('keeps the stylesheet budget unchanged at 25 KiB', () => {
    expect(CSS_GZIP_BUDGET_KIB).toBe(25)
    expect(exceedsGzipBudget(25 * 1024, CSS_GZIP_BUDGET_KIB)).toBe(false)
    expect(exceedsGzipBudget(25 * 1024 + 1, CSS_GZIP_BUDGET_KIB)).toBe(true)
  })
})
