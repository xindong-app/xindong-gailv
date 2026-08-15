// 维度图鉴收集记录 —— 用过即点亮, 纯 localStorage, 不上传不分析。
const ALBUM_KEY = 'xindong.fun.album'

export function loadCollected(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(ALBUM_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

/** 把当前手牌里的维度并入图鉴收集记录 */
export function recordCollected(ids: readonly string[]): void {
  if (ids.length === 0) return
  try {
    const merged = new Set(loadCollected())
    for (const id of ids) merged.add(id)
    localStorage.setItem(ALBUM_KEY, JSON.stringify([...merged]))
  } catch { /* 存储不可用时静默 */ }
}
