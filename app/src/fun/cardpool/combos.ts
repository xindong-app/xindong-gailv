// 梦幻联动 —— 特定条件组合同时出现在手牌时触发的合体彩蛋。
// 只读手牌里的维度 id, 不读具体取值, 不进分享、不进模型。
export interface Combo {
  id: string
  name: string
  needs: readonly string[]
  line: string
}

export const COMBOS: readonly Combo[] = [
  {
    id: 'moms-favorite',
    name: '丈母娘狂喜三件套',
    needs: ['appearance.height', 'economy.income', 'economy.house'],
    line: '海拔 × 工资条 × 红本本同时亮出——丈母娘已经开始张罗酒席了。',
  },
  {
    id: 'clear-headed',
    name: '人间清醒局',
    needs: ['lifestyle.smoking', 'lifestyle.drinking', 'lifestyle.exercise'],
    line: '不烟、少酒、还运动——你不是在找对象, 是在找道友。',
  },
  {
    id: 'soulmate-pack',
    name: '灵魂伴侣套餐',
    needs: ['communication.frequency', 'communication.conflict_repair', 'communication.emotional_expression'],
    line: '秒回 + 会道歉 + 打直球, 沟通三连齐了, 吵架都吵不散。',
  },
  {
    id: 'mystic-bundle',
    name: '玄学全家桶',
    needs: ['entertainment.zodiac', 'entertainment.mbti'],
    line: '星座配 MBTI, 科学玄学两开花——数据表示不背这锅。',
  },
  {
    id: 'discipline-max',
    name: '自律天花板',
    needs: ['appearance.training_habit', 'lifestyle.exercise', 'lifestyle.cleanliness'],
    line: '训练、运动、洁癖三修, 这不是择偶条件, 是征兵广告。',
  },
  {
    id: 'homebody-kit',
    name: '宅家快乐套装',
    needs: ['lifestyle.gaming', 'lifestyle.cooking', 'lifestyle.pet_attitude'],
    line: '游戏、做饭、撸猫狗——理想的周末已经安排明白了。',
  },
]

/** 返回当前手牌已集齐的联动 */
export function completedCombos(activeIds: ReadonlySet<string>): Combo[] {
  return COMBOS.filter((combo) => combo.needs.every((id) => activeIds.has(id)))
}
