import {
  array,
  boolean,
  enum as enumSchema,
  number,
  object,
  preprocess,
  string,
  type infer as Infer,
  type ZodType,
} from 'zod/v4'
import { CITIES } from '../data/cities'
import { MAX_MODEL_AGE, MIN_MODEL_AGE } from '../data/population'

export const GENDERS = ['male', 'female'] as const
export const MARITAL_STATUSES = [
  'never_married',
  'divorced',
  'widowed',
] as const
export const BODY_TYPES = [
  'underweight', 'slim', 'balanced', 'standard', 'soft', 'full', 'round',
] as const
export const EDUCATION_LEVELS = ['junior_college', 'bachelor', 'master', 'doctorate'] as const
export const SCHOOL_TIERS = ['top2', 'c9', '985', '211'] as const
export const HOUSE_LOCATIONS = ['core', 'urban', 'suburban'] as const
export const HOUSE_TYPES = ['apartment', 'large_flat', 'villa', 'courtyard'] as const
export const CAR_PRICE_BANDS = ['under_10', '10_20', '20_50', '50_100', 'over_100'] as const
export const HEALTH_CRITERIA = ['no_major_chronic', 'no_myopia'] as const
export const HAIR_CRITERIA = ['full_hair'] as const
export const ZODIACS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const
export const MBTI_POLES = ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'] as const

export const SOFT_PREFERENCE_IDS = [
  // These two keep dedicated controls/fields because their option payload is
  // structured, but the engine routes them as soft preferences.
  'education.school',
  'health.myopia',
  'health.chronic',
  'appearance.training_habit',
  'appearance.grooming',
  'appearance.style',
  'appearance.dental_neatness',
  'appearance.tattoo_preference',
  'appearance.hairline_preference',
  'appearance.gray_hair_preference',
  'lifestyle.exercise',
  'lifestyle.sleep_rhythm',
  'lifestyle.cooking',
  'lifestyle.housework',
  'lifestyle.cleanliness',
  'lifestyle.diet',
  'lifestyle.pet_attitude',
  'lifestyle.travel',
  'lifestyle.gaming',
  'lifestyle.social_frequency',
  'lifestyle.commute_tolerance',
  'family.only_child',
  'family.parents_pension',
  'family.boundaries',
  'family.eldercare_plan',
  'family.separate_living',
  'career.in_system',
  'career.stability',
  'career.work_intensity',
  'career.business_trip',
  'finance.saving_style',
  'finance.transparency',
  'finance.joint_planning',
  'relationship.currently_single',
  'relationship.orientation_compatible',
  'relationship.history_preference',
  'relationship.marriage_timeline',
  'relationship.children_plan',
  'relationship.intimacy_health',
  'relationship.stamina',
  'relationship.energy',
  'communication.frequency',
  'communication.conflict_repair',
  'communication.emotional_expression',
  'communication.alone_time',
  'values.loyalty',
  'values.gender_roles',
  'values.partner_career_support',
  'values.privacy_boundary',
  'future.settlement',
  'future.home_purchase',
  'future.care_distribution',
  'interest.shared_activities',
] as const

const uniqueArray = <T extends ZodType>(item: T, maximum: number) =>
  array(item).max(maximum).refine((values) => new Set(values).size === values.length, {
    message: '不能包含重复值',
  })

const cityNames = new Set(['全国', ...CITIES.map((city) => city.name)])
const citySchema = string().refine((city) => cityNames.has(city), { message: '不支持的城市' })

const targetSchema = object({
  gender: enumSchema(GENDERS),
  age: object({
    min: number().int().min(MIN_MODEL_AGE).max(MAX_MODEL_AGE),
    max: number().int().min(MIN_MODEL_AGE).max(MAX_MODEL_AGE),
  }).refine((age) => age.min <= age.max, {
    message: '最小年龄不能大于最大年龄',
    path: ['max'],
  }),
  cities: uniqueArray(citySchema, CITIES.length + 1).refine(
    (cities) => !cities.includes('全国') || cities.length === 1,
    { message: '选择全国时不能同时选择城市' },
  ),
  maritalStatuses: uniqueArray(enumSchema(MARITAL_STATUSES), MARITAL_STATUSES.length),
  heightCm: object({
    min: number().int().min(130).max(220).nullable(),
    max: number().int().min(130).max(220).nullable(),
  }).refine(
    (height) => height.min == null || height.max == null || height.min <= height.max,
    { message: '最低身高不能大于最高身高', path: ['max'] },
  ).nullable(),
}).strict()

const correlatedSchema = object({
  bodyTypes: uniqueArray(enumSchema(BODY_TYPES), BODY_TYPES.length),
  minAnnualIncomeWan: number().min(0).max(10_000).nullable(),
  minHouseholdWealthWan: number().min(0).max(1_000_000).nullable(),
  educationLevels: uniqueArray(enumSchema(EDUCATION_LEVELS), EDUCATION_LEVELS.length),
  schoolTier: enumSchema(SCHOOL_TIERS).nullable(),
  housing: object({
    required: boolean(),
    location: enumSchema(HOUSE_LOCATIONS).nullable(),
    minAreaSqm: number().int().min(1).max(2_000).nullable(),
    type: enumSchema(HOUSE_TYPES).nullable(),
  }).strict(),
  vehicle: object({
    required: boolean(),
    priceBands: uniqueArray(enumSchema(CAR_PRICE_BANDS), CAR_PRICE_BANDS.length),
  }).strict(),
  smoking: enumSchema(['any', 'non_smoker']),
  drinking: enumSchema(['any', 'not_regular', 'none']),
  healthCriteria: uniqueArray(enumSchema(HEALTH_CRITERIA), HEALTH_CRITERIA.length),
  hairCriteria: uniqueArray(enumSchema(HAIR_CRITERIA), HAIR_CRITERIA.length),
}).strict()

const entertainmentSchema = object({
  zodiacs: uniqueArray(enumSchema(ZODIACS), ZODIACS.length),
  mbti: uniqueArray(enumSchema(MBTI_POLES), MBTI_POLES.length).refine((poles) => {
    const axes = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']] as const
    return axes.every(([left, right]) => !(poles.includes(left) && poles.includes(right)))
  }, { message: '同一 MBTI 轴只能选择一端' }),
}).strict()

const LEGACY_MARITAL_STATUS_MAP: Readonly<Record<string, (typeof MARITAL_STATUSES)[number] | undefined>> = {
  divorced_no_children: 'divorced',
  divorced_with_children: 'divorced',
}

/** Migrate only the retired child-split enum; unknown values still fail Zod. */
export function migrateLegacySelectionInput(input: unknown): unknown {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return input
  const root = input as Record<string, unknown>
  const target = root.target
  if (target == null || typeof target !== 'object' || Array.isArray(target)) return input
  const targetRecord = target as Record<string, unknown>
  if (!Array.isArray(targetRecord.maritalStatuses)) return input
  const migrated = targetRecord.maritalStatuses.map((status) =>
    typeof status === 'string' ? (LEGACY_MARITAL_STATUS_MAP[status] ?? status) : status,
  )
  return {
    ...root,
    target: {
      ...targetRecord,
      // Both former child-split categories map to the same official category.
      maritalStatuses: [...new Set(migrated)],
    },
  }
}

const currentSelectionSchema = object({
  target: targetSchema,
  correlated: correlatedSchema,
  softPreferenceIds: uniqueArray(enumSchema(SOFT_PREFERENCE_IDS), SOFT_PREFERENCE_IDS.length),
  entertainment: entertainmentSchema,
  selfPreferenceIds: uniqueArray(enumSchema(SOFT_PREFERENCE_IDS), SOFT_PREFERENCE_IDS.length),
}).strict()

export const selectionSchema = preprocess(migrateLegacySelectionInput, currentSelectionSchema)

export type ModelSelection = Infer<typeof selectionSchema>
export type GenderId = ModelSelection['target']['gender']
export type MaritalStatusId = ModelSelection['target']['maritalStatuses'][number]
export type BodyTypeId = ModelSelection['correlated']['bodyTypes'][number]
export type EducationId = ModelSelection['correlated']['educationLevels'][number]
export type SchoolTierId = NonNullable<ModelSelection['correlated']['schoolTier']>
export type HealthCriterionId = ModelSelection['correlated']['healthCriteria'][number]
export type HairCriterionId = ModelSelection['correlated']['hairCriteria'][number]
export type HouseLocationId = NonNullable<ModelSelection['correlated']['housing']['location']>
export type HouseTypeId = NonNullable<ModelSelection['correlated']['housing']['type']>
export type CarBandId = ModelSelection['correlated']['vehicle']['priceBands'][number]
export type SoftPreferenceId = ModelSelection['softPreferenceIds'][number]
export type ZodiacId = ModelSelection['entertainment']['zodiacs'][number]
export type MbtiPoleId = ModelSelection['entertainment']['mbti'][number]

export const DEFAULT_SELECTION: ModelSelection = {
  target: {
    gender: 'male',
    age: { min: 26, max: 34 },
    cities: ['全国'],
    // 婚史是敏感条件：安全默认值必须是不筛选，由用户主动选择。
    maritalStatuses: [],
    heightCm: null,
  },
  correlated: {
    bodyTypes: [],
    minAnnualIncomeWan: null,
    minHouseholdWealthWan: null,
    educationLevels: [],
    schoolTier: null,
    housing: { required: false, location: null, minAreaSqm: null, type: null },
    vehicle: { required: false, priceBands: [] },
    smoking: 'any',
    drinking: 'any',
    healthCriteria: [],
    hairCriteria: [],
  },
  softPreferenceIds: [],
  entertainment: { zodiacs: [], mbti: [] },
  selfPreferenceIds: [],
}

export function parseSelection(input: unknown): ModelSelection {
  return selectionSchema.parse(input)
}

export function safeParseSelection(input: unknown) {
  return selectionSchema.safeParse(input)
}
