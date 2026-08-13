import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ResultSummary } from '../components/ResultSummary'
import { SelectedSummary } from '../components/SelectedSummary'
import { StepNav, type StepDefinition } from '../components/StepNav'
import { Dialog, ToastRegion, type ToastMessage } from '../components/ui'
import { EVIDENCE_REGISTRY } from '../data/evidence'
import { computeModel } from '../engine/modelEngine'
import { Confetti } from '../fun/Confetti'
import { buildFunnelFrames } from '../fun/funnelFrames'
import { IntroCurtain } from '../fun/IntroCurtain'
import { Stage } from '../fun/Stage'
import { CoreCriteriaStep } from '../features/steps/CoreCriteriaStep'
import { DimensionLibraryStep } from '../features/steps/DimensionLibraryStep'
import { PopulationStep } from '../features/steps/PopulationStep'
import { ResultsStep } from '../features/steps/ResultsStep'
import { SensitiveFunStep } from '../features/steps/SensitiveFunStep'
import { ShareStep } from '../features/steps/ShareStep'
import { WelcomeStep } from '../features/steps/WelcomeStep'
import { useHistoryState } from '../hooks/useHistoryState'
import { loadSafeSessionSelection, useSessionSelection } from '../hooks/useSessionSelection'
import { activeConditions, removeSelectionDimension } from '../model/selectionUtils'
import { DEFAULT_SELECTION, safeParseSelection, type ModelSelection } from '../model/schema'
import { SharePreviewDialog } from '../components/SharePreviewDialog'

const STEPS: readonly StepDefinition[] = [
  { id: 'welcome', label: '开局须知', shortLabel: '开局', description: '了解模型边界' },
  { id: 'population', label: '第一关 · 圈定人群', shortLabel: '圈人', description: '性别、年龄、城市与婚史' },
  { id: 'core', label: '第二关 · 硬核条件', shortLabel: '硬核', description: '身高、教育、经济与生活习惯' },
  { id: 'library', label: '第三关 · 维度宝库', shortLabel: '宝库', description: '搜索进阶维度' },
  { id: 'sensitive', label: '第四关 · 彩蛋与边界', shortLabel: '彩蛋', description: '主动展开敏感条件与娱乐彩蛋' },
  { id: 'results', label: '揭榜时刻', shortLabel: '揭榜', description: '查看范围、影响和灵敏度' },
  { id: 'share', label: '生成战报', shortLabel: '战报', description: '本地生成隐私安全的战报' },
]

interface Preset {
  id: string
  label: string
  description: string
  selection: ModelSelection
}

const PRESETS: readonly Preset[] = [
  {
    id: 'open',
    label: '先认识再说',
    description: '不限婚史，只加三项轻量软偏好',
    selection: {
      ...structuredClone(DEFAULT_SELECTION),
      target: { ...structuredClone(DEFAULT_SELECTION.target), maritalStatuses: [] },
      softPreferenceIds: ['communication.conflict_repair', 'lifestyle.cooking', 'values.partner_career_support'],
    },
  },
  {
    id: 'stable',
    label: '稳定生活派',
    description: '本科及以上、当前不吸烟，重视稳定和共同规划',
    selection: {
      ...structuredClone(DEFAULT_SELECTION),
      correlated: {
        ...structuredClone(DEFAULT_SELECTION.correlated),
        educationLevels: ['bachelor', 'master', 'doctorate'],
        smoking: 'non_smoker',
      },
      softPreferenceIds: ['career.stability', 'finance.joint_planning', 'communication.conflict_repair'],
    },
  },
  {
    id: 'longterm',
    label: '长期共建派',
    description: '不加资产门槛，聚焦沟通、边界与未来计划',
    selection: {
      ...structuredClone(DEFAULT_SELECTION),
      softPreferenceIds: [
        'communication.conflict_repair',
        'family.boundaries',
        'future.care_distribution',
        'values.partner_career_support',
      ],
    },
  },
]

function useToasts() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const idRef = useRef(0)
  const timeoutIdsRef = useRef<number[]>([])
  const push = useCallback((kind: ToastMessage['kind'], text: string) => {
    const id = ++idRef.current
    setMessages((current) => [...current, { id, kind, text }].slice(-3))
    const timeoutId = window.setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id))
      timeoutIdsRef.current = timeoutIdsRef.current.filter((candidate) => candidate !== timeoutId)
    }, 4200)
    timeoutIdsRef.current.push(timeoutId)
  }, [])
  useEffect(() => () => timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId)), [])
  const dismiss = useCallback((id: number) => setMessages((current) => current.filter((message) => message.id !== id)), [])
  return { messages, push, dismiss }
}

export default function Home() {
  const initialSelection = useMemo(() => loadSafeSessionSelection(structuredClone(DEFAULT_SELECTION)), [])
  const history = useHistoryState(initialSelection)
  const selection = history.value
  const result = useMemo(() => computeModel(selection), [selection])
  const conditions = useMemo(() => activeConditions(selection), [selection])
  // SSR 及以上稀有度下彩带雨; seed 随结果变化, 同一份结果同一场雨
  const celebrationSeed = useMemo(() => {
    const base = result.population.base
    if (base <= 0 || result.population.estimate <= 0) return null
    const perWan = (result.population.estimate / base) * 10_000
    if (perWan >= 5) return null
    return `${result.population.estimate.toFixed(3)}-${buildFunnelFrames(result.input).length}`
  }, [result])
  const [currentStep, setCurrentStep] = useState(0)
  const [comparison, setComparison] = useState<ReturnType<typeof computeModel> | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [mobileResultOpen, setMobileResultOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  // 幕布开场: 每会话只播一次, 减少动态用户直接跳过
  const [introDone, setIntroDone] = useState(() => {
    try { return sessionStorage.getItem('xindong.intro.seen') === '1' } catch { return true }
  })
  const [online, setOnline] = useState(() => navigator.onLine)
  const { messages, push, dismiss } = useToasts()
  const initialFocusSkipped = useRef(false)

  const clearSavedSession = useSessionSelection(selection)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (!initialFocusSkipped.current) {
      initialFocusSkipped.current = true
      return
    }
    const headingId = `${STEPS[currentStep].id}-title`
    window.requestAnimationFrame(() => document.getElementById(headingId)?.focus())
  }, [currentStep])

  const updateSelection = useCallback((next: ModelSelection) => {
    const parsed = safeParseSelection(next)
    if (!parsed.success) {
      push('error', '这个输入超出模型支持范围，已保留上一个有效值。')
      return
    }
    history.set(parsed.data)
  }, [history, push])

  const navigate = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(STEPS.length - 1, step)))
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const applyPreset = (preset: Preset) => {
    // A preset replaces the complete selection, including the base range and
    // reciprocal choices. Any departure from the safe default needs consent.
    if (JSON.stringify(selection) !== JSON.stringify(DEFAULT_SELECTION)) {
      setPendingPreset(preset)
      return
    }
    history.reset(structuredClone(preset.selection))
    push('success', `已应用“${preset.label}”。`)
  }

  const confirmPreset = () => {
    if (!pendingPreset) return
    history.reset(structuredClone(pendingPreset.selection))
    push('success', `已应用“${pendingPreset.label}”，原条件可通过本次会话重新设置。`)
    setPendingPreset(null)
  }

  const clearAll = () => {
    clearSavedSession(DEFAULT_SELECTION)
    history.reset(structuredClone(DEFAULT_SELECTION))
    setComparison(null)
    setClearOpen(false)
    push('success', '已清空条件和安全会话草稿。')
  }

  const clearSession = () => {
    clearSavedSession()
    push('success', '本标签页的非敏感会话草稿已清除。当前画面仍保留，可继续调整。')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      {!online && <div className="offline-banner" role="status">当前离线：计算、解释和本地分享仍可使用；外部来源链接暂时打不开。</div>}

      <header className="site-header">
        <div className="header-inner">
          <a aria-label="心动概率局首页" className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate(0) }}>
            <span aria-hidden="true">♡</span>
            <span><b>心动概率局</b><small>条件组合实验室</small></span>
          </a>
          <nav aria-label="帮助与说明" className="header-links">
            <button type="button" onClick={() => setMethodOpen(true)}>方法与来源</button>
            <button type="button" onClick={() => setPrivacyOpen(true)}>隐私说明</button>
          </nav>
        </div>
      </header>

      <div id="top" />
      <StepNav current={currentStep} steps={STEPS} onChange={navigate} />

      <main className="workspace" id="main-content">
        <div className="workspace-main">
          {currentStep > 0 && (
            <section aria-labelledby="preset-title" className="preset-bar">
              <div><span className="eyebrow">懒人模板</span><h2 id="preset-title">先抄一套，再改成你的</h2></div>
              <div className="preset-list">
                {PRESETS.map((preset) => (
                  <button key={preset.id} title={preset.description} type="button" onClick={() => applyPreset(preset)}>
                    <b>{preset.label}</b><span>{preset.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {currentStep > 0 && (
            <SelectedSummary
              canRedo={history.canRedo}
              canUndo={history.canUndo}
              conditions={conditions}
              onClear={() => setClearOpen(true)}
              onRedo={history.redo}
              onRemove={(dimensionId) => updateSelection(removeSelectionDimension(selection, dimensionId))}
              onUndo={history.undo}
            />
          )}

          {currentStep === 0 && <WelcomeStep onStart={() => navigate(1)} />}
          {currentStep === 1 && <PopulationStep selection={selection} onChange={updateSelection} onNext={() => navigate(2)} />}
          {currentStep === 2 && <CoreCriteriaStep selection={selection} onChange={updateSelection} onNext={() => navigate(3)} />}
          {currentStep === 3 && <DimensionLibraryStep selection={selection} onChange={updateSelection} onNext={() => navigate(4)} />}
          {currentStep === 4 && <SensitiveFunStep selection={selection} onChange={updateSelection} onNext={() => navigate(5)} />}
          {currentStep === 5 && (
            <ResultsStep
              comparison={comparison}
              result={result}
              selection={selection}
              onCaptureComparison={() => { setComparison(result); push('success', '已保存当前方案 A，可以调整条件后比较。') }}
              onChange={updateSelection}
              onRelax={(dimensionId) => updateSelection(removeSelectionDimension(selection, dimensionId))}
              onShare={() => setShareOpen(true)}
            />
          )}
          {currentStep === 6 && <ShareStep result={result} selection={selection} onClearSession={clearSession} onShare={() => setShareOpen(true)} />}

          {currentStep > 0 && (
            <div className="page-step-footer" aria-label="步骤翻页">
              <button className="button button-secondary" disabled={currentStep === 0} type="button" onClick={() => navigate(currentStep - 1)}>← 回上一关</button>
              {currentStep < STEPS.length - 1
                ? <button className="button button-primary" type="button" onClick={() => navigate(currentStep + 1)}>冲！{STEPS[currentStep + 1].label} →</button>
                : <button className="button button-primary" type="button" onClick={() => navigate(5)}>回揭榜现场</button>}
            </div>
          )}
        </div>
      </main>

      <Stage result={result} />

      <footer className="site-footer">
        <div><b>心动概率局</b><p>匿名、本地计算、有证据边界的轻娱乐条件分析。</p></div>
        <div><button type="button" onClick={() => setMethodOpen(true)}>数据与模型</button><button type="button" onClick={() => setPrivacyOpen(true)}>隐私与安全</button><span>模型 {result.versions.modelVersion}</span></div>
      </footer>

      <div className="mobile-result-bar">
        <button
          aria-controls="mobile-result-dialog"
          aria-expanded={mobileResultOpen}
          type="button"
          onClick={() => setMobileResultOpen(true)}
        >
          <span><small>满足硬条件</small><b>{result.population.displayShort}</b></span>
          <span>查看战况 ↑</span>
        </button>
      </div>

      <Dialog id="mobile-result-dialog" open={mobileResultOpen} title="实时结果" description="结果随每次有效选择即时更新。" onClose={() => setMobileResultOpen(false)}>
        <ResultSummary headingId="mobile-result-summary-title" result={result} onOpenDetails={() => { setMobileResultOpen(false); navigate(5) }} onShare={() => { setMobileResultOpen(false); setShareOpen(true) }} />
      </Dialog>

      <Dialog open={clearOpen} title="清空当前条件？" description="会恢复安全默认值，并删除本标签页会话草稿。" onClose={() => setClearOpen(false)}>
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setClearOpen(false)}>取消</button><button className="button button-danger" type="button" onClick={clearAll}>确认清空</button></div>
      </Dialog>

      <Dialog open={pendingPreset != null} title="用预设覆盖当前条件？" description={pendingPreset?.description} onClose={() => setPendingPreset(null)}>
        <p>当前已填写额外条件。应用预设会替换整套选择；这是一次明确覆盖，不会静默发生。</p>
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setPendingPreset(null)}>保留当前</button><button className="button button-primary" type="button" onClick={confirmPreset}>应用预设</button></div>
      </Dialog>

      <Dialog open={methodOpen} title="方法与证据" description="直接数据、透明转换和模型假设被分开标记。" onClose={() => setMethodOpen(false)}>
        <div className="method-dialog-summary">
          <div><b>{EVIDENCE_REGISTRY.entries.length}</b><span>条证据记录</span></div>
          <div><b>{EVIDENCE_REGISTRY.entries.filter((entry) => entry.modelUse === 'excluded').length}</b><span>条明确排除</span></div>
          <div><b>18–50</b><span>逐单岁人口</span></div>
        </div>
        <p>硬筛选改变人口范围；相关硬条件在组内联合；软偏好只改契合；娱乐项只出彩蛋。乐观/基准/保守是敏感度范围，不是假装成抽样置信区间。</p>
        <div className="source-list">
          {EVIDENCE_REGISTRY.entries.slice(0, 8).map((entry) => (
            <a href={entry.sourceUrl} key={entry.id} rel="noreferrer" target="_blank"><span>证据 {entry.grade}</span><b>{entry.sourceTitle}</b><small>{entry.publisher} · {entry.dataYear}</small></a>
          ))}
        </div>
      </Dialog>

      <Dialog open={privacyOpen} title="隐私与安全" description="不登录、不上传、不埋点；分享由你逐项确认。" onClose={() => setPrivacyOpen(false)}>
        <div className="privacy-dialog-grid">
          <section><h3>计算</h3><p>所有模型计算在浏览器本地完成，不向服务器发送筛选。</p></section>
          <section><h3>会话草稿</h3><p>仅在当前标签页保存非敏感草稿；关闭标签页结束，敏感项不会写入。</p></section>
          <section><h3>分享</h3><p>先生成白名单预览；敏感字段默认关闭，且必须二次确认。</p></section>
          <section><h3>清除</h3><p>可在第 7 步立即清除本次会话草稿，不影响当前内存画面。</p></section>
        </div>
      </Dialog>

      {shareOpen && (
        <SharePreviewDialog
          open
          result={result}
          selection={selection}
          onClose={() => setShareOpen(false)}
          onNotify={push}
        />
      )}
      {celebrationSeed && <Confetti seed={celebrationSeed} />}
      {!introDone && (
        <IntroCurtain onDone={() => {
          setIntroDone(true)
          try { sessionStorage.setItem('xindong.intro.seen', '1') } catch { /* 私密模式写入失败就不标记 */ }
        }} />
      )}
      <ToastRegion messages={messages} onDismiss={dismiss} />
    </div>
  )
}
