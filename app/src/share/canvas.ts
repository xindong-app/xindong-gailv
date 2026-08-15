import { encode as encodeQr } from 'uqr'
import { stickerFor } from '../fun/stickers'
import { CHALLENGE_URL } from './challenge'
import type { ShareConditionDto, ShareDto } from './types'
import { ShareCardError } from './types'

const WIDTH = 1080
const HEIGHT = 1560

/** 印在战报卡上的入口(永久链接, 临时部署链接 3 小时过期不能上卡) */
const SHARE_URL = CHALLENGE_URL

export interface CanvasRenderDependencies {
  document?: Pick<Document, 'createElement'>
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const character of text) {
    if (current && context.measureText(`${current}${character}`).width > maxWidth) {
      lines.push(current)
      current = character
    } else {
      current += character
    }
  }
  if (current) lines.push(current)
  return lines
}

function truncateToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let out = text
  while (out && context.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return out ? `${out}…` : '…'
}

function drawCenteredWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): number {
  const lines = wrapText(context, text, maxWidth)
  const visibleLines = lines.slice(0, maxLines)
  if (lines.length > maxLines && visibleLines.length > 0) {
    let last = visibleLines[visibleLines.length - 1]
    while (last && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    visibleLines[visibleLines.length - 1] = `${last}…`
  }
  visibleLines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
  return visibleLines.length * lineHeight
}

function drawLeftWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): number {
  const lines = wrapText(context, text, maxWidth)
  const visibleLines = lines.slice(0, maxLines)
  if (lines.length > maxLines && visibleLines.length > 0) {
    let last = visibleLines[visibleLines.length - 1]
    while (last && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    visibleLines[visibleLines.length - 1] = `${last}…`
  }
  visibleLines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
  return visibleLines.length * lineHeight
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new ShareCardError('ENCODE_FAILED', '当前浏览器不支持图片编码，请复制文字版战报。'))
      return
    }
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new ShareCardError('ENCODE_FAILED', '分享图片编码失败，请重试或复制文字版战报。'))
      }, 'image/png')
    } catch (cause) {
      reject(new ShareCardError('ENCODE_FAILED', '分享图片编码失败，请重试或复制文字版战报。', { cause }))
    }
  })
}

/** 画一个小人: 身体 + 头 + 笑脸 + 头顶 emoji 皮肤 */
function drawPerson(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  emoji: string,
  ink: string,
) {
  context.save()
  context.translate(x, y)
  context.scale(scale, scale)
  context.fillStyle = color
  context.strokeStyle = ink
  context.lineWidth = 2.2
  // 身体
  context.beginPath()
  context.moveTo(-16, 44)
  context.quadraticCurveTo(-16, 12, 0, 12)
  context.quadraticCurveTo(16, 12, 16, 44)
  context.closePath()
  context.fill()
  context.stroke()
  // 头
  context.beginPath()
  context.arc(0, 0, 10, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  // 表情
  context.fillStyle = ink
  context.beginPath()
  context.arc(-3.6, -1, 1.3, 0, Math.PI * 2)
  context.arc(3.6, -1, 1.3, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(0, 2.5, 3.4, 0.15 * Math.PI, 0.85 * Math.PI)
  context.stroke()
  // 头顶皮肤 emoji
  if (emoji) {
    context.font = '20px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(emoji, 0, -14)
  }
  context.restore()
}

/** 稀有度钢印: 斜贴 + 硬阴影 */
function drawStamp(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  fun: NonNullable<ShareDto['fun']>,
  ink: string,
) {
  context.save()
  context.translate(centerX, centerY)
  context.rotate((-3 * Math.PI) / 180)
  const width = 330
  const height = 108
  // 硬阴影
  context.fillStyle = ink
  roundedRect(context, -width / 2 + 7, -height / 2 + 7, width, height, 22)
  context.fill()
  // 章体
  context.fillStyle = fun.tierBg
  roundedRect(context, -width / 2, -height / 2, width, height, 22)
  context.fill()
  context.strokeStyle = ink
  context.lineWidth = 4
  roundedRect(context, -width / 2, -height / 2, width, height, 22)
  context.stroke()
  context.fillStyle = fun.tierFg
  context.textAlign = 'center'
  context.font = '800 40px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText(fun.tierLabel, 0, -4)
  context.font = '700 26px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText(fun.rarityText, 0, 34)
  context.restore()
}

/** 右下角二维码: 任何一步失败都静默跳过, 不影响卡片其余部分 */
function drawQr(context: CanvasRenderingContext2D, ink: string) {
  try {
    const matrix = encodeQr(SHARE_URL, { ecc: 'M' }).data
    const modules = matrix.length + 2 // 四周各留 1 模块静区
    const size = 104
    const x = WIDTH - 200
    const y = HEIGHT - 238
    // 白底托, 防止扫码区域透出底色
    context.fillStyle = '#ffffff'
    roundedRect(context, x - 8, y - 8, size + 16, size + 16, 12)
    context.fill()
    context.strokeStyle = ink
    context.lineWidth = 2.5
    roundedRect(context, x - 8, y - 8, size + 16, size + 16, 12)
    context.stroke()
    const cell = size / modules
    context.fillStyle = ink
    matrix.forEach((row, rowIndex) => {
      row.forEach((dark, colIndex) => {
        if (dark) context.fillRect(x + (colIndex + 1) * cell, y + (rowIndex + 1) * cell, cell + 0.5, cell + 0.5)
      })
    })
    context.font = '600 18px system-ui, "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText('扫码自己算一卦', x + size / 2, y + size + 24)
  } catch {
    // 二维码只是裂变入口, 失败不阻塞出卡
  }
}

/* ============================================================
   二期 · 收藏卡: 贴纸墙 + 淘汰分镜
   ============================================================ */

/** 逐张加载贴纸, 800ms 兜底超时: 任何失败都只丢图不丢卡 */
function loadStickerImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    let image: HTMLImageElement | null = null
    try {
      image = new Image()
    } catch {
      resolve(null)
      return
    }
    const timer = setTimeout(() => resolve(null), 800)
    image.onload = () => {
      clearTimeout(timer)
      resolve(image)
    }
    image.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    image.src = src
  })
}

/** 把公开条件里"有贴纸可画"的维度图一次并行取回 */
async function collectStickerImages(conditions: ShareConditionDto[]): Promise<Map<string, HTMLImageElement>> {
  const unique = new Map<string, string>()
  for (const condition of conditions) {
    const src = stickerFor(condition.dimensionId)
    if (src && !unique.has(condition.dimensionId)) unique.set(condition.dimensionId, src)
  }
  const images = new Map<string, HTMLImageElement>()
  const entries = await Promise.all(
    [...unique].map(async ([id, src]) => ({ id, image: await loadStickerImage(src) })),
  )
  for (const { id, image } of entries) {
    if (image) images.set(id, image)
  }
  return images
}

/** 条件贴纸牌: 斜贴 + 硬阴影 + 剪纸画 + 短标签 */
function drawStickerChip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  image: HTMLImageElement,
  label: string,
  ink: string,
  index: number,
) {
  const angle = ((index % 2 === 0 ? -1 : 1) * 1.1 * Math.PI) / 180
  context.save()
  context.translate(x + width / 2, y + height / 2)
  context.rotate(angle)
  const left = -width / 2
  const top = -height / 2
  context.fillStyle = ink
  roundedRect(context, left + 3, top + 4, width, height, 14)
  context.fill()
  context.fillStyle = '#ffffff'
  roundedRect(context, left, top, width, height, 14)
  context.fill()
  context.strokeStyle = ink
  context.lineWidth = 2
  roundedRect(context, left, top, width, height, 14)
  context.stroke()
  const artHeight = 38
  const aspect = image.height > 0 ? image.width / image.height : 1.08
  const artWidth = Math.round(artHeight * aspect)
  context.drawImage(image, left + 10, top + (height - artHeight) / 2, artWidth, artHeight)
  context.fillStyle = ink
  context.font = '600 22px system-ui, "Microsoft YaHei", sans-serif'
  context.textAlign = 'left'
  context.fillText(label, left + 10 + artWidth + 8, top + height / 2 + 8)
  context.restore()
}

/** 贴纸墙: 一行贴纸牌, 没有图的条件不占位; 返回消耗高度 */
function drawStickerWall(
  context: CanvasRenderingContext2D,
  conditions: ShareConditionDto[],
  images: Map<string, HTMLImageElement>,
  y: number,
  ink: string,
): number {
  if (typeof context.drawImage !== 'function' || images.size === 0) return 0
  const items = conditions.filter((condition) => images.has(condition.dimensionId))
  if (items.length === 0) return 0
  const chipHeight = 54
  const rowRight = WIDTH - 130
  let x = 130
  let shown = 0
  for (const item of items) {
    const image = images.get(item.dimensionId)
    if (!image) continue
    context.font = '600 22px system-ui, "Microsoft YaHei", sans-serif'
    const label = truncateToWidth(context, item.label, 96)
    const chipWidth = Math.ceil(12 + 40 + 8 + context.measureText(label).width + 14)
    if (shown >= 6 || (shown > 0 && x + chipWidth > rowRight)) break
    drawStickerChip(context, x, y, chipWidth, chipHeight, image, label, ink, shown)
    x += chipWidth + 14
    shown += 1
  }
  const hidden = items.length - shown
  if (hidden > 0) {
    context.fillStyle = '#655a75'
    context.font = '600 22px system-ui, "Microsoft YaHei", sans-serif'
    context.textAlign = 'left'
    context.fillText(`+${hidden} 项`, x + 2, y + 35)
  }
  // 54 牌高 + 阴影/斜贴余量 + 下方文字行的字身避让
  return chipHeight + 34
}

/** 淘汰分镜: 天鹅绒胶片带 + 四格小人, 中间格为 80→幸存 的等比示意 */
function drawFilmstrip(
  context: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  fun: NonNullable<ShareDto['fun']>,
  ink: string,
): number {
  context.fillStyle = '#655a75'
  context.font = '600 22px system-ui, "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.fillText('🎞️ 小人淘汰分镜 · 中间格为示意', centerX, y)

  const bandX = 110
  const bandWidth = WIDTH - 220
  const bandHeight = 138
  const bandY = y + 12
  // 天鹅绒带
  context.fillStyle = '#2b2140'
  roundedRect(context, bandX, bandY, bandWidth, bandHeight, 18)
  context.fill()
  // 胶片齿孔
  context.fillStyle = '#fbf6ec'
  for (let holeX = bandX + 18; holeX < bandX + bandWidth - 12; holeX += 30) {
    context.beginPath()
    context.arc(holeX, bandY + 11, 4, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.arc(holeX, bandY + bandHeight - 11, 4, 0, Math.PI * 2)
    context.fill()
  }

  const survivors = Math.max(0, Math.min(80, fun.survivors))
  const ratio = Math.pow(Math.max(survivors, 0.5) / 80, 1 / 3)
  const counts = [80, Math.round(80 * ratio), Math.round(80 * ratio * ratio), survivors]
  const labels = [
    `开局 ${counts[0]}`,
    `过筛 ${counts[1]}`,
    `再过 ${counts[2]}`,
    survivors > 0 ? `留下 ${counts[3]}` : '全灭 0',
  ]
  const palette = ['#cdeafa', '#ffd9b8', '#ddefd3', '#e6dbf7', '#ffd9e2']
  const cellWidth = 197
  const cellHeight = 92
  const cellY = bandY + 23
  for (let index = 0; index < 4; index += 1) {
    const cellX = bandX + 18 + index * (cellWidth + 12)
    context.save()
    context.translate(cellX + cellWidth / 2, cellY + cellHeight / 2)
    context.rotate(((index % 2 === 0 ? -1 : 1) * 0.8 * Math.PI) / 180)
    context.fillStyle = '#fff8e6'
    roundedRect(context, -cellWidth / 2, -cellHeight / 2, cellWidth, cellHeight, 10)
    context.fill()
    context.restore()

    // 小人密度 ∝ 剩余人数, 最多 8 个(两排各 4); 全灭格放一只睡觉的
    const count = counts[index]
    const icons = count <= 0 ? 0 : Math.max(1, Math.min(8, Math.round(count / 10)))
    if (icons === 0) {
      context.font = '26px system-ui, sans-serif'
      context.textAlign = 'center'
      context.fillText('💤', cellX + cellWidth / 2, cellY + 42)
    }
    const firstRow = Math.min(4, icons)
    const secondRow = icons - firstRow
    for (let person = 0; person < icons; person += 1) {
      const inFirstRow = person < firstRow
      const rowCount = inFirstRow ? firstRow : secondRow
      const rowIndex = inFirstRow ? person : person - firstRow
      const px = cellX + cellWidth / 2 + (rowIndex - (rowCount - 1) / 2) * 36
      const py = cellY + (inFirstRow ? 22 : 46)
      const isFinalSurvivor = index === 3 && person === 0 && survivors > 0
      drawPerson(
        context,
        px,
        py,
        0.36,
        palette[person % palette.length],
        isFinalSurvivor ? fun.survivor.emoji : '',
        ink,
      )
    }
    context.fillStyle = ink
    context.font = '700 18px system-ui, "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText(labels[index], cellX + cellWidth / 2, cellY + cellHeight - 10)
  }

  // 字幕: 谁活到最后
  context.fillStyle = ink
  context.font = '700 23px system-ui, "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.fillText(
    survivors > 0
      ? `小人剧场还剩 ${survivors} / 80 · 最后下班的是「${fun.survivor.name}」`
      : '小人剧场全员下班, 一个没剩',
    centerX,
    bandY + bandHeight + 30,
  )
  return 12 + bandHeight + 44
}

export async function renderShareCard(
  dto: ShareDto,
  dependencies: CanvasRenderDependencies = {},
): Promise<Blob> {
  const documentRef = dependencies.document ?? globalThis.document
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    throw new ShareCardError('DOCUMENT_UNAVAILABLE', '当前环境无法生成图片，请复制文字版战报。')
  }

  let canvas: HTMLCanvasElement
  try {
    canvas = documentRef.createElement('canvas') as HTMLCanvasElement
  } catch (cause) {
    throw new ShareCardError('CANVAS_UNAVAILABLE', '当前浏览器无法创建画布，请复制文字版战报。', { cause })
  }
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new ShareCardError('CANVAS_UNAVAILABLE', '当前浏览器无法创建画布，请复制文字版战报。')
  }
  canvas.width = WIDTH
  canvas.height = HEIGHT

  let context: CanvasRenderingContext2D | null
  try {
    context = canvas.getContext('2d')
  } catch (cause) {
    throw new ShareCardError('CONTEXT_UNAVAILABLE', '当前浏览器无法初始化画布，请复制文字版战报。', { cause })
  }
  if (!context) {
    throw new ShareCardError('CONTEXT_UNAVAILABLE', '当前浏览器无法初始化画布，请复制文字版战报。')
  }

  // 贴纸墙素材: 与画布初始化并行预热, 失败静默降级为纯文字
  const stickerImages = await collectStickerImages(dto.conditions ?? [])

  const ink = '#3b3050'
  const brown = '#8f4c2d'
  context.fillStyle = '#fbf6ec'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#ffd9e2'
  context.beginPath()
  context.arc(-30, 120, 190, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#cdeafa'
  context.beginPath()
  context.arc(WIDTH + 30, 280, 220, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = ink
  roundedRect(context, 82, 82, WIDTH - 140, HEIGHT - 140, 38)
  context.fill()
  context.fillStyle = '#ffffff'
  roundedRect(context, 70, 70, WIDTH - 140, HEIGHT - 140, 38)
  context.fill()

  const center = WIDTH / 2
  let y = 158
  context.textAlign = 'center'
  context.fillStyle = brown
  context.font = '600 30px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText('💘 心动概率局 · 严肃数据 × 轻松拆条件', center, y)
  y += 74
  context.fillStyle = ink
  context.font = '700 58px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText(dto.title, center, y)
  y += 56
  context.font = '28px system-ui, "Microsoft YaHei", sans-serif'
  context.fillStyle = '#655a75'
  y += drawCenteredWrappedText(
    context,
    [dto.audience.genderLabel, dto.audience.ageRange, dto.region].filter(Boolean).join(' · '),
    center,
    y,
    WIDTH - 260,
    38,
  ) + 40

  if (dto.population) {
    context.fillStyle = '#fff3d9'
    roundedRect(context, 130, y - 50, WIDTH - 260, 150, 28)
    context.fill()
    context.fillStyle = ink
    context.font = '700 42px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(dto.population.estimateLabel, center, y + 4)
    context.fillStyle = '#655a75'
    context.font = '25px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(
      dto.population.priorScenario
        ? `敏感度范围（先验情景口径）：${dto.population.rangeLabel}`
        : `敏感度范围：${dto.population.rangeLabel}`,
      center,
      y + 58,
    )
    y += 132
  }

  // ---------- 趣味区: 钢印 + 淘汰分镜 + 毒舌总评 ----------
  if (dto.fun) {
    const fun = dto.fun
    // SSR 及以上撒糖
    if (['SSR', 'UR', 'M'].includes(fun.tierKey)) {
      context.font = '34px system-ui, sans-serif'
      context.textAlign = 'center'
      const candies = ['🎉', '💖', '✨', '🍬', '🌟', '💘']
      candies.forEach((emoji, index) => {
        const angle = (index / candies.length) * Math.PI * 2
        context.fillText(emoji, center + Math.cos(angle) * 330, y + 30 + Math.sin(angle) * 60)
      })
    }

    drawStamp(context, center, y + 56, fun, ink)
    y += 136
    context.fillStyle = '#655a75'
    context.font = '24px system-ui, "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    y += drawCenteredWrappedText(context, fun.tierComment, center, y, WIDTH - 320, 32, 1) + 10

    // 胶片分镜接管原"幸存者小人"一排: 既讲故事也报幕
    y += drawFilmstrip(context, center, y + 6, fun, ink) + 4

    if (fun.verdict) {
      // 虚线毒舌框(emoji 单独画在框首, 避免代理对被换行拆散)
      const verdictLines = wrapText(context, fun.verdict, WIDTH - 380).slice(0, 2)
      const boxHeight = 34 + verdictLines.length * 34
      context.fillStyle = '#fff8e6'
      roundedRect(context, 130, y - 4, WIDTH - 260, boxHeight, 16)
      context.fill()
      context.strokeStyle = ink
      context.lineWidth = 2.5
      context.setLineDash([10, 8])
      roundedRect(context, 130, y - 4, WIDTH - 260, boxHeight, 16)
      context.stroke()
      context.setLineDash([])
      context.font = '26px system-ui, sans-serif'
      context.textAlign = 'left'
      context.fillText('🌶️', 152, y + 30)
      context.fillStyle = ink
      context.font = '600 24px system-ui, "Microsoft YaHei", sans-serif'
      context.textAlign = 'center'
      verdictLines.forEach((line, index) => context.fillText(line, center + 16, y + 30 + index * 34))
      y += boxHeight + 18
    }
    y += 4
  }

  context.fillStyle = ink
  context.font = '600 27px system-ui, "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  if (dto.scores.entertainment != null && dto.scores.entertainment > 0) {
    context.fillText(`娱乐指数 ${dto.scores.entertainment}/100`, center, y)
    y += 42
  }

  if (dto.conditions && dto.conditions.length > 0) {
    y += 10
    context.textAlign = 'left'
    context.fillStyle = brown
    context.font = '700 26px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText('本次公开条件', 130, y)
    y += 40
    // 贴纸墙: 有剪纸画的条件先亮牌面
    y += drawStickerWall(context, dto.conditions, stickerImages, y, ink)
    context.fillStyle = ink
    context.font = '24px system-ui, "Microsoft YaHei", sans-serif'
    for (const condition of dto.conditions.slice(0, 7)) {
      // 给右下角二维码留位: 条件文字底部不越过 HEIGHT-260
      if (y > HEIGHT - 260) break
      y += drawLeftWrappedText(
        context,
        `• ${condition.label}：${condition.summary}`,
        140,
        y,
        WIDTH - 280,
        32,
      ) + 5
    }
    if (dto.conditions.length > 7 && y <= HEIGHT - 260) {
      context.fillText(`…另有 ${dto.conditions.length - 7} 项已公开条件`, 140, y)
    }
  }

  context.textAlign = 'center'
  context.fillStyle = '#655a75'
  context.font = '22px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText(`模型 ${dto.versions.modelVersion} · 数据 ${dto.versions.dataVersion} · 模型可信度 ${dto.confidenceGrade}`, center, HEIGHT - 165)
  context.fillStyle = brown
  context.font = '600 22px system-ui, "Microsoft YaHei", sans-serif'
  let noticeY = HEIGHT - 118
  for (const line of wrapText(context, dto.notice, WIDTH - 230)) {
    context.fillText(line, center, noticeY)
    noticeY += 28
  }

  drawQr(context, ink)

  return canvasToBlob(canvas)
}
