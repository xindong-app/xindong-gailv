import { ShareCardError } from './types'

export interface DownloadDependencies {
  document?: Pick<Document, 'createElement'>
  url?: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
  schedule?: (callback: () => void) => void
}

export function downloadShareBlob(
  blob: Blob,
  filename = '择偶条件分析战报.png',
  dependencies: DownloadDependencies = {},
): void {
  const documentRef = dependencies.document ?? globalThis.document
  const urlRef = dependencies.url ?? globalThis.URL
  if (!documentRef || typeof documentRef.createElement !== 'function' ||
      !urlRef || typeof urlRef.createObjectURL !== 'function' || typeof urlRef.revokeObjectURL !== 'function') {
    throw new ShareCardError('DOWNLOAD_UNAVAILABLE', '当前环境无法下载图片，请复制文字版战报。')
  }

  let objectUrl: string | undefined
  try {
    objectUrl = urlRef.createObjectURL(blob)
    const anchor = documentRef.createElement('a') as HTMLAnchorElement
    if (!anchor || typeof anchor.click !== 'function') {
      throw new ShareCardError('DOWNLOAD_UNAVAILABLE', '当前浏览器无法启动下载，请复制文字版战报。')
    }
    anchor.download = filename
    anchor.href = objectUrl
    anchor.rel = 'noopener'
    anchor.click()
  } catch (cause) {
    if (cause instanceof ShareCardError) throw cause
    throw new ShareCardError('DOWNLOAD_UNAVAILABLE', '分享图片下载失败，请重试或复制文字版战报。', { cause })
  } finally {
    if (objectUrl) {
      const objectUrlToRevoke = objectUrl
      const revoke = () => urlRef.revokeObjectURL(objectUrlToRevoke)
      if (dependencies.schedule) dependencies.schedule(revoke)
      else globalThis.setTimeout(revoke, 0)
    }
  }
}
