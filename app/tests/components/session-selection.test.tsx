import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSafeSessionSelection, useSessionSelection } from '../../src/hooks/useSessionSelection'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

function SessionHarness({ selection, onReady }: { selection: ModelSelection; onReady?: (clear: (selectionToSkip?: ModelSelection) => void) => void }) {
  const clear = useSessionSelection(selection)
  useEffect(() => {
    onReady?.(clear)
  }, [clear, onReady])
  return null
}

describe('session draft privacy boundary', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('writes only the sanitized selection and restores that safe draft', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.target.maritalStatuses = ['divorced']
    selection.correlated.minAnnualIncomeWan = 80
    selection.correlated.healthCriteria = ['no_major_chronic']
    selection.softPreferenceIds = ['communication.conflict_repair']

    render(<SessionHarness selection={selection} />)
    act(() => vi.advanceTimersByTime(300))

    const restored = loadSafeSessionSelection(structuredClone(DEFAULT_SELECTION))
    expect(restored.target.maritalStatuses).toEqual([])
    expect(restored.correlated.minAnnualIncomeWan).toBeNull()
    expect(restored.correlated.healthCriteria).toEqual([])
    expect(restored.softPreferenceIds).toEqual(['communication.conflict_repair'])
  })

  it('falls back safely when the stored payload is invalid', () => {
    sessionStorage.setItem('heart-probability-lab:safe-draft:v2', '{not-json')
    const fallback = structuredClone(DEFAULT_SELECTION)
    fallback.target.gender = 'female'
    expect(loadSafeSessionSelection(fallback)).toEqual(fallback)
  })

  it('sanitizes a schema-valid but sensitive payload before restoring it', () => {
    const injected = structuredClone(DEFAULT_SELECTION)
    injected.target.maritalStatuses = ['divorced']
    injected.correlated.minAnnualIncomeWan = 99
    injected.correlated.minHouseholdWealthWan = 999
    injected.correlated.smoking = 'non_smoker'
    injected.correlated.healthCriteria = ['no_major_chronic']
    injected.selfPreferenceIds = ['relationship.orientation_compatible']
    sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(injected))

    const restored = loadSafeSessionSelection(DEFAULT_SELECTION)
    expect(restored.target.maritalStatuses).toEqual([])
    expect(restored.correlated.minAnnualIncomeWan).toBeNull()
    expect(restored.correlated.minHouseholdWealthWan).toBeNull()
    expect(restored.correlated.smoking).toBe('any')
    expect(restored.correlated.healthCriteria).toEqual([])
    expect(restored.selfPreferenceIds).toEqual([])
  })

  it('migrates retired divorce child splits before sanitizing an old draft', () => {
    const legacy = structuredClone(DEFAULT_SELECTION) as unknown as {
      target: { maritalStatuses: string[] }
      softPreferenceIds: string[]
    }
    legacy.target.maritalStatuses = ['divorced_no_children', 'divorced_with_children']
    legacy.softPreferenceIds = ['communication.conflict_repair']
    sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(legacy))

    const restored = loadSafeSessionSelection(DEFAULT_SELECTION)
    // The payload remains loadable, but privacy policy still strips marriage.
    expect(restored.target.maritalStatuses).toEqual([])
    expect(restored.softPreferenceIds).toEqual(['communication.conflict_repair'])
  })

  it('cancels a pending write when the user clears the session', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.softPreferenceIds = ['communication.conflict_repair']
    let clear = () => undefined
    render(<SessionHarness selection={selection} onReady={(callback) => { clear = callback }} />)

    act(() => clear())
    act(() => vi.advanceTimersByTime(500))

    expect(sessionStorage.getItem('heart-probability-lab:safe-draft:v2')).toBeNull()
  })

  it('skips only the clear-all reset value and persists the next user change', () => {
    let clear: (selectionToSkip?: ModelSelection) => void = () => undefined
    const onReady = (callback: (selectionToSkip?: ModelSelection) => void) => { clear = callback }
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.softPreferenceIds = ['communication.conflict_repair']
    const view = render(<SessionHarness selection={selection} onReady={onReady} />)

    act(() => clear(DEFAULT_SELECTION))
    view.rerender(<SessionHarness selection={structuredClone(DEFAULT_SELECTION)} onReady={onReady} />)
    act(() => vi.advanceTimersByTime(500))
    expect(sessionStorage.getItem('heart-probability-lab:safe-draft:v2')).toBeNull()

    const next = structuredClone(DEFAULT_SELECTION)
    next.target.gender = 'female'
    view.rerender(<SessionHarness selection={next} onReady={onReady} />)
    act(() => vi.advanceTimersByTime(300))
    expect(loadSafeSessionSelection(DEFAULT_SELECTION).target.gender).toBe('female')
  })

  it('does not swallow the first user change when clear-all starts from the default value', () => {
    let clear: (selectionToSkip?: ModelSelection) => void = () => undefined
    const onReady = (callback: (selectionToSkip?: ModelSelection) => void) => { clear = callback }
    const view = render(<SessionHarness selection={DEFAULT_SELECTION} onReady={onReady} />)

    act(() => clear(DEFAULT_SELECTION))
    view.rerender(<SessionHarness selection={DEFAULT_SELECTION} onReady={onReady} />)
    act(() => vi.advanceTimersByTime(500))
    expect(sessionStorage.getItem('heart-probability-lab:safe-draft:v2')).toBeNull()

    const next = structuredClone(DEFAULT_SELECTION)
    next.target.gender = 'female'
    view.rerender(<SessionHarness selection={next} onReady={onReady} />)
    act(() => vi.advanceTimersByTime(300))
    expect(loadSafeSessionSelection(DEFAULT_SELECTION).target.gender).toBe('female')
  })
})
