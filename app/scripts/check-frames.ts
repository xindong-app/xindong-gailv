import { computeModel } from '../src/engine/modelEngine'
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
let chain = 1
for (const f of r.frames) {
  chain *= f.factor
  console.log(f.emoji, f.label, 'factor=' + f.factor.toFixed(4), 'survivors=' + f.survivors.toFixed(1), f.evidenceGrade)
}
console.log('---')
console.log('base=', r.population.base.toFixed(0), 'estimate=', r.population.estimate.toFixed(2))
console.log('chain*base=', (chain * r.population.base).toFixed(2), 'match=', Math.abs(chain * r.population.base - r.population.estimate) < 0.01)
