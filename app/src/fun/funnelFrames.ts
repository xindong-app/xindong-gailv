// 漏斗帧拆解 —— 纯趣味层模块, 只调用引擎公开接口 computeModel,
// 不触碰、不复制引擎内部数学。
//
// 原理: 链式法则对任意条件顺序成立 ——
//   P(A,B,C) = P(A) × P(B|A) × P(C|A,B)
// 第 k 关条件概率 = 引擎在「前 k 关全开」下的联合估算 ÷「前 k- 1关」的联合估算,
// 每一帧都由引擎亲自算出, 帧因子相乘精确望远镜回最终估算。
import { computeModel } from '../engine/modelEngine'
import { isDimensionAppliedToMainEstimate } from '../data/population-policy'
import { DIMENSION_BY_ID, type EvidenceGrade } from '../model/dimensions'
import type { ModelSelection } from '../model/schema'

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

const FRAME_EMOJI: Readonly<Record<string, string>> = {
  'appearance.height': '📏',
  'education.level': '🎓',
  'economy.income': '💰',
  'economy.wealth': '🏦',
  'economy.house': '🏠',
  'economy.vehicle': '🚗',
  'appearance.body_type': '🍰',
  'lifestyle.smoking': '🚭',
  'lifestyle.drinking': '🍺',
  'appearance.hair_full': '💇',
}

const clampProbability = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

interface FrameRule {
  dimensionId: string
  isActive: (selection: ModelSelection) => boolean
  enable: (draft: ModelSelection, full: ModelSelection) => void
}

// 出刀顺序固定: 基础圈 → 身高 → 吸烟 → 饮酒
// v3: 收入/资产/房车/体型/学历/发际线等维度不对主估算产生扣减(do_not_apply),
// 把它们画成"淘汰 0%"会误导成"现实中没有筛选作用", 因此只保留可量化关卡。
const FRAME_RULES: readonly FrameRule[] = [
  {
    dimensionId: 'appearance.height',
    isActive: (s) => s.target.heightCm != null && (s.target.heightCm.min != null || s.target.heightCm.max != null),
    enable: (draft, full) => { draft.target.heightCm = full.target.heightCm == null ? null : { ...full.target.heightCm } },
  },
  {
    dimensionId: 'education.level',
    isActive: (s) => s.correlated.educationLevels.length > 0,
    enable: (draft, full) => { draft.correlated.educationLevels = [...full.correlated.educationLevels] },
  },
  {
    dimensionId: 'lifestyle.smoking',
    isActive: (s) => s.correlated.smoking !== 'any',
    enable: (draft, full) => { draft.correlated.smoking = full.correlated.smoking },
  },
  {
    dimensionId: 'lifestyle.drinking',
    isActive: (s) => s.correlated.drinking !== 'any',
    enable: (draft, full) => { draft.correlated.drinking = full.correlated.drinking },
  },
]

// v3: 收入/资产/房车/体型/学历/发际线等维度不对主估算产生扣减(do_not_apply),
// 把它们画成"淘汰 0%"会误导成"现实中没有筛选作用", 因此只保留可量化关卡。
const ACTIVE_FRAME_RULES: readonly FrameRule[] = FRAME_RULES.filter((rule) =>
  isDimensionAppliedToMainEstimate(rule.dimensionId))

/** 剥掉全部漏斗条件的基础选择(保留性别/年龄/城市/婚史) */
function stripFunnelConditions(selection: ModelSelection): ModelSelection {
  const draft = structuredClone(selection)
  draft.target.heightCm = null
  draft.correlated.educationLevels = []
  draft.correlated.minAnnualIncomeWan = null
  draft.correlated.minHouseholdWealthWan = null
  draft.correlated.housing = { required: false, location: null, minAreaSqm: null, type: null }
  draft.correlated.vehicle = { required: false, priceBands: [] }
  draft.correlated.bodyTypes = []
  draft.correlated.smoking = 'any'
  draft.correlated.drinking = 'any'
  draft.correlated.hairCriteria = []
  return draft
}

// 同一份 selection 对象在桌面侧栏/结果页/手机弹窗间共享,
// 用 WeakMap 按对象身份缓存, 避免每个挂载点重复渐进重算。
const frameCache = new WeakMap<ModelSelection, FunnelFrame[]>()

export function buildFunnelFrames(selection: ModelSelection): FunnelFrame[] {
  const cached = frameCache.get(selection)
  if (cached) return cached

  const activeRules = ACTIVE_FRAME_RULES.filter((rule) => rule.isActive(selection))
  if (activeRules.length === 0) {
    frameCache.set(selection, [])
    return []
  }

  const draft = stripFunnelConditions(selection)
  let previous = computeModel(draft).population.estimate
  const frames: FunnelFrame[] = []

  for (const rule of activeRules) {
    rule.enable(draft, selection)
    const estimate = computeModel(draft).population.estimate
    const registry = DIMENSION_BY_ID.get(rule.dimensionId)
    frames.push({
      dimensionId: rule.dimensionId,
      label: registry?.label ?? rule.dimensionId,
      emoji: FRAME_EMOJI[rule.dimensionId] ?? '🎯',
      factor: previous > 0 ? clampProbability(estimate / previous) : estimate > 0 ? 0 : 1,
      survivors: Math.max(0, estimate),
      evidenceGrade: registry?.evidenceGrade ?? 'C',
    })
    previous = estimate
  }

  frameCache.set(selection, frames)
  return frames
}
