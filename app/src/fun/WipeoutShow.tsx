// 团灭专场 —— 仅在「逻辑空集」(条件互相打架, 上下界均证明为 0)时上演。
// 铁律: model_underflow / below_resolution 绝不许冒充团灭 —— 那些只是数不出来。
import { useEffect } from 'react'
import { SoulGhost } from './person'
import { playWipeout } from './sound'

export function WipeoutShow() {
  useEffect(() => { playWipeout() }, [])
  return (
    <div className="wipeout-stage" role="status">
      <div className="wipeout-lamps" aria-hidden="true"><i /><i /><i /></div>
      <div className="wipeout-ghost" aria-hidden="true"><SoulGhost /></div>
      <b>全体下班, 一个没剩</b>
      <p>这组条件在逻辑上互相打架——不是数据找不到人, 是真的没人能同时满足。放人一马, 也放自己一马。</p>
    </div>
  )
}
