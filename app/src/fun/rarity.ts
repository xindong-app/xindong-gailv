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
  if (perWan >= 500) return { key: 'N', label: 'N · 普通款', comment: '量大管饱, 下楼买杯奶茶都能撞见仨', bg: '#E5DCD5', fg: '#3b3050' }
  if (perWan >= 50) return { key: 'R', label: 'R · 稀有', comment: '池子还行, 主动一点就有戏', bg: '#cdeafa', fg: '#2b5d6e' }
  if (perWan >= 5) return { key: 'SR', label: 'SR · 超级稀有', comment: '朋友圈扩列三轮, 也许能刷到一个', bg: '#e6dbf7', fg: '#4a3a6e' }
  if (perWan >= 0.5) return { key: 'SSR', label: 'SSR · 极度稀有', comment: '遇见了别犹豫, 直接锁死 🔒', bg: '#ffd9e2', fg: '#a03d7a' }
  if (perWan >= 0.05) return { key: 'UR', label: 'UR · 传说', comment: '全服限量款, 刷到就是天大的缘分', bg: '#ffeeb0', fg: '#7a4a12' }
  return { key: 'M', label: '??? · 神话级', comment: '理论上存在, 遇见概率≈彩票头奖, 建议顺手买张彩票对冲', bg: '#ffd9b8', fg: '#7a2b12' }
}

export function fmtRarity(p: number): string {
  if (p <= 0) return '亿里挑一都悬'
  const oneIn = 1 / p
  if (oneIn < 10) return '十里挑一'
  if (oneIn < 100) return `${Math.round(oneIn)} 里挑一`
  if (oneIn < 10000) return `千分之 ${(p * 1000).toFixed(1)}`
  if (oneIn < 1e8) return `万分之 ${(p * 10000).toFixed(p * 10000 >= 10 ? 0 : 1)}`
  if (p * 1e8 >= 0.05) return `亿分之 ${(p * 1e8).toFixed(1)}`
  return '概率约等于 0, 神话都编不出来'
}

// ---------- 毒舌总评 ----------
const VERDICT_JOKES: Record<string, string> = {
  'appearance.height': '这关不怪他们, 怪基因',
  'appearance.body_type': '奶茶战队全军覆没',
  'economy.income': '现实稳定发挥, 从不让人失望',
  'economy.wealth': '投胎确实是门技术活',
  'economy.house': '房价才是最佳守门员',
  'economy.vehicle': '四个轮子碾过一片真心',
  'education.level': '知识确实改变命运…的择偶概率',
  'lifestyle.smoking': '一根烟烧掉一大片缘分',
  'lifestyle.drinking': '感情深一口闷, 缘分浅全筛完',
  'appearance.hair_full': '比收入还能打, 秃然真实',
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
  // 考上清华: 同龄人口约 0.05% → 1/2000
  if (oneIn > 2000) out.push(`比考上清华还难 ${Math.round(oneIn / 2000)} 倍(清华: 这锅我不背)`)
  else out.push('比考上清华容易点儿(清华录取约 1/2000)')
  // 双色球一等奖 1/17721088
  if (oneIn > 17721088 / 100) {
    out.push(`中双色球头奖都比这容易 ${(oneIn / 17721088).toFixed(1)} 倍`)
  }
  return out
}
