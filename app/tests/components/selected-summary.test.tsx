import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SelectedSummary } from '../../src/components/SelectedSummary'

const CONDITIONS = [
  {
    dimensionId: 'lifestyle.cooking',
    label: '做饭习惯',
    classification: 'soft_preference' as const,
    sensitive: false,
    summary: '偏好',
  },
]

describe('selected condition summary', () => {
  it('exposes remove, undo, redo, and clear actions', () => {
    const onRemove = vi.fn()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const onClear = vi.fn()
    render(
      <SelectedSummary
        canRedo
        canUndo
        conditions={CONDITIONS}
        onClear={onClear}
        onRedo={onRedo}
        onRemove={onRemove}
        onUndo={onUndo}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '移除做饭习惯' }))
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    fireEvent.click(screen.getByRole('button', { name: '重做' }))
    fireEvent.click(screen.getByRole('button', { name: '清空' }))

    expect(onRemove).toHaveBeenCalledWith('lifestyle.cooking')
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onRedo).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('disables history actions when no matching snapshot exists', () => {
    render(
      <SelectedSummary
        canRedo={false}
        canUndo={false}
        conditions={[]}
        onClear={() => undefined}
        onRedo={() => undefined}
        onRemove={() => undefined}
        onUndo={() => undefined}
      />,
    )

    expect((screen.getByRole('button', { name: '撤销' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '重做' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
