/**
 * 二期 · 道具卡贴纸(纯呈现层)
 * 维度 id → AI 剪纸贴纸资源映射。这里只做"哪张图贴哪张卡",
 * 维度本身的定义与概率归属以 model/dimensions.ts 注册表为准(勿在此改数据)。
 */

const STICKER_NAMES: Record<string, string> = {
  'base.gender': 'gender',
  'base.age': 'age',
  'base.region': 'region',
  'base.marital': 'marital',
  'appearance.height': 'height',
  'appearance.body_type': 'bodytype',
  'appearance.hair_full': 'hair',
  'education.level': 'education',
  'education.school': 'school',
  'economy.income': 'income',
  'economy.wealth': 'wealth',
  'economy.house': 'house',
  'economy.vehicle': 'vehicle',
  'lifestyle.smoking': 'smoking',
  'lifestyle.drinking': 'drinking',
  'health.chronic': 'chronic',
  'health.myopia': 'myopia',
  'entertainment.zodiac': 'zodiac',
  'entertainment.mbti': 'mbti',
}

export function stickerFor(dimensionId: string): string | null {
  const name = STICKER_NAMES[dimensionId]
  return name ? `${import.meta.env.BASE_URL}assets/stickers/${name}.webp` : null
}
