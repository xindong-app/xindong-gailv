import { describe, expect, it, vi } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION } from '../../src/model/schema'
import {
  buildShareDto,
  createDefaultShareSettings,
  downloadShareBlob,
  renderShareCard,
  ShareCardError,
} from '../../src/share'

function dto() {
  return buildShareDto(
    DEFAULT_SELECTION,
    computeModel(DEFAULT_SELECTION),
    createDefaultShareSettings(DEFAULT_SELECTION),
  )
}

function successfulCanvas() {
  const fillText = vi.fn()
  const context = {
    beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(),
    fill: vi.fn(), fillRect: vi.fn(), arc: vi.fn(), fillText,
    measureText: vi.fn((text: string) => ({ width: text.length * 24 })),
    set fillStyle(_value: string) {},
    set font(_value: string) {},
    set textAlign(_value: CanvasTextAlign) {},
  } as unknown as CanvasRenderingContext2D
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
  } as unknown as HTMLCanvasElement
  return { canvas, fillText }
}

describe('canvas failure boundaries', () => {
  it('returns a recognizable error when canvas context is null', async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
      toBlob: vi.fn(),
    } as unknown as HTMLCanvasElement
    const documentStub = { createElement: vi.fn(() => canvas) }

    await expect(renderShareCard(dto(), { document: documentStub }))
      .rejects.toMatchObject({ name: 'ShareCardError', code: 'CONTEXT_UNAVAILABLE' })
  })

  it('returns ENCODE_FAILED when toBlob produces null', async () => {
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(), fillRect: vi.fn(), arc: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
    } as unknown as CanvasRenderingContext2D
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(null)),
    } as unknown as HTMLCanvasElement
    const documentStub = { createElement: vi.fn(() => canvas) }

    await expect(renderShareCard(dto(), { document: documentStub }))
      .rejects.toEqual(expect.objectContaining({ code: 'ENCODE_FAILED' }))
  })

  it('returns a Blob after successful PNG encoding', async () => {
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(), fillRect: vi.fn(), arc: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
    } as unknown as CanvasRenderingContext2D
    const expected = new Blob(['png'], { type: 'image/png' })
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(expected)),
    } as unknown as HTMLCanvasElement

    await expect(renderShareCard(dto(), { document: { createElement: () => canvas } })).resolves.toBe(expected)
  })

  it('wraps long region and condition text instead of drawing an overflowing single line', async () => {
    const longDto = {
      ...dto(),
      region: '北京、上海、广州、深圳、杭州、成都、重庆、武汉、南京、苏州、西安、天津、长沙、青岛、宁波、厦门、郑州、合肥、东莞、佛山',
      conditions: [{
        dimensionId: 'base.region',
        label: '居住地区',
        summary: '北京、上海、广州、深圳、杭州、成都、重庆、武汉、南京、苏州、西安、天津、长沙、青岛、宁波、厦门、郑州、合肥、东莞、佛山',
      }],
    }
    const { canvas, fillText } = successfulCanvas()

    await expect(renderShareCard(longDto, { document: { createElement: () => canvas } })).resolves.toBeInstanceOf(Blob)
    const renderedLines = fillText.mock.calls.map(([text]) => String(text))
    expect(renderedLines).not.toContain(`男性 · 26–34 岁 · ${longDto.region}`)
    expect(renderedLines.some((line) => line.includes('北京、上海'))).toBe(true)
    expect(renderedLines.some((line) => line.includes('东莞、佛山'))).toBe(true)
    expect(renderedLines.filter((line) => line.includes('居住地区') || line.startsWith('、'))).toHaveLength(2)
  })

  it('uses ShareCardError instances callers can branch on', async () => {
    try {
      await renderShareCard(dto(), { document: { createElement: () => ({}) as HTMLCanvasElement } })
      throw new Error('expected failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ShareCardError)
      expect((error as ShareCardError).code).toBe('CANVAS_UNAVAILABLE')
    }
  })
})

describe('safe Blob download lifecycle', () => {
  it('downloads through an object URL and schedules its revocation', () => {
    const click = vi.fn()
    const anchor = { click, download: '', href: '', rel: '' }
    const revokeObjectURL = vi.fn()
    let scheduled: (() => void) | undefined

    downloadShareBlob(new Blob(['image']), 'share.png', {
      document: { createElement: () => anchor as unknown as HTMLAnchorElement },
      url: { createObjectURL: () => 'blob:share-card', revokeObjectURL },
      schedule: (callback) => { scheduled = callback },
    })

    expect(anchor).toMatchObject({
      download: 'share.png',
      href: 'blob:share-card',
      rel: 'noopener',
    })
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    scheduled?.()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:share-card')
  })

  it('still revokes a created URL when starting the download fails', () => {
    const revokeObjectURL = vi.fn()
    const scheduled: Array<() => void> = []
    expect(() => downloadShareBlob(new Blob(['image']), 'share.png', {
      document: { createElement: () => ({ download: '', href: '', rel: '' }) as unknown as HTMLAnchorElement },
      url: { createObjectURL: () => 'blob:failed-download', revokeObjectURL },
      schedule: (callback) => { scheduled.push(callback) },
    })).toThrow(expect.objectContaining({ code: 'DOWNLOAD_UNAVAILABLE' }))

    expect(scheduled).toHaveLength(1)
    scheduled[0]?.()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed-download')
  })
})
