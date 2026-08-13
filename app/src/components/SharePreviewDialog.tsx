import { useMemo, useState } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import type { ModelSelection } from '../model/schema'
import {
  buildShareDto,
  buildTextFallback,
  createDefaultShareSettings,
  downloadShareBlob,
  listShareFieldCandidates,
  renderShareCard,
  ShareCardError,
  type ShareSettings,
} from '../share'
import { toggleArrayValue } from '../model/selectionUtils'
import { Dialog } from './ui'

export function SharePreviewDialog({
  open,
  selection,
  result,
  onClose,
  onNotify,
}: {
  open: boolean
  selection: ModelSelection
  result: ModelResult
  onClose: () => void
  onNotify: (kind: 'success' | 'error' | 'info', text: string) => void
}) {
  const defaults = useMemo(() => createDefaultShareSettings(selection), [selection])
  const candidates = useMemo(() => listShareFieldCandidates(selection), [selection])
  const [settings, setSettings] = useState<ShareSettings>(defaults)
  const [generating, setGenerating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const dto = useMemo(() => buildShareDto(selection, result, settings), [result, selection, settings])
  const text = useMemo(() => buildTextFallback(dto), [dto])
  const includedCandidates = candidates.filter((candidate) => settings.includedDimensionIds.includes(candidate.dimensionId))

  const patch = (values: Partial<ShareSettings>) => setSettings((current) => ({ ...current, ...values }))
  const toggleCandidate = (dimensionId: string) => {
    setSettings((current) => ({
      ...current,
      includedDimensionIds: toggleArrayValue(current.includedDimensionIds, dimensionId),
      sensitiveConsentDimensionIds: current.includedDimensionIds.includes(dimensionId)
        ? current.sensitiveConsentDimensionIds.filter((id) => id !== dimensionId)
        : current.sensitiveConsentDimensionIds,
    }))
  }
  const toggleSensitiveConsent = (dimensionId: string) => {
    setSettings((current) => ({
      ...current,
      sensitiveConsentDimensionIds: toggleArrayValue(current.sensitiveConsentDimensionIds, dimensionId),
    }))
  }

  const copyText = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setLastError(null)
      onNotify('success', '文字版战报已复制；内容与当前白名单预览一致。')
    } catch {
      setLastError('浏览器未允许自动复制。请在下方文字框中手动全选复制。')
      onNotify('error', '自动复制失败，已保留可手动复制的文字版。')
    }
  }

  const download = async () => {
    setGenerating(true)
    setLastError(null)
    try {
      const blob = await renderShareCard(dto)
      downloadShareBlob(blob)
      onNotify('success', '战报已在本地生成并开始下载。')
    } catch (error) {
      const message = error instanceof ShareCardError
        ? `${error.message}（${error.code}）`
        : '图片生成失败，请重试或复制文字版战报。'
      setLastError(message)
      onNotify('error', message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} title="分享前隐私预览" description="只有这里明确开启的字段才会进入图片或文字；敏感项需要再确认一次。" onClose={onClose}>
      <div className="share-dialog-layout">
        <section className="share-controls" aria-labelledby="share-controls-title">
          <h3 id="share-controls-title">公开内容</h3>
          <div className="switch-list">
            <label><input checked={settings.showCount} type="checkbox" onChange={(event) => patch({ showCount: event.target.checked })} /><span><b>估算人数与范围</b><small>关闭后图片不出现人数</small></span></label>
            <label><input checked={settings.showRegion} type="checkbox" onChange={(event) => patch({ showRegion: event.target.checked })} /><span><b>地区</b><small>可独立隐藏；关闭后条件列表也会剔除地区</small></span></label>
            <label><input checked={settings.showAge} type="checkbox" onChange={(event) => patch({ showAge: event.target.checked })} /><span><b>年龄范围</b><small>可独立隐藏；目标性别保留为统计口径</small></span></label>
            <label><input checked={settings.showConditions} type="checkbox" onChange={(event) => patch({ showConditions: event.target.checked })} /><span><b>条件列表</b><small>再逐项选择公开条件</small></span></label>
            <label><input checked={settings.showEntertainment} type="checkbox" onChange={(event) => patch({ showEntertainment: event.target.checked })} /><span><b>娱乐指数</b><small>可独立隐藏，不影响人口</small></span></label>
          </div>
          {settings.showConditions && (
            <div className="share-field-list">
              {candidates.map((candidate) => {
                const included = settings.includedDimensionIds.includes(candidate.dimensionId)
                const consented = settings.sensitiveConsentDimensionIds.includes(candidate.dimensionId)
                return (
                  <div className="share-field" data-sensitive={candidate.sensitive} key={candidate.dimensionId}>
                    <label>
                      <input checked={included} type="checkbox" onChange={() => toggleCandidate(candidate.dimensionId)} />
                      <span><b>{candidate.label}</b><small>{candidate.summary}{candidate.sensitive ? ' · 敏感' : ''}</small></span>
                    </label>
                    {candidate.sensitive && included && (
                      <label className="consent-check">
                        <input checked={consented} type="checkbox" onChange={() => toggleSensitiveConsent(candidate.dimensionId)} />
                        <span>我确认公开这一敏感字段</span>
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="share-preview-title" className="share-preview-panel">
          <h3 id="share-preview-title">最终会公开</h3>
          <div className="share-mini-poster">
            <span className="eyebrow">择偶条件分析战报</span>
            <h4>{[dto.audience.genderLabel, dto.audience.ageRange].filter(Boolean).join(' · ')}</h4>
            {dto.region && <p>{dto.region}</p>}
            {dto.population && <strong>{dto.population.estimateLabel}</strong>}
            {dto.fun && (
              <div className="share-mini-fun">
                <span className="share-mini-stamp" style={{ background: dto.fun.tierBg, color: dto.fun.tierFg }}>
                  {dto.fun.tierLabel} · {dto.fun.rarityText}
                </span>
                <p>
                  {dto.fun.survivors > 0
                    ? `小人剧场还剩 ${dto.fun.survivors}/80 · 最后下班的是「${dto.fun.survivor.name}」${dto.fun.survivor.emoji}`
                    : '小人剧场全员下班, 一个没剩 🫠'}
                </p>
                {dto.fun.verdict && <p className="share-mini-verdict">🌶️ {dto.fun.verdict}</p>}
              </div>
            )}
            {dto.scores.entertainment != null && <div><span>娱乐 {dto.scores.entertainment}/100</span></div>}
            {dto.scores.bidirectional != null && <div><span>双向命中示意 {dto.scores.bidirectional}/100（非预测）</span></div>}
            {dto.conditions && dto.conditions.length > 0 && <ul>{dto.conditions.slice(0, 6).map((condition) => <li key={condition.dimensionId}>{condition.label}：{condition.summary}</li>)}</ul>}
            <footer>模型 {dto.versions.modelVersion} · 数据 {dto.versions.dataVersion}<br />{dto.notice}</footer>
          </div>
          <p className="share-count-note">已勾选 {includedCandidates.length} 项；实际公开 {dto.conditions?.length ?? 0} 项。未二次确认的敏感项不会进入输出。</p>
          {lastError && <div className="inline-error" role="alert"><b>本次操作未完成</b><p>{lastError}</p><button className="text-button" type="button" onClick={download}>重试生成图片</button></div>}
          <div className="share-dialog-actions">
            <button className="button button-primary" disabled={generating} type="button" onClick={download}>{generating ? '正在本地生成…' : '生成并下载图片'}</button>
            <button className="button button-secondary" type="button" onClick={copyText}>复制文字版</button>
          </div>
          <label className="text-fallback"><span>可手动复制的文字版</span><textarea readOnly rows={7} value={text} onFocus={(event) => event.currentTarget.select()} /></label>
        </section>
      </div>
    </Dialog>
  )
}
