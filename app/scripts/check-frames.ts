// 帧链式分解一致性检查: 帧因子相乘必须精确回到引擎最终估算(v4: 综合人口层, 分母=initialPool)
import { computeModel } from '../src/engine/modelEngine'
import { buildFunnelFrames } from '../src/fun/funnelFrames'
import { DEFAULT_SELECTION } from '../src/model/schema'

const sel = structuredClone(DEFAULT_SELECTION)
sel.target.cities = ['杭州']
sel.target.heightCm = { min: 180, max: null }
sel.correlated.educationLevels = ['master', 'doctorate']
sel.correlated.minAnnualIncomeWan = 50
sel.correlated.minHouseholdWealthWan = 500
sel.correlated.housing = { required: true, location: 'core', minAreaSqm: 120, type: null }
sel.correlated.vehicle = { required: true, priceBands: ['20_50'] }
sel.correlated.smoking = 'non_smoker'
sel.correlated.drinking = 'not_regular'
sel.correlated.hairCriteria = ['full_hair']
sel.correlated.bodyTypes = ['balanced', 'standard']

const r = computeModel(sel)
const pool = r.comprehensivePopulation
const frames = buildFunnelFrames(r.input, {
  ...r.computationContext,
  initialPoolEstimate: pool.initialPool.estimate,
})
let chain = 1
for (const f of frames) {
  chain *= f.factor
  console.log(f.emoji, f.label, 'factor=' + f.factor.toFixed(4), 'survivors=' + f.survivors.toFixed(1), f.evidenceGrade)
}
console.log('---')
console.log('initialPool=', pool.initialPool.estimate.toFixed(0), 'estimate=', pool.estimate.toFixed(2))
console.log('chain*initialPool=', (chain * pool.initialPool.estimate).toFixed(2))
const ok = Math.abs(chain * pool.initialPool.estimate - pool.estimate) < 0.01
console.log('match=', ok)
if (!ok) process.exit(1)
