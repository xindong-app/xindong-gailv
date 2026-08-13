import type { ShareDto } from './types'

export function buildTextFallback(dto: ShareDto): string {
  const lines = [
    dto.title,
    [dto.audience.genderLabel, dto.audience.ageRange, dto.region].filter(Boolean).join(' · '),
  ]
  if (dto.population) {
    lines.push(`满足硬条件的估算人群：${dto.population.estimateLabel}`)
    lines.push(`敏感度范围：${dto.population.rangeLabel}`)
  }
  if (dto.fun) {
    lines.push(`稀有度：${dto.fun.tierLabel}（${dto.fun.rarityText}）—— ${dto.fun.tierComment}`)
    lines.push(
      dto.fun.survivors > 0
        ? `小人剧场还剩 ${dto.fun.survivors}/80 · 最后下班的是「${dto.fun.survivor.name}」${dto.fun.survivor.emoji}`
        : '小人剧场全员下班, 一个没剩',
    )
    if (dto.fun.verdict) lines.push(`毒舌总评：${dto.fun.verdict}`)
  }
  if (dto.scores.entertainment != null && dto.scores.entertainment > 0) {
    lines.push(`娱乐指数：${dto.scores.entertainment} / 100`)
  }
  if (dto.scores.bidirectional != null) {
    lines.push(`双向命中示意：${dto.scores.bidirectional} / 100（示意，非预测）`)
  }
  if (dto.conditions && dto.conditions.length > 0) {
    lines.push('公开条件：')
    for (const condition of dto.conditions) lines.push(`- ${condition.label}：${condition.summary}`)
  }
  lines.push(`模型 ${dto.versions.modelVersion} · 数据 ${dto.versions.dataVersion} · 模型可信度 ${dto.confidenceGrade}`)
  lines.push(dto.notice)
  lines.push('自己算一卦 → https://xindong-gailv.vercel.app')
  return lines.join('\n')
}
