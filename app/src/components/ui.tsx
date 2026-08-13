import { useEffect, useId, useRef, type ReactNode } from 'react'
import { playPop } from '../fun/sound'

export function Chip({
  active,
  children,
  onClick,
  disabled = false,
  tone = 'neutral',
  ariaLabel,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'pink' | 'sky' | 'mint' | 'sun' | 'lilac' | 'peach'
  ariaLabel?: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      className="chip"
      data-tone={tone}
      disabled={disabled}
      type="button"
      onClick={() => {
        playPop()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

export function EvidenceBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' }) {
  const descriptions = {
    A: 'A 级：相同口径的官方或权威直接数据',
    B: 'B 级：权威数据的透明转换',
    C: 'C 级：多个相关来源交叉推算',
    D: 'D 级：弱证据或娱乐假设，不进入人口估算',
  }
  return (
    <abbr className="evidence-badge" data-grade={grade} title={descriptions[grade]}>
      证据 {grade}
    </abbr>
  )
}

export function EvidenceStatusBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' | 'NA' }) {
  if (grade === 'NA') {
    return (
      <abbr className="evidence-badge" data-grade="NA" title="无可运行人口数据：该项只作为偏好，不进入人口估算">
        不进人口
      </abbr>
    )
  }
  return <EvidenceBadge grade={grade} />
}

export function ModelConfidenceBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' | 'NA' }) {
  const descriptions = {
    A: '模型可信度 A：方法评分较高，且未启用较低等级的人口模型组',
    B: '模型可信度 B：存在中等方法不确定性，需要结合范围解释',
    C: '模型可信度 C：包含分布、缩放或相关性假设，只适合范围参考',
    D: '模型可信度 D：不确定性较高，只适合探索性参考',
    NA: '模型可信度暂不可评估',
  }
  return (
    <abbr className="confidence-badge" data-grade={grade} title={descriptions[grade]}>
      模型可信 {grade}
    </abbr>
  )
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  id,
}: {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  id?: string
}) {
  const generatedId = useId()
  const titleId = `${id ?? generatedId}-title`
  const descriptionId = `${id ?? generatedId}-description`
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <section
        ref={dialogRef}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog"
        id={id}
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button ref={closeRef} aria-label="关闭对话框" className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export interface ToastMessage {
  id: number
  kind: 'success' | 'error' | 'info'
  text: string
}

export function ToastRegion({ messages, onDismiss }: { messages: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div aria-atomic="false" aria-live="polite" className="toast-region">
      {messages.map((message) => (
        <div className="toast" data-state={message.kind} key={message.id} role={message.kind === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button aria-label="关闭提示" type="button" onClick={() => onDismiss(message.id)}>×</button>
        </div>
      ))}
    </div>
  )
}

export function FieldHelp({ children }: { children: ReactNode }) {
  return <p className="field-help">{children}</p>
}
