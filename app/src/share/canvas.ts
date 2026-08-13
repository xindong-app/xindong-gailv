import { encode as encodeQr } from 'uqr'
import type { ShareDto } from './types'
import { ShareCardError } from './types'

const WIDTH = 1080
const HEIGHT = 1350

/** 印在战报卡上的入口(永久链接, 临时部署链接 3 小时过期不能上卡) */
const SHARE_URL = 'https://xindong-gailv.vercel.app'

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
  context.font = '20px system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(emoji, 0, -14)
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
    context.fillText(`敏感度范围：${dto.population.rangeLabel}`, center, y + 58)
    y += 132
  }

  // ---------- 趣味区: 钢印 + 幸存者小人 + 毒舌总评 ----------
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

    drawStamp(context, center, y + 58, fun, ink)
    y += 146
    context.fillStyle = '#655a75'
    context.font = '24px system-ui, "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    y += drawCenteredWrappedText(context, fun.tierComment, center, y, WIDTH - 320, 32, 1) + 12

    // 幸存者小人: 最后站着的戴城市皮肤, 旁边排几个气氛组
    const survivors = Math.max(0, Math.min(80, fun.survivors))
    const shown = Math.min(5, Math.max(1, survivors))
    const palette = ['#cdeafa', '#ffd9b8', '#ddefd3', '#e6dbf7', '#ffd9e2']
    const startX = center - ((shown - 1) * 64) / 2
    for (let index = 0; index < shown; index += 1) {
      const isLast = index === shown - 1
      drawPerson(
        context,
        startX + index * 64,
        y + 10,
        0.9,
        palette[index % palette.length],
        isLast ? fun.survivor.emoji : '',
        ink,
      )
    }
    y += 66
    context.fillStyle = ink
    context.font = '700 24px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(
      survivors > 0
        ? `小人剧场还剩 ${survivors} / 80 · 最后下班的是「${fun.survivor.name}」`
        : '小人剧场全员下班, 一个没剩',
      center,
      y,
    )
    y += 30

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
  if (dto.scores.bidirectional != null) {
    context.fillStyle = '#655a75'
    context.font = '600 24px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(`双向命中示意 ${dto.scores.bidirectional}/100（示意，非预测）`, center, y)
    y += 42
  }

  if (dto.conditions && dto.conditions.length > 0) {
    y += 10
    context.textAlign = 'left'
    context.fillStyle = brown
    context.font = '700 26px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText('本次公开条件', 130, y)
    y += 40
    context.fillStyle = ink
    context.font = '24px system-ui, "Microsoft YaHei", sans-serif'
    for (const condition of dto.conditions.slice(0, 7)) {
      // 给右下角二维码留位: 条件文字底部不越过 HEIGHT-264
      if (y > HEIGHT - 270) break
      y += drawLeftWrappedText(
        context,
        `• ${condition.label}：${condition.summary}`,
        140,
        y,
        WIDTH - 280,
        32,
      ) + 5
    }
    if (dto.conditions.length > 7 && y <= HEIGHT - 270) {
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
