import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Chip, Dialog, EvidenceStatusBadge } from '../../src/components/ui'

function ChipHarness() {
  const [active, setActive] = useState(false)
  return <Chip active={active} onClick={() => setActive((value) => !value)}>冲突修复</Chip>
}

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开说明</button>
      <Dialog
        description="不会上传筛选"
        open={open}
        title="隐私说明"
        onClose={() => setOpen(false)}
      >
        <button type="button">保留</button>
        <button type="button">确认</button>
      </Dialog>
    </>
  )
}

describe('shared accessible controls', () => {
  it('exposes toggle state with aria-pressed', () => {
    render(<ChipHarness />)
    const chip = screen.getByRole('button', { name: '冲突修复' })

    expect(chip.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })

  it('names disabled chips and blocks interaction', () => {
    const onClick = vi.fn()
    render(<Chip active={false} disabled onClick={onClick}>暂不可用</Chip>)
    const chip = screen.getByRole('button', { name: '暂不可用' }) as HTMLButtonElement

    expect(chip.disabled).toBe(true)
    fireEvent.click(chip)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('labels missing population evidence honestly instead of turning it into evidence D', () => {
    render(<EvidenceStatusBadge grade="NA" />)
    const badge = screen.getByText('不进人口')
    expect(badge.getAttribute('title')).toContain('无可运行人口数据')
    expect(badge.textContent).not.toContain('证据 D')
  })

  it('moves focus into a dialog, closes with Escape, and restores focus', async () => {
    render(<DialogHarness />)
    const opener = screen.getByRole('button', { name: '打开说明' })
    opener.focus()
    fireEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: '隐私说明' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭对话框' })))

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab focus inside the open dialog', async () => {
    render(<DialogHarness />)
    fireEvent.click(screen.getByRole('button', { name: '打开说明' }))
    const close = screen.getByRole('button', { name: '关闭对话框' })
    const last = screen.getByRole('button', { name: '确认' })
    await waitFor(() => expect(document.activeElement).toBe(close))

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
