import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CoreCriteriaStep } from '../../src/features/steps/CoreCriteriaStep'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

function CoreHarness({ onSnapshot }: { onSnapshot?: (selection: ModelSelection) => void }) {
  const [selection, setSelection] = useState(() => structuredClone(DEFAULT_SELECTION))
  const update = (next: ModelSelection) => {
    setSelection(next)
    onSnapshot?.(next)
  }
  return <CoreCriteriaStep selection={selection} onChange={update} onNext={() => undefined} />
}

describe('core criteria validation', () => {
  it('associates an out-of-range income error and preserves the last valid model value', () => {
    let latest = structuredClone(DEFAULT_SELECTION)
    render(<CoreHarness onSnapshot={(selection) => { latest = selection }} />)
    const input = screen.getByLabelText('最低税前年收入（万元）')

    fireEvent.change(input, { target: { value: '10001' } })

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('income-error')
    expect(screen.getByRole('alert').textContent).toContain('0–10000')
    expect(latest.correlated.minAnnualIncomeWan).toBeNull()
  })

  it('commits a valid value and clears the invalid state', () => {
    let latest = structuredClone(DEFAULT_SELECTION)
    render(<CoreHarness onSnapshot={(selection) => { latest = selection }} />)
    const input = screen.getByLabelText('最低家庭资产（万元）')

    fireEvent.change(input, { target: { value: '300' } })
    fireEvent.blur(input)

    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(latest.correlated.minHouseholdWealthWan).toBe(300)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
