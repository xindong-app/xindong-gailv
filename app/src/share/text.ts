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
  if (dto.scores.entertainment != null && dto.scores.entertainment > 0) {
    lines.push(`娱乐指数：${dto.scores.entertainment} / 100`)
  }
  if (dto.conditions && dto.conditions.length > 0) {
    lines.push('公开条件：')
    for (const condition of dto.conditions) lines.push(`- ${condition.label}：${condition.summary}`)
  }
  lines.push(`模型 ${dto.versions.modelVersion} · 数据 ${dto.versions.dataVersion} · 模型可信度 ${dto.confidenceGrade}`)
  lines.push(dto.notice)
  return lines.join('\n')
}
