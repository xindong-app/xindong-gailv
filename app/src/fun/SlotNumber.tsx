// 老虎机数字: 逐位列滚动(纯 transform, 不触发布局), 减少动态/低端场景回落纯文本
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function SlotNumber({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  const chars = [...text]
  return (
    <span aria-label={ariaLabel ?? text} aria-live="polite" aria-atomic="true" className="slot-number" role="text">
      {chars.map((char, index) => {
        const digit = DIGITS.indexOf(char)
        if (digit === -1) {
          // 位置即语义: 稳定索引才能触发滚动过渡
          return <span key={index} className="slot-static">{char}</span>
        }
        return (
          <span key={index} aria-hidden="true" className="slot-reel">
            <span className="slot-strip" style={{ transform: `translateY(-${digit}em)` }}>
              {DIGITS.map((d) => <span key={d} className="slot-digit">{d}</span>)}
            </span>
          </span>
        )
      })}
    </span>
  )
}
