// 具象化类比 —— 把人数翻译成生活场景, 一句话出圈
// 只在 funAllowed(真实可估算)时调用; 下溢/上限态另有自己的诚实文案。

export interface Analogy {
  emoji: string
  text: string
}

/** 按人数匹配生活场景; count 为估算人数 */
export function buildAnalogy(count: number): Analogy | null {
  if (!Number.isFinite(count) || count < 1) return null
  if (count < 4) return { emoji: '🀄', text: '一桌麻将都凑不齐, 还得三缺一' }
  if (count < 30) return { emoji: '🪑', text: '一间教室都坐不满, 老师点名毫无压力' }
  if (count < 300) return { emoji: '🚇', text: '坐不满一节早高峰的地铁车厢' }
  if (count < 1000) return { emoji: '🏢', text: '包不下写字楼的一层, 顶多占半层' }
  if (count < 5000) return { emoji: '🎤', text: '坐不满一场 Livehouse, 但气氛能拉满' }
  if (count < 30000) return { emoji: '🏟️', text: '填不满一座体育馆, 看台得空一大半' }
  if (count < 200000) return { emoji: '⚽', text: '站得进专业足球场, 还能剩不少台阶' }
  if (count < 1000000) return { emoji: '🏘️', text: '差不多一个小县城的常住人口' }
  if (count < 10000000) return { emoji: '🌆', text: '能组成一座像样的二线城市了' }
  return { emoji: '🗺️', text: '池子大到需要自己画地图' }
}
