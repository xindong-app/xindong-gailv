// 维度卡面元数据 —— 梗名 + flavor 文案 + 杀伤力分级 + 奖章插画。
// tier 只负责视觉稀有度(这关砍人多狠), 与引擎的概率计算无关。
import type { DimensionRegistryEntry } from '../../model/dimensions'
import type { CardArtKind } from './cardArt'

export type CardTier = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'M'

export interface CardMeta {
  cardName: string
  flavor: string
  tier: CardTier
  art: CardArtKind
}

export const CARD_TIER_NAMES: Record<CardTier, string> = {
  N: '常见款',
  R: '稀有',
  SR: '超级稀有',
  SSR: '极度稀有',
  UR: '传说',
  M: '玄学彩蛋',
}

const META: Record<string, CardMeta> = {
  // ---- 硬核主卡 ----
  'base.gender': { cardName: '性别罗盘', flavor: '第一刀下去，池子对半开', tier: 'R', art: 'compass' },
  'base.age': { cardName: '岁月检票口', flavor: '每一岁，都是一道闸机', tier: 'SR', art: 'ticket' },
  'base.region': { cardName: '缘分 GPS', flavor: '定位越准，池子越真', tier: 'SR', art: 'gps' },
  'base.marital': { cardName: '感情征信报告', flavor: '这一页，翻不翻你定', tier: 'R', art: 'report' },
  'appearance.height': { cardName: '海拔警戒线', flavor: '每一厘米，都是一道筛选阀', tier: 'SR', art: 'ruler' },
  'appearance.body_type': { cardName: '身材盲盒', flavor: '标签是主观的，可爱是真的', tier: 'R', art: 'body' },
  'education.level': { cardName: '学历防伪标', flavor: '知识不一定改命，但一定改池子', tier: 'SR', art: 'cap' },
  'education.school': { cardName: '名校集邮册', flavor: '清北 C9 985，一层一层收', tier: 'R', art: 'stamp' },
  'economy.income': { cardName: '工资条审判庭', flavor: '这一关，池子腰斩再腰斩', tier: 'UR', art: 'money' },
  'economy.wealth': { cardName: '家产 X 光机', flavor: '家底扫一眼，上限已标好', tier: 'UR', art: 'xray' },
  'economy.house': { cardName: '不动产封印', flavor: '红本本上的名字才是硬通货', tier: 'SSR', art: 'house' },
  'economy.vehicle': { cardName: '车库通行证', flavor: '四个轮子的诚意', tier: 'SR', art: 'car' },
  'lifestyle.smoking': { cardName: '烟雾报警器', flavor: '一根烟，烧掉一大片缘分', tier: 'R', art: 'smoke' },
  'lifestyle.drinking': { cardName: '千杯不醉卡', flavor: '感情深一口闷，缘分浅筛完', tier: 'R', art: 'wine' },
  'health.chronic': { cardName: '体检报告单', flavor: '这张只进契合度，不砍人', tier: 'N', art: 'stetho' },
  'health.myopia': { cardName: '高清视界卡', flavor: '5.0 的世界确实稀缺', tier: 'N', art: 'glasses' },
  'appearance.hair_full': { cardName: '发际线保卫战', flavor: '头发还在，缘分就在', tier: 'R', art: 'hair' },
  'entertainment.zodiac': { cardName: '星座玄学盘', flavor: '玄学专区，图一乐', tier: 'M', art: 'star' },
  'entertainment.mbti': { cardName: '人格条形码', flavor: 'E 人 I 人，先对个电波', tier: 'M', art: 'mbti' },
  // ---- 氛围卡(软偏好) ----
  'appearance.training_habit': { cardName: '自律汗水卡', flavor: '汗水从不背叛', tier: 'R', art: 'dumbbell' },
  'appearance.grooming': { cardName: '清爽滤镜', flavor: '干净是顶级性感', tier: 'R', art: 'mirror' },
  'appearance.style': { cardName: '穿搭 OOTD', flavor: '衣品见审美', tier: 'R', art: 'hanger' },
  'lifestyle.exercise': { cardName: '步数卷王', flavor: '步数榜常驻嘉宾', tier: 'N', art: 'sneaker' },
  'lifestyle.cooking': { cardName: '深夜食堂证', flavor: '会做饭的人自带光环', tier: 'R', art: 'pan' },
  'lifestyle.housework': { cardName: '家务合伙人', flavor: '碗谁洗，先说好', tier: 'N', art: 'broom' },
  'lifestyle.cleanliness': { cardName: '整洁强迫症', flavor: '桌面干净，心也不乱', tier: 'N', art: 'sparkles' },
  'lifestyle.diet': { cardName: '干饭搭子', flavor: '吃到一起，才玩得一起', tier: 'N', art: 'bowl' },
  'lifestyle.pet_attitude': { cardName: '铲屎官预备役', flavor: '猫狗双全，人生赢家', tier: 'R', art: 'paw' },
  'lifestyle.travel': { cardName: '旅行青蛙同款', flavor: '说走就走的搭子', tier: 'N', art: 'plane' },
  'lifestyle.gaming': { cardName: '开黑队友证', flavor: '峡谷见，别抢蓝', tier: 'N', art: 'gamepad' },
  'lifestyle.social_frequency': { cardName: '社交电量表', flavor: 'E 人 I 人配对指南', tier: 'N', art: 'battery' },
  'lifestyle.commute_tolerance': { cardName: '异地恋 buff', flavor: '距离是不是问题，先聊聊', tier: 'N', art: 'train' },
  'career.stability': { cardName: '铁饭碗鉴定', flavor: '稳定也是一种浪漫', tier: 'N', art: 'badge' },
  'career.work_intensity': { cardName: '加班豁免券', flavor: '996 还是 955，对齐一下', tier: 'N', art: 'moon' },
  'career.business_trip': { cardName: '出差飞行家', flavor: '里程数换不来陪伴', tier: 'N', art: 'suitcase' },
  'communication.frequency': { cardName: '秒回承诺卡', flavor: '已读不回是重罪', tier: 'R', art: 'chat' },
  'communication.conflict_repair': { cardName: '吵架灭火器', flavor: '会先道歉的人先赢', tier: 'R', art: 'bolt' },
  'communication.emotional_expression': { cardName: '情绪直球手', flavor: '别猜，说出来', tier: 'R', art: 'megaphone' },
  'communication.alone_time': { cardName: '独处充电桩', flavor: '粘人精和独居兽的谈判', tier: 'N', art: 'door' },
  'values.partner_career_support': { cardName: '事业后援会', flavor: '你冲，我兜底', tier: 'R', art: 'fistbump' },
  'future.settlement': { cardName: '定居坐标锚', flavor: '在哪座城，过哪种日子', tier: 'N', art: 'anchor' },
  'future.care_distribution': { cardName: '照护分工表', flavor: '爱也需要排班', tier: 'N', art: 'calendar' },
  'interest.shared_activities': { cardName: '搭子认证卡', flavor: '能玩到一起，才是自己人', tier: 'N', art: 'dice' },
}

const FALLBACK: Record<DimensionRegistryEntry['classification'], CardMeta> = {
  hard_filter: { cardName: '', flavor: '', tier: 'R', art: 'ticket' },
  correlated_hard: { cardName: '', flavor: '', tier: 'SR', art: 'sparkles' },
  soft_preference: { cardName: '', flavor: '', tier: 'N', art: 'sparkles' },
  entertainment: { cardName: '', flavor: '', tier: 'M', art: 'star' },
}

/** 查卡面元数据; 未登记的维度按分类套模板, 保证任何维度都能成卡 */
export function cardMetaFor(dimension: Pick<DimensionRegistryEntry, 'id' | 'label' | 'description' | 'classification'>): CardMeta {
  const hit = META[dimension.id]
  if (hit) return hit
  const base = FALLBACK[dimension.classification]
  return { ...base, cardName: dimension.label, flavor: dimension.description }
}
