// 漏斗帧拆解 —— 纯趣味层模块, 只调用引擎公开接口 computeModel,
// 不触碰、不复制引擎内部数学。
//
// 原理: 链式法则对任意条件顺序成立 ——
//   P(A,B,C) = P(A) × P(B|A) × P(C|A,B)
// 第 k 关条件概率 = 引擎在「前 k 关全开」下的综合估算 ÷「前 k-1 关」的综合估算,
// 每一帧都由引擎亲自算出, 帧因子相乘精确望远镜回最终估算。
//
// v4: 主口径切换到 comprehensivePopulation —— 收入/资产/房车/性格等
// 全部已选条件都参与综合情景估算, 因此漏斗恢复为通用反向链:
// 每一关都是一个真实出刀条件, 不再只保留可靠层的四个关卡。
import { computeModel } from '../engine/modelEngine'
import { DIMENSION_BY_ID, type EvidenceGrade } from '../model/dimensions'
import type { ModelSelection } from '../model/schema'
import { activeConditions, removeSelectionDimension } from '../model/selectionUtils'

export interface FunnelFrame {
  dimensionId: string
  label: string
  emoji: string
  /** 本关条件保留率(0–1), 由引擎渐进重算得出 */
  factor: number
  /** 本关之后的估算幸存人数 */
  survivors: number
  evidenceGrade: EvidenceGrade
}

export interface FunnelContext {
  seekerGender?: 'male' | 'female'
  hardRequirementIds?: string[]
}

const FRAME_EMOJI: Readonly<Record<string, string>> = {
  'base.marital': '💍',
  'appearance.height': '📏',
  'appearance.body_type': '🏋️',
  'appearance.hair_full': '💇',
  'education.level': '🎓',
  'education.school': '🏫',
  'economy.income': '💰',
  'economy.wealth': '💎',
  'economy.house': '🏠',
  'economy.vehicle': '🚗',
  'lifestyle.smoking': '🚭',
  'lifestyle.drinking': '🍺',
  'health.chronic': '🩺',
  'health.myopia': '👓',
  'entertainment.zodiac': '🔮',
  'entertainment.mbti': '🧩',
}

const clampProbability = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

// 性别/年龄/城市是池子定义而不是出刀。
// v4: 星座/MBTI 也按最大熵先验真实计入综合估算, 同样配拥有一关。
const POOL_DEFINITION_IDS = new Set(['base.gender', 'base.age', 'base.region'])

// 同一份 selection 对象在桌面侧栏/结果页/手机弹窗间共享,
// 用 WeakMap 按对象身份缓存, 避免每个挂载点重复渐进重算。
// seekerGender 等计算上下文参与缓存键, 换了人就重算。
const frameCache = new WeakMap<ModelSelection, { key: string; frames: FunnelFrame[] }>()

export function buildFunnelFrames(selection: ModelSelection, context: FunnelContext = {}): FunnelFrame[] {
  const contextKey = `${context.seekerGender ?? ''}|${(context.hardRequirementIds ?? []).join(',')}`
  const cached = frameCache.get(selection)
  if (cached && cached.key === contextKey) return cached.frames

  const cuts = activeConditions(selection).filter(
    (condition) => !POOL_DEFINITION_IDS.has(condition.dimensionId),
  )
  if (cuts.length === 0) {
    const frames: FunnelFrame[] = []
    frameCache.set(selection, { key: contextKey, frames })
    return frames
  }

  const options = {
    hardRequirementIds: context.hardRequirementIds ?? [],
    ...(context.seekerGender ? { seekerGender: context.seekerGender } : {}),
  }
  // 帧 0 = 只保留池子定义(性别/年龄/城市)的综合估算
  const removed = cuts.map((condition) => condition.dimensionId)
  const draft = removeSelectionDimension(selection, '__none__') // 先克隆一份
  let baseDraft = draft
  for (const dimensionId of removed) {
    baseDraft = removeSelectionDimension(baseDraft, dimensionId)
  }
  const first = computeModel(baseDraft, options).comprehensivePopulation
  if (first.numericStatus !== 'available') {
    const frames: FunnelFrame[] = []
    frameCache.set(selection, { key: contextKey, frames })
    return frames
  }

  // 逐关把条件加回来: 第 k 关的草稿 = 完整选择移除第 k+1..n 关
  const estimates: number[] = [first.estimate]
  for (let k = 1; k <= cuts.length; k += 1) {
    let frameDraft = selection
    for (let j = k; j < cuts.length; j += 1) {
      frameDraft = removeSelectionDimension(frameDraft, cuts[j].dimensionId)
    }
    estimates.push(computeModel(frameDraft, options).comprehensivePopulation.estimate)
  }

  const frames: FunnelFrame[] = cuts.map((condition, index) => {
    const previous = estimates[index]
    const estimate = estimates[index + 1]
    const registry = DIMENSION_BY_ID.get(condition.dimensionId)
    return {
      dimensionId: condition.dimensionId,
      label: condition.label,
      emoji: FRAME_EMOJI[condition.dimensionId] ?? '🎯',
      factor: previous > 0 ? clampProbability(estimate / previous) : estimate > 0 ? 0 : 1,
      survivors: Math.max(0, estimate),
      evidenceGrade: registry?.evidenceGrade ?? 'C',
    }
  })

  frameCache.set(selection, { key: contextKey, frames })
  return frames
}
