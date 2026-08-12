// 分享卡生成: Canvas 手绘 1080×1350 PNG
import type { Result, Selection, Tier } from '../engine/calc'
import { fmtCount, fmtRarity } from '../engine/calc'

const W = 1080
const H = 1350

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 自动换行
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      lines.push(line)
      line = ch
    } else line += ch
  }
  if (line) lines.push(line)
  return lines
}

export interface ShareOpts {
  sel: Selection
  result: Result
  tier: Tier
  youP: number | null // 反向概率(可选)
  youTier: Tier | null
  survivor: { name: string; emoji: string } | null // 全场最后下班的小人
}

export async function downloadShareCard(o: ShareOpts): Promise<void> {
  await document.fonts.ready.catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const INK = '#3b3050'
  const BROWN = '#a55a35'

  // 底
  ctx.fillStyle = '#fbf6ec'
  ctx.fillRect(0, 0, W, H)
  // 马卡龙色块装饰
  ctx.fillStyle = '#ffd9e2'
  ctx.beginPath(); ctx.arc(-60, 120, 190, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#cdeafa'
  ctx.beginPath(); ctx.arc(W + 40, 300, 230, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ddefd3'
  ctx.beginPath(); ctx.arc(90, H - 60, 160, 0, Math.PI * 2); ctx.fill()

  // 主卡片
  const mx = 70, my = 70, mw = W - 140, mh = H - 140
  ctx.fillStyle = 'rgba(59,48,80,0.9)'
  rr(ctx, mx + 12, my + 12, mw, mh, 40); ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  rr(ctx, mx, my, mw, mh, 40); ctx.fill()

  let y = my + 78
  const cx = W / 2

  // 标题
  ctx.textAlign = 'center'
  ctx.fillStyle = BROWN
  ctx.font = '34px "Long Cang", "ZCOOL KuaiLe", cursive'
  ctx.fillText('严肃数据 × 不太严肃的我们', cx, y)
  y += 66
  ctx.fillStyle = INK
  ctx.font = '64px "ZCOOL KuaiLe", sans-serif'
  ctx.fillText('心动概率局 💘', cx, y)
  y += 46

  // 筛选范围
  ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(59,48,80,0.65)'
  const scope = `${o.sel.cities.join('、') || '全国'} · ${o.sel.ageMin}-${o.sel.ageMax} 岁 · ${o.sel.gender === 'male' ? '男生' : '女生'}`
  ctx.fillText(scope, cx, y)
  y += 52

  // 稀有度徽章
  const tierText = o.tier.label
  ctx.font = 'bold 40px "ZCOOL KuaiLe", sans-serif'
  const tw = ctx.measureText(tierText).width + 72
  ctx.fillStyle = o.tier.bg
  rr(ctx, cx - tw / 2, y - 40, tw, 64, 32); ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  rr(ctx, cx - tw / 2, y - 40, tw, 64, 32); ctx.stroke()
  ctx.fillStyle = o.tier.fg
  ctx.fillText(tierText, cx, y + 6)
  y += 86

  // 大数字
  ctx.fillStyle = INK
  ctx.font = '76px "ZCOOL KuaiLe", sans-serif'
  ctx.fillText(fmtRarity(o.result.finalP), cx, y)
  y += 48
  ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(59,48,80,0.8)'
  const cityNames = o.sel.cities.join('、') || '全国'
  ctx.fillText(`${cityNames}满足条件的约有:${fmtCount(o.result.count)}(区间 ${fmtCount(o.result.low)} ~ ${fmtCount(o.result.high)})`, cx, y)
  y += 42

  // 一句话剧本: 幸存小人职业
  ctx.fillStyle = BROWN
  ctx.font = '28px "Long Cang", "ZCOOL KuaiLe", cursive'
  const script = o.survivor
    ? `🎬 剧本: 你的 TA 是「全场最后下班的${o.survivor.name}」${o.survivor.emoji}`
    : '🎬 剧本: 全军覆没, 连气氛组都没剩下…'
  ctx.fillText(script, cx, y)
  y += 46

  // 反向概率
  if (o.youP != null && o.youTier) {
    const both = o.result.finalP * o.youP
    ctx.fillStyle = '#fff3d9'
    rr(ctx, mx + 60, y - 28, mw - 120, 96, 24); ctx.fill()
    ctx.fillStyle = BROWN
    ctx.font = '28px "Long Cang", "ZCOOL KuaiLe", cursive'
    ctx.fillText(`你是 ${o.youTier.label} · 互相心动概率 ${fmtRarity(both)}`, cx, y + 8)
    ctx.fillStyle = 'rgba(59,48,80,0.6)'
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('遇到了就请原地结婚吧 💍', cx, y + 44)
    y += 112
  }

  // 条件清单(最多 8 条)
  const steps = o.result.steps.slice(0, 8)
  ctx.textAlign = 'left'
  const lx = mx + 90
  ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif'
  for (const s of steps) {
    if (y > H - 260) break
    ctx.fillStyle = INK
    ctx.fillText(`${s.emoji} ${s.label}`, lx, y)
    ctx.fillStyle = 'rgba(59,48,80,0.55)'
    const pct = `剩 ${(s.factor * 100).toPrecision(2)}% → ${fmtCount(s.survivors)}`
    ctx.fillText(pct, lx + 250, y)
    y += 44
  }
  if (o.result.steps.length > 8) {
    ctx.fillStyle = 'rgba(59,48,80,0.5)'
    ctx.fillText(`…等 ${o.result.steps.length} 个条件`, lx, y)
    y += 44
  }

  // 吐槽 + 毒舌总评
  y += 14
  ctx.textAlign = 'center'
  ctx.fillStyle = BROWN
  ctx.font = '30px "Long Cang", "ZCOOL KuaiLe", cursive'
  for (const line of wrapText(ctx, `💬 ${o.tier.comment}`, mw - 160)) {
    ctx.fillText(line, cx, y)
    y += 40
  }
  if (o.result.verdict && y < H - 180) {
    ctx.font = '24px "Long Cang", "ZCOOL KuaiLe", cursive'
    for (const line of wrapText(ctx, `🔪 ${o.result.verdict}`, mw - 200)) {
      ctx.fillText(line, cx, y)
      y += 34
    }
  }

  // 页脚
  ctx.fillStyle = 'rgba(59,48,80,0.45)'
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('数据来源: 国家统计局 / 央行 / 卫健委 / 胡润 / 医学文献 · 仅供娱乐参考', cx, H - 118)
  ctx.fillText('心动概率局 · 算出你的「万里挑一」', cx, H - 86)

  const a = document.createElement('a')
  a.download = `心动概率局-${o.tier.key}.png`
  a.href = canvas.toDataURL('image/png')
  a.click()
}
