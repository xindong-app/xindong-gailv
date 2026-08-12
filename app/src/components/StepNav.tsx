export interface StepDefinition {
  id: string
  label: string
  shortLabel: string
  description: string
}

export function StepNav({
  steps,
  current,
  onChange,
}: {
  steps: readonly StepDefinition[]
  current: number
  onChange: (index: number) => void
}) {
  return (
    <nav aria-label="分析步骤" className="step-nav">
      <div className="step-nav-inner">
        <div className="step-progress" aria-hidden="true">
          <span style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
        </div>
        <ol>
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                aria-current={index === current ? 'step' : undefined}
                aria-label={`第 ${index + 1} 步，共 ${steps.length} 步：${step.label}`}
                className="step-button"
                data-complete={index < current}
                type="button"
                onClick={() => onChange(index)}
              >
                <span className="step-number">{index < current ? '✓' : index + 1}</span>
                <span className="step-label-full">{step.label}</span>
                <span className="step-label-short">{step.shortLabel}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
