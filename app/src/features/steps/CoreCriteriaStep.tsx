import { useState } from 'react'
import type { EducationId, ModelSelection, SchoolTierId } from '../../model/schema'
import { toggleArrayValue } from '../../model/selectionUtils'
import { Chip, EvidenceBadge, FieldHelp } from '../../components/ui'

const EDUCATION_OPTIONS: Array<{ id: EducationId; label: string }> = [
  { id: 'junior_college', label: '大专' }, { id: 'bachelor', label: '本科' },
  { id: 'master', label: '硕士' }, { id: 'doctorate', label: '博士' },
]
const SCHOOL_OPTIONS: Array<{ id: SchoolTierId; label: string }> = [
  { id: '211', label: '211' }, { id: '985', label: '985' }, { id: 'c9', label: 'C9' }, { id: 'top2', label: '清北' },
]

function ValidatedNumberField({
  describedBy,
  errorId,
  errorMessage,
  id,
  max,
  value,
  onCommit,
}: {
  describedBy: string
  errorId: string
  errorMessage: string
  id: string
  max: number
  value: number | null
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(value?.toString() ?? '')
  const numeric = draft === '' ? null : Number(draft)
  const invalid = numeric != null && (!Number.isFinite(numeric) || numeric < 0 || numeric > max)
  const commit = () => {
    if (!invalid) onCommit(numeric)
  }

  return (
    <div>
      <input
        aria-describedby={invalid ? errorId : describedBy}
        aria-invalid={invalid}
        id={id}
        inputMode="decimal"
        max={max}
        min="0"
        placeholder="不限"
        type="number"
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      {invalid && <p className="field-error" id={errorId} role="alert">{errorMessage}</p>}
      <span className="visually-hidden" id={describedBy}>留空表示不限；离开输入框后应用有效数值</span>
    </div>
  )
}

export function CoreCriteriaStep({ selection, onChange, onNext }: {
  selection: ModelSelection
  onChange: (next: ModelSelection) => void
  onNext: () => void
}) {
  const update = (mutate: (draft: ModelSelection) => void) => {
    const draft = structuredClone(selection)
    mutate(draft)
    onChange(draft)
  }
  const heightEnabled = selection.target.heightCm != null

  return (
    <section className="step-panel" aria-labelledby="core-title">
      <div className="step-heading">
        <span className="eyebrow">第二关 · 硬核条件</span>
        <h2 id="core-title" tabIndex={-1}>把最在意的硬门槛放这里</h2>
        <p>黄色卡是相关硬条件：会影响人数，但模型会在经济与教育组内联合处理，不逐项无脑连乘。体型、烟酒、健康与房车等敏感项放在下一步主动展开。</p>
      </div>
      <div className="criteria-grid">
        <article className="criteria-card" data-kind="hard">
          <div className="criteria-card-head"><div><span className="class-badge">硬筛选</span><h3>身高范围</h3></div><EvidenceBadge grade="C" /></div>
          <div className="chip-row"><Chip active={!heightEnabled} onClick={() => update((draft) => { draft.target.heightCm = null })}>不限</Chip><Chip active={heightEnabled} tone="sky" onClick={() => update((draft) => { draft.target.heightCm = { min: draft.target.gender === 'male' ? 170 : 158, max: null } })}>设置范围</Chip></div>
          {selection.target.heightCm && <div className="range-fields single-column">
            <label>最低身高 <output>{selection.target.heightCm.min ?? 130} cm</output><input min={130} max={210} type="range" value={selection.target.heightCm.min ?? 130} onChange={(event) => update((draft) => { if (draft.target.heightCm) draft.target.heightCm.min = Number(event.target.value) })} /></label>
            <label>最高身高 <output>{selection.target.heightCm.max ?? '不限'}</output><input min={selection.target.heightCm.min ?? 130} max={220} type="range" value={selection.target.heightCm.max ?? 220} onChange={(event) => update((draft) => { if (draft.target.heightCm) draft.target.heightCm.max = Number(event.target.value) === 220 ? null : Number(event.target.value) })} /></label>
          </div>}
        </article>

        <article className="criteria-card criteria-wide" data-kind="correlated">
          <div className="criteria-card-head"><div><span className="class-badge">相关硬条件 ＋ 软偏好</span><h3>学历与院校偏好</h3></div><EvidenceBadge grade="C" /></div>
          <div className="chip-row">{EDUCATION_OPTIONS.map((option) => <Chip key={option.id} active={selection.correlated.educationLevels.includes(option.id)} tone="sun" onClick={() => update((draft) => { draft.correlated.educationLevels = toggleArrayValue(draft.correlated.educationLevels, option.id) })}>{option.label}</Chip>)}</div>
          <div className="chip-row nested-row"><span>院校层级</span>{SCHOOL_OPTIONS.map((option) => <Chip key={option.id} active={selection.correlated.schoolTier === option.id} tone="sun" onClick={() => update((draft) => { draft.correlated.schoolTier = draft.correlated.schoolTier === option.id ? null : option.id })}>{option.label}</Chip>)}</div>
          <FieldHelp>学历进入相关模型；院校层级缺少同口径存量数据，仅作为软偏好，不再砍人口。清北 ⊂ C9 ⊂ 985 ⊂ 211。</FieldHelp>
        </article>

        <article className="criteria-card" data-kind="correlated">
          <div className="criteria-card-head"><div><span className="class-badge">相关硬条件</span><h3>收入与资产</h3></div><EvidenceBadge grade="C" /></div>
          <div className="number-fields">
            <label htmlFor="income-min">最低税前年收入（万元）</label>
            <ValidatedNumberField
              key={`income-${selection.correlated.minAnnualIncomeWan ?? 'none'}`}
              describedBy="income-help"
              errorId="income-error"
              errorMessage="请输入 0–10000 万元之间的数值。"
              id="income-min"
              max={10_000}
              value={selection.correlated.minAnnualIncomeWan}
              onCommit={(value) => update((draft) => { draft.correlated.minAnnualIncomeWan = value })}
            />
            <label htmlFor="wealth-min">最低家庭资产（万元）</label>
            <ValidatedNumberField
              key={`wealth-${selection.correlated.minHouseholdWealthWan ?? 'none'}`}
              describedBy="wealth-help"
              errorId="wealth-error"
              errorMessage="请输入 0–1000000 万元之间的数值。"
              id="wealth-min"
              max={1_000_000}
              value={selection.correlated.minHouseholdWealthWan}
              onCommit={(value) => update((draft) => { draft.correlated.minHouseholdWealthWan = value })}
            />
          </div>
          <FieldHelp>两者使用相关联合尾部估算；高收入、高资产、有房和学历不会各砍一刀再相乘。</FieldHelp>
        </article>

      </div>
      <div className="step-actions"><button className="button button-primary" type="button" onClick={onNext}>下一关：维度寻宝 →</button></div>
    </section>
  )
}
