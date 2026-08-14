// 关系情境第二层卡 —— 本人统计性别自愿填写;
// 低可信宽情境: 不叫爱情概率、不叫相遇概率, 也不属于主人口结果。
import { useMemo } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { computeRelationshipScenarioFromModel } from '../engine/relationshipScenario'
import type { GenderId } from '../model/schema'
import { Chip, EvidenceBadge } from './ui'

const PAIRING_LABELS: Record<string, string> = {
  male_female: '男找女',
  female_male: '女找男',
  male_male: '男找男',
  female_female: '女找女',
}

const FACTOR_ORDER = ['orientationCompatibility', 'currentlySingle', 'relationshipWillingness'] as const

function percent(value: number): string {
  // 一位小数去尾零: 85 → "85%", 99.5 → "99.5%", 避免把 99.5% 圆成绝对的"100%"
  return `${Number((value * 100).toFixed(1))}%`
}

export function RelationshipScenarioCard({
  result,
  seekerGender,
  onSeekerGender,
}: {
  result: ModelResult
  seekerGender: GenderId | null
  onSeekerGender: (gender: GenderId | null) => void
}) {
  const targetGender = result.input.target.gender
  const scenario = useMemo(() => {
    if (!seekerGender) return null
    return computeRelationshipScenarioFromModel(result, { seekerGender, targetGender })
  }, [result, seekerGender, targetGender])

  return (
    <article className="relationship-card" aria-labelledby="relationship-title">
      <div>
        <span className="eyebrow">第二层 · 低可信宽情境</span>
        <h3 id="relationship-title">再叠三关：取向相容、当前单身、愿意交往</h3>
        <p>主人口只回答"有多少人满足条件"，不默认其中的人和你取向相容、正好单身、愿意开始一段关系。这一层把三个情境分别放宽给你看。</p>
      </div>

      <div className="relationship-seeker">
        <span>本人统计性别（自愿，不填也能玩）：</span>
        <div className="chip-row">
          <Chip active={seekerGender === 'male'} tone="lilac" onClick={() => onSeekerGender(seekerGender === 'male' ? null : 'male')}>我是男生</Chip>
          <Chip active={seekerGender === 'female'} tone="lilac" onClick={() => onSeekerGender(seekerGender === 'female' ? null : 'female')}>我是女生</Chip>
        </div>
        <small>目前只有男 / 女两类统计口径——这是数据能力限制，不是对其他性别身份的否定。</small>
      </div>

      {scenario && (
        <div className="relationship-result">
          <span className="class-badge">{PAIRING_LABELS[scenario.pairing]}</span>
          <div className="relationship-factors">
            {FACTOR_ORDER.map((id) => {
              const factor = scenario.factors[id]
              return (
                <section key={id} className="relationship-factor">
                  <div className="relationship-factor-head">
                    <b>{factor.label}</b>
                    {factor.status === 'scenario'
                      ? (factor.evidenceGrade === 'NA'
                        ? <span className="rel-grade" data-grade="NA">分析者情境 · NA</span>
                        : <EvidenceBadge grade={factor.evidenceGrade} />)
                      : <span className="rel-grade" data-grade="NA">{factor.status === 'not_estimated' ? '未估算' : '不可用'}</span>}
                  </div>
                  {factor.status === 'scenario'
                    ? <p>{percent(factor.range.lower)} – {percent(factor.range.upper)}<small>（参考 {percent(factor.range.reference)}）</small></p>
                    : <p>{factor.reason}</p>}
                </section>
              )
            })}
          </div>

          {scenario.combined.status === 'scenario' && scenario.combined.display ? (
            <div className="relationship-combined">
              <span>三关叠完后的宽情境范围</span>
              <b>{scenario.combined.display.reference}</b>
              <small>保守 {scenario.combined.display.lower} · 乐观 {scenario.combined.display.upper}</small>
            </div>
          ) : (
            <div className="relationship-combined" data-state="unavailable">
              <span>组合情境</span>
              <b>{scenario.combined.status === 'not_estimated' ? '未估算' : '不可用'}</b>
              <small>{scenario.combined.note}</small>
            </div>
          )}

          <p className="relationship-disclaimer">
            低可信宽情境 · 非官方人数 · 不属于主人口结果 · 不预测任何具体感情结果
          </p>
          <details className="relationship-sources">
            <summary>来源与局限（{scenario.sources.length} 条）</summary>
            <ul>
              {scenario.sources.map((source) => (
                <li key={source.id}><b>{source.title}</b><small>{source.publisher} · {source.year} · {source.applicablePopulation}</small></li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </article>
  )
}
