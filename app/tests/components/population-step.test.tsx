import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PopulationStep } from '../../src/features/steps/PopulationStep'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

function PopulationHarness({ onSnapshot }: { onSnapshot?: (selection: ModelSelection) => void }) {
  const [selection, setSelection] = useState(() => structuredClone(DEFAULT_SELECTION))
  const update = (next: ModelSelection) => {
    setSelection(next)
    onSnapshot?.(next)
  }
  return <PopulationStep selection={selection} onChange={update} onNext={() => undefined} />
}

describe('population step', () => {
  it('treats an explicitly cleared marital selection as unrestricted', () => {
    let latest = structuredClone(DEFAULT_SELECTION)
    render(<PopulationHarness onSnapshot={(selection) => { latest = selection }} />)

    fireEvent.click(screen.getByRole('button', { name: '未婚' }))
    expect(latest.target.maritalStatuses).toEqual(['never_married'])
    fireEvent.click(screen.getByRole('button', { name: '未婚' }))

    expect(latest.target.maritalStatuses).toEqual([])
    expect(screen.getByText(/当前为不限婚史/)).toBeTruthy()
  })

  it('keeps 全国 mutually exclusive with a city', () => {
    let latest = structuredClone(DEFAULT_SELECTION)
    render(<PopulationHarness onSnapshot={(selection) => { latest = selection }} />)

    fireEvent.click(screen.getByRole('button', { name: '北京' }))
    expect(latest.target.cities).toEqual(['北京'])

    fireEvent.click(screen.getByRole('button', { name: '全国' }))
    expect(latest.target.cities).toEqual(['全国'])
  })

  it('exposes labelled age sliders including the supported age-50 boundary', () => {
    let latest = structuredClone(DEFAULT_SELECTION)
    render(<PopulationHarness onSnapshot={(selection) => { latest = selection }} />)
    const maximum = screen.getByRole('slider', { name: '最高年龄' })

    fireEvent.change(maximum, { target: { value: '50' } })

    expect(latest.target.age.max).toBe(50)
    expect(maximum.getAttribute('aria-valuetext')).toBe('50 岁')
  })
})
