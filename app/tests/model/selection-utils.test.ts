import { describe, expect, it } from 'vitest'
import { sanitizeForSession } from '../../src/model/selectionUtils'
import { DEFAULT_SELECTION } from '../../src/model/schema'

describe('safe session selection', () => {
  it('never persists marital status or other sensitive filters, including sensitive defaults', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.target.maritalStatuses = ['divorced']
    selection.correlated.smoking = 'non_smoker'
    selection.correlated.minAnnualIncomeWan = 80
    selection.correlated.healthCriteria = ['no_major_chronic']

    const safe = sanitizeForSession(selection)

    expect(safe.target.maritalStatuses).toEqual([])
    expect(safe.correlated.smoking).toBe('any')
    expect(safe.correlated.minAnnualIncomeWan).toBeNull()
    expect(safe.correlated.healthCriteria).toEqual([])
  })
})
