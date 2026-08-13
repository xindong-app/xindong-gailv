import type { ModelResult } from '../../engine/modelEngine'
import type { ModelSelection } from '../../model/schema'

export function ShareStep({ result, selection, onShare, onClearSession }: { result: ModelResult; selection: ModelSelection; onShare: () => void; onClearSession: () => void }) {
  return (
    <section className="step-panel" aria-labelledby="share-title">
      <div className="step-heading"><span className="eyebrow">最终关 · 生成战报</span><h2 id="share-title" tabIndex={-1}>战报先预览，敏感信息先刹车</h2><p>生成前会列出公开字段。收入、资产、婚史、健康、关系边界和反向自评默认不进入分享；人数、地区、年龄、条件与娱乐指数都可隐藏。</p></div>
      <div className="share-landing-grid"><article className="share-poster-preview"><div className="share-poster-head"><span>择偶条件分析战报</span><small>条件组合分析</small></div><div className="poster-number">{result.population.displayShort}</div><p>{selection.target.age.min}–{selection.target.age.max} 岁 · {selection.target.gender === 'male' ? '男性' : '女性'}</p><div className="poster-score"><span>娱乐 {result.scores.entertainment}/100</span></div><footer>模型 {result.versions.modelVersion} · 数据 {result.versions.dataVersion}<br />仅供娱乐参考 · 非官方结论</footer></article>
        <div className="share-actions-card"><span className="eyebrow">本地生成</span><h3>下载前你还能隐藏</h3><ul><li>估算人数</li><li>地域</li><li>年龄</li><li>条件列表</li><li>娱乐指数</li></ul><p>所有敏感字段默认关闭。Canvas 不可用时，可复制经过同一白名单处理的文字版。</p><button className="button button-primary button-large" type="button" onClick={onShare}>打开分享预览</button><button className="button button-secondary" type="button" onClick={onClearSession}>清除本次会话草稿</button></div></div>
      <section className="privacy-strip" aria-labelledby="privacy-strip-title"><h3 id="privacy-strip-title">这次会话的数据去了哪里？</h3><dl><div><dt>保存</dt><dd>仅将非敏感草稿放在本标签页 sessionStorage，关闭标签页自动结束。</dd></div><div><dt>上传</dt><dd>不上传筛选，不调用第三方 API，不含分析脚本。</dd></div><div><dt>清除</dt><dd>上方按钮可立即清掉安全草稿；刷新只保留非敏感会话项。</dd></div><div><dt>分享</dt><dd>只把预览中明确勾选的白名单字段绘制为本地图片。</dd></div></dl></section>
    </section>
  )
}
