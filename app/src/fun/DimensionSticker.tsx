import { stickerFor } from './stickers'

/** 装饰性贴纸图: 文本标签已在场, 因此对读屏隐藏 */
export function DimensionSticker({
  dimensionId,
  className = 'card-sticker',
}: {
  dimensionId: string
  className?: string
}) {
  const src = stickerFor(dimensionId)
  if (!src) return null
  return (
    <img
      alt=""
      aria-hidden="true"
      className={className}
      height={474}
      loading="lazy"
      src={src}
      width={512}
    />
  )
}
