import { computeModel, type ModelResult } from './modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../model/schema'

/** Old UI shape retained solely as a migration boundary. */
export interface LegacySelection {
  gender: 'male' | 'female'
  ageMin: number
  ageMax: number
  cities: string[]
  marital: string[]
  heightMin: number | null
  bmi: string[]
  incomeMin: number | null
  wealthMin: number | null
  needHouse: boolean
  houseLoc: string | null
  houseArea: number | null
  houseType: string | null
  needCar: boolean
  edu: string[]
  school: string | null
  noSmoke: boolean
  drink: 'any' | 'notRegular' | 'none'
  tattooFree: boolean
  hair: string[]
  zodiacs: string[]
  carBands: string[]
  health: string[]
  intimacy: string[]
  bonus: string[]
  emotion: string[]
  mbti: string[]
}

const mapValues = <T extends string>(values: readonly string[], mapping: Readonly<Record<string, T>>): T[] =>
  values.flatMap((value) => mapping[value] == null ? [] : [mapping[value]])

export function fromLegacySelection(legacy: LegacySelection): ModelSelection {
  const softPreferenceIds: ModelSelection['softPreferenceIds'] = []
  if (legacy.tattooFree) softPreferenceIds.push('appearance.tattoo_preference')
  if (legacy.bmi.includes('训练痕迹')) softPreferenceIds.push('appearance.training_habit')
  if (legacy.hair.includes('发际线在线')) softPreferenceIds.push('appearance.hairline_preference')
  if (legacy.hair.includes('无少白头')) softPreferenceIds.push('appearance.gray_hair_preference')
  if (legacy.health.includes('每周锻炼')) softPreferenceIds.push('lifestyle.exercise')
  if (legacy.health.includes('睡眠良好')) softPreferenceIds.push('lifestyle.sleep_rhythm')
  if (legacy.health.includes('牙齿整齐')) softPreferenceIds.push('appearance.dental_neatness')
  if (legacy.intimacy.includes('功能在线')) softPreferenceIds.push('relationship.intimacy_health')
  if (legacy.intimacy.includes('持久战')) softPreferenceIds.push('relationship.stamina')
  if (legacy.intimacy.includes('精力在线')) softPreferenceIds.push('relationship.energy')
  if (legacy.intimacy.includes('恋爱史简单')) softPreferenceIds.push('relationship.history_preference')
  if (legacy.bonus.includes('体制内')) softPreferenceIds.push('career.in_system')
  if (legacy.bonus.includes('父母有退休金')) softPreferenceIds.push('family.parents_pension')
  if (legacy.bonus.includes('独生子女')) softPreferenceIds.push('family.only_child')
  if (legacy.bonus.includes('会做饭')) softPreferenceIds.push('lifestyle.cooking')
  if (legacy.emotion.includes('目前单身')) softPreferenceIds.push('relationship.currently_single')
  if (legacy.emotion.includes('取向为异性')) softPreferenceIds.push('relationship.orientation_compatible')

  const maritalStatuses = mapValues(legacy.marital, {
    未婚: 'never_married', 离异无孩: 'divorced', 离异有孩: 'divorced', 离婚未再婚: 'divorced', 丧偶: 'widowed', 丧偶未再婚: 'widowed',
  } as const)
  const bodyTypes = mapValues(legacy.bmi.filter((value) => value !== '训练痕迹'), {
    骨感: 'underweight', 纤细: 'slim', 匀称: 'balanced', 标准: 'standard',
    微胖: 'soft', 丰腴: 'full', 圆滚滚: 'round',
  } as const)
  const educationLevels = mapValues(legacy.edu, {
    大专: 'junior_college', 本科: 'bachelor', 硕士: 'master', 博士: 'doctorate',
  } as const)
  const schoolTier = ({ 清北: 'top2', C9: 'c9', '985': '985', '211': '211' } as const)[legacy.school as '清北' | 'C9' | '985' | '211'] ?? null
  const location = ({ 核心区: 'core', 市区: 'urban', 郊区: 'suburban' } as const)[legacy.houseLoc as '核心区' | '市区' | '郊区'] ?? null
  const houseType = ({ 普通住宅: 'apartment', 大平层: 'large_flat', 别墅: 'villa', 四合院: 'courtyard' } as const)[legacy.houseType as '普通住宅' | '大平层' | '别墅' | '四合院'] ?? null
  const priceBands = mapValues(legacy.carBands, {
    '10万以下': 'under_10', '10-20万': '10_20', '20-50万': '20_50', '50-100万': '50_100', '100万以上': 'over_100',
  } as const)
  const zodiacs = mapValues(legacy.zodiacs, {
    白羊座: 'aries', 金牛座: 'taurus', 双子座: 'gemini', 巨蟹座: 'cancer', 狮子座: 'leo', 处女座: 'virgo',
    天秤座: 'libra', 天蝎座: 'scorpio', 射手座: 'sagittarius', 摩羯座: 'capricorn', 水瓶座: 'aquarius', 双鱼座: 'pisces',
  } as const)

  return {
    target: {
      gender: legacy.gender,
      age: { min: legacy.ageMin, max: legacy.ageMax },
      cities: legacy.cities.length === 0 ? ['全国'] : [...legacy.cities],
      // Empty deliberately remains empty: it means no marital filter.
      maritalStatuses: [...new Set(maritalStatuses)],
      heightCm: legacy.heightMin == null ? null : { min: legacy.heightMin, max: null },
    },
    correlated: {
      bodyTypes,
      minAnnualIncomeWan: legacy.incomeMin,
      minHouseholdWealthWan: legacy.wealthMin,
      educationLevels,
      schoolTier,
      housing: { required: legacy.needHouse, location, minAreaSqm: legacy.houseArea, type: houseType },
      vehicle: { required: legacy.needCar, priceBands },
      smoking: legacy.noSmoke ? 'non_smoker' : 'any',
      drinking: legacy.drink === 'notRegular' ? 'not_regular' : legacy.drink,
      healthCriteria: [
        ...(legacy.health.includes('无慢性病') ? ['no_major_chronic' as const] : []),
      ],
      hairCriteria: legacy.hair.includes('发量王者') ? ['full_hair'] : [],
    },
    softPreferenceIds: [...new Set(softPreferenceIds)],
    entertainment: { zodiacs, mbti: mapValues(legacy.mbti, { E: 'E', I: 'I', S: 'S', N: 'N', T: 'T', F: 'F', J: 'J', P: 'P' } as const) },
    selfPreferenceIds: [...DEFAULT_SELECTION.selfPreferenceIds],
  }
}

export function computeLegacySelection(legacy: LegacySelection): ModelResult {
  return computeModel(fromLegacySelection(legacy))
}
