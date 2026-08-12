import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultSummary } from '../../src/components/ResultSummary'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION } from '../../src/model/schema'

describe('result summary', () => {
  it('separates the population range from soft and entertainment scores', () => {
    const result = computeModel(DEFAULT_SELECTION)
    render(<ResultSummary result={result} />)

    expect(screen.getByText('保守')).toBeTruthy()
    expect(screen.getByText('基准')).toBeTruthy()
    expect(screen.getByText('乐观')).toBeTruthy()
    expect(screen.getByText('软偏好契合')).toBeTruthy()
    expect(screen.getByText('娱乐指数')).toBeTruthy()
    expect(screen.getByText(`模型 ${result.versions.modelVersion} · 数据 ${result.versions.dataVersion}`)).toBeTruthy()
    expect(screen.getByText(/基础范围/)).toBeTruthy()
    expect(screen.getByText('模型可信 A').getAttribute('title')).not.toContain('权威直接数据')
    expect(screen.getByLabelText(result.population.display).getAttribute('aria-live')).toBe('polite')
  })

  it('explains that a below-resolution estimate is not nonexistence', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.target.heightCm = { min: 210, max: 220 }
    selection.correlated.minAnnualIncomeWan = 10_000
    selection.correlated.minHouseholdWealthWan = 1_000_000

    const result = computeModel(selection)
    expect(result.population.resolutionExceeded).toBe(true)
    render(<ResultSummary result={result} />)

    expect(screen.getByText(/不是宇宙没货/)).toBeTruthy()
    expect(screen.getByText(/不等于绝对不存在/)).toBeTruthy()
  })
})
