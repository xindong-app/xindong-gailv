/**
 * 反向挑战书 —— 一键复制的纯文案裂变入口。
 * 铁律: 不携带任何用户条件与结果, 复制出去的就是这段固定文案 + 永久入口。
 */

export const CHALLENGE_URL = 'https://xindong-app.github.io/xindong-gailv/'

export function buildChallengeText(): string {
  return [
    '🆚 敢不敢测测你的理想型有多难找？',
    '我刚算完我的，当场被数据毒打了一顿。',
    '全程本地计算，不上传任何信息 →',
    CHALLENGE_URL,
  ].join('\n')
}

/** 复制挑战书: Clipboard API 优先, 退化到隐藏 textarea; 返回是否成功 */
export async function copyChallenge(): Promise<boolean> {
  const text = buildChallengeText()
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 剪贴板权限被拒时继续走兜底
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}
