// 稀有度抽卡分级 + 毒舌总评 —— 纯文案/纯函数, 不碰引擎数学
import type { FunnelFrame } from './funnelFrames'

export interface Tier {
  key: string
  label: string
  comment: string
  bg: string
  fg: string
}

/** 稀有度按「每万人中的数量」分级, perWan = estimate / base * 10000 */
export function rarityTier(perWan: number): Tier {
  if (perWan >= 500) return { key: 'N', label: 'N · 普通款', comment: '人山人海款, 数据表示毫无压力', bg: '#E5DCD5', fg: '#3b3050' }
  if (perWan >= 50) return { key: 'R', label: 'R · 稀有', comment: '池子还大, 条件组合算友好', bg: '#cdeafa', fg: '#2b5d6e' }
  if (perWan >= 5) return { key: 'SR', label: 'SR · 超级稀有', comment: '千里挑一级别, 组合开始小众', bg: '#e6dbf7', fg: '#4a3a6e' }
  if (perWan >= 0.5) return { key: 'SSR', label: 'SSR · 极度稀有', comment: '万里挑一级别, 数据都开始孤单', bg: '#ffd9e2', fg: '#a03d7a' }
  if (perWan >= 0.05) return { key: 'UR', label: 'UR · 传说', comment: '贴近模型分辨率边缘, 稀有度拉满', bg: '#ffeeb0', fg: '#7a4a12' }
  return { key: 'M', label: '??? · 神话级', comment: '低于模型分辨率的人间传说——不说不存在, 只说数不出来', bg: '#ffd9b8', fg: '#7a2b12' }
}

export function fmtRarity(p: number): string {
  if (p <= 0) return '低于模型分辨率, 数不出来'
  const oneIn = 1 / p
  if (oneIn < 1.05) return '遍地都是款(几乎人人符合)'
  if (oneIn < 2.5) return '两三个里就有一个'
  if (oneIn < 10) return `${Math.round(oneIn)} 里挑一`
  if (oneIn < 10000) return `千分之 ${(p * 1000).toFixed(1)}`
  if (oneIn < 1e8) return `万分之 ${(p * 10000).toFixed(p * 10000 >= 10 ? 0 : 1)}`
  if (p * 1e8 >= 0.05) return `亿分之 ${(p * 1e8).toFixed(1)}`
  return '低于模型分辨率, 数不出来'
}

// ---------- 毒舌总评 ----------
// v4: 综合层全条件出刀, 玩笑跟着关卡走;
// 但身体/疾病/收入羞辱类仍然不单独配梗, 走通用守门员吐槽。
const VERDICT_JOKES: Record<string, string> = {
  'appearance.height': '海拔这关, 刻度说了算',
  'education.level': '知识确实改变…池子大小',
  'education.school': '志愿填报, 从娃娃抓起',
  'economy.house': '房产证才是最硬的情书',
  'economy.vehicle': '四个轮子碾过一大片缘分',
  'lifestyle.smoking': '一根烟烧掉一大片缘分',
  'lifestyle.drinking': '感情深一口闷, 缘分浅全筛完',
  'appearance.hair_full': '头发和缘分, 总得留一样',
}

export function buildVerdict(frames: readonly FunnelFrame[]): string | null {
  if (frames.length === 0) return null
  const worst = frames.reduce((a, b) => (b.factor < a.factor ? b : a))
  const joke = VERDICT_JOKES[worst.dimensionId] ?? '这一关是真·守门员'
  const pct = ((1 - worst.factor) * 100).toFixed(worst.factor > 0.1 ? 0 : 1)
  return `致命一击是「${worst.label}」, 一刀淘汰 ${pct}% 的选手 —— ${joke}`
}

export function buildComparisons(p: number): string[] {
  const out: string[] = []
  if (p <= 0) return out
  const oneIn = 1 / p
  // 只和"同龄人里考上清华的占比"这种人群频率做参照, 不与彩票等随机事件类比
  if (oneIn > 2000) out.push(`这个占比比同龄人考上清华还低 ${Math.round(oneIn / 2000)} 倍(清华: 这锅我不背)`)
  else out.push('比"同龄人考上清华"的占比高一点儿(清华录取约 1/2000)')
  return out
}
