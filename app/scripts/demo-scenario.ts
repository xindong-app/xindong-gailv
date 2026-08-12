import { compute, type Selection } from '../src/engine/calc'

const sel: Selection = {
  gender: 'male', ageMin: 26, ageMax: 34, cities: ['杭州'], marital: ['未婚'],
  heightMin: 178, bmi: [], incomeMin: 30, wealthMin: null,
  needHouse: true, houseLoc: null, houseArea: null, houseType: null,
  needCar: false, edu: ['本科', '硕士', '博士'], school: null, noSmoke: true, drink: 'any',
  tattooFree: false, hair: [], zodiacs: [], carBands: [], health: ['无慢性病'],
  intimacy: [], bonus: [], emotion: [], mbti: [],
}

const r = compute(sel)
console.log(`基础池(杭州·26-34·男·未婚): ${Math.round(r.pool / 10000)} 万人\n`)
for (const s of r.steps) {
  console.log(`${s.emoji} ${s.label.padEnd(6, '　')} 保留 ${(s.factor * 100).toFixed(2).padStart(6)}%  → 剩 ${Math.round(s.survivors).toLocaleString()} 人   [${s.note}]`)
}
console.log(`\n最终: ${r.finalP.toExponential(2)} → ${Math.round(r.count)} 人 (每万人 ${r.perWan.toFixed(2)})`)
console.log(`误差带: ${Math.round(r.low)} ~ ${Math.round(r.high)} 人`)
