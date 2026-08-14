// 今日卡包 —— 每天 0 点换三张推荐维度卡, 背朝下排开, 逐张拆。
//  deterministic by date: 同一天所有人拆到同一批, 方便聊天对答案。
import { DIMENSION_BY_ID, type DimensionRegistryEntry } from '../../model/dimensions'

/** 推荐池: 挑有梗、不敏感、适合当"今日缘分关键词"的维度 */
const PACK_POOL = [
  'lifestyle.cooking', 'communication.frequency', 'lifestyle.pet_attitude',
  'lifestyle.gaming', 'appearance.style', 'communication.conflict_repair',
  'lifestyle.travel', 'interest.shared_activities', 'values.partner_career_support',
  'communication.emotional_expression', 'future.settlement', 'career.work_intensity',
  'lifestyle.cleanliness', 'lifestyle.diet', 'appearance.grooming',
  'communication.alone_time', 'lifestyle.social_frequency', 'lifestyle.exercise',
] as const

const STORAGE_KEY = 'xindong.fun.pack'

export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 日期字符串 → 稳定伪随机, 同日同批 */
function dateSeed(key: string): number {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}

/** 今日三张卡(确定性): 种子步进取样, 不重复 */
export function dailyPicks(key = todayKey()): DimensionRegistryEntry[] {
  const seed = dateSeed(key)
  const picks: DimensionRegistryEntry[] = []
  const used = new Set<number>()
  let cursor = seed % PACK_POOL.length
  const step = 1 + (seed % 5)
  while (picks.length < 3) {
    if (!used.has(cursor)) {
      const entry = DIMENSION_BY_ID.get(PACK_POOL[cursor])
      if (entry) { picks.push(entry); used.add(cursor) }
    }
    cursor = (cursor + step) % PACK_POOL.length
  }
  return picks
}

/** 读今天已拆开的卡(localStorage); 换天自动重置 */
export function loadOpened(key = todayKey()): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const [day, ids] = raw.split(':')
    if (day !== key || !ids) return new Set()
    return new Set(ids.split(',').filter(Boolean))
  } catch {
    return new Set()
  }
}

export function saveOpened(opened: ReadonlySet<string>, key = todayKey()): void {
  try {
    localStorage.setItem(STORAGE_KEY, `${key}:${[...opened].join(',')}`)
  } catch { /* 存储不可用时静默 */ }
}
