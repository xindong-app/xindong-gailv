import type { ShareDto } from './types'
import { ShareCardError } from './types'

const WIDTH = 1080
const HEIGHT = 1350

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
  let y = 170
  context.textAlign = 'center'
  context.fillStyle = brown
  context.font = '600 30px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText('严肃数据 × 轻松拆条件', center, y)
  y += 82
  context.fillStyle = ink
  context.font = '700 58px system-ui, "Microsoft YaHei", sans-serif'
  context.fillText(dto.title, center, y)
  y += 62
  context.font = '28px system-ui, "Microsoft YaHei", sans-serif'
  context.fillStyle = '#655a75'
  y += drawCenteredWrappedText(
    context,
    [dto.audience.genderLabel, dto.audience.ageRange, dto.region].filter(Boolean).join(' · '),
    center,
    y,
    WIDTH - 260,
    38,
  ) + 44

  if (dto.population) {
    context.fillStyle = '#fff3d9'
    roundedRect(context, 130, y - 50, WIDTH - 260, 166, 28)
    context.fill()
    context.fillStyle = ink
    context.font = '700 42px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(dto.population.estimateLabel, center, y + 4)
    context.fillStyle = '#655a75'
    context.font = '25px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText(`敏感度范围：${dto.population.rangeLabel}`, center, y + 62)
    y += 166
  }

  context.fillStyle = ink
  context.font = '600 29px system-ui, "Microsoft YaHei", sans-serif'
  if (dto.scores.entertainment != null && dto.scores.entertainment > 0) {
    context.fillText(`娱乐指数 ${dto.scores.entertainment}/100`, center, y)
    y += 48
  }

  if (dto.conditions && dto.conditions.length > 0) {
    y += 20
    context.textAlign = 'left'
    context.fillStyle = brown
    context.font = '700 27px system-ui, "Microsoft YaHei", sans-serif'
    context.fillText('本次公开条件', 130, y)
    y += 48
    context.fillStyle = ink
    context.font = '25px system-ui, "Microsoft YaHei", sans-serif'
    for (const condition of dto.conditions.slice(0, 8)) {
      if (y > HEIGHT - 270) break
      y += drawLeftWrappedText(
        context,
        `• ${condition.label}：${condition.summary}`,
        140,
        y,
        WIDTH - 280,
        34,
      ) + 8
    }
    if (dto.conditions.length > 8 && y <= HEIGHT - 270) {
      context.fillText(`…另有 ${dto.conditions.length - 8} 项已公开条件`, 140, y)
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

  return canvasToBlob(canvas)
}
