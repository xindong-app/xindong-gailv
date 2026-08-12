import { compute, type Selection } from '../src/engine/calc'

const base: Selection = {
  gender: 'male', ageMin: 26, ageMax: 34, cities: ['全国'], marital: ['未婚'],
  heightMin: null, bmi: [], incomeMin: null, wealthMin: null,
  needHouse: false, houseLoc: null, houseArea: null, houseType: null,
  needCar: false, edu: [], school: null, noSmoke: false, drink: 'any',
  tattooFree: false, hair: [], zodiacs: [], carBands: [], health: [],
  intimacy: [], bonus: [], emotion: [], mbti: [],
}

const p = (sel: Selection, key: string) => {
  const s = compute(sel).steps.find((x) => x.key === key)
  return s ? (s.factor * 100).toFixed(2) + '%' : '未启用'
}

console.log('—— OR 语义维度(同档互斥, 多选=并集, 概率应变大) ——')
console.log('身材: 匀称 =', p({ ...base, bmi: ['匀称'] }, 'bmi'),
  '| 匀称+标准 =', p({ ...base, bmi: ['匀称', '标准'] }, 'bmi'),
  '| 七档全选 =', p({ ...base, bmi: ['骨感', '纤细', '匀称', '标准', '微胖', '丰腴', '圆滚滚'] }, 'bmi'))
console.log('星座: 1 个 =', p({ ...base, zodiacs: ['狮子座'] }, 'zodiac'),
  '| 3 个 =', p({ ...base, zodiacs: ['狮子座', '白羊座', '天蝎座'] }, 'zodiac'))
console.log('学历: 本科 =', p({ ...base, edu: ['本科'] }, 'edu'),
  '| 本科+硕士 =', p({ ...base, edu: ['本科', '硕士'] }, 'edu'))

console.log('')
console.log('—— AND 语义维度(每条都是额外要求, 多选=交集, 概率应变小) ——')
console.log('健康: 无慢性病 =', p({ ...base, health: ['无慢性病'] }, 'health'),
  '| +不近视 =', p({ ...base, health: ['无慢性病', '不近视'] }, 'health'),
  '| +每周锻炼 =', p({ ...base, health: ['无慢性病', '不近视', '每周锻炼'] }, 'health'))
console.log('加分项: 体制内 =', p({ ...base, bonus: ['体制内'] }, 'bonus'),
  '| +会做饭 =', p({ ...base, bonus: ['体制内', '会做饭'] }, 'bonus'))

console.log('')
console.log('—— 争议case: 训练痕迹 混在身材档里 ——')
console.log('身材: 匀称 =', p({ ...base, bmi: ['匀称'] }, 'bmi'),
  '| 匀称+训练痕迹 =', p({ ...base, bmi: ['匀称', '训练痕迹'] }, 'bmi'))
