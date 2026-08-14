import {
  discriminatedUnion,
  enum as enumSchema,
  literal,
  number,
  object,
  string,
  type infer as Infer,
} from 'zod/v4'
import { GENDERS } from './schema'

export const relationshipRateRangeSchema = object({
  lower: number().min(0).max(1),
  reference: number().min(0).max(1),
  upper: number().min(0).max(1),
}).strict().superRefine((range, context) => {
  if (range.lower > range.reference) {
    context.addIssue({
      code: 'custom',
      path: ['reference'],
      message: '参考比例不能低于下界',
    })
  }
  if (range.reference > range.upper) {
    context.addIssue({
      code: 'custom',
      path: ['upper'],
      message: '上界不能低于参考比例',
    })
  }
})

export type RelationshipRateRange = Infer<typeof relationshipRateRangeSchema>

export const relationshipCountRangeSchema = object({
  lower: number().finite().min(0),
  reference: number().finite().min(0),
  upper: number().finite().min(0),
}).strict().superRefine((range, context) => {
  if (range.lower > range.reference || range.reference > range.upper) {
    context.addIssue({
      code: 'custom',
      message: '人数范围必须满足下界 ≤ 参考值 ≤ 上界',
    })
  }
})

export type RelationshipCountRange = Infer<typeof relationshipCountRangeSchema>

const availablePopulationSchema = object({
  status: literal('available'),
  estimate: number().finite().min(0),
  zeroMeaning: enumSchema([
    'not_zero',
    'positive_below_resolution',
    'model_underflow',
    'logical_zero',
  ]).optional(),
  range: object({
    conservative: number().finite().min(0),
    baseline: number().finite().min(0),
    optimistic: number().finite().min(0),
  }).strict().superRefine((range, context) => {
    if (range.conservative > range.baseline || range.baseline > range.optimistic) {
      context.addIssue({
        code: 'custom',
        message: '主人口范围必须满足保守值 ≤ 基准值 ≤ 乐观值',
      })
    }
  }),
  modelVersion: string().min(1),
  dataVersion: string().min(1),
}).strict().superRefine((population, context) => {
  const tolerance = Math.max(
    Math.abs(population.estimate),
    Math.abs(population.range.baseline),
  ) * 1e-9
  if (Math.abs(population.estimate - population.range.baseline) > tolerance) {
    context.addIssue({
      code: 'custom',
      path: ['range', 'baseline'],
      message: '主人口 estimate 必须与 range.baseline 一致',
    })
  }
  if (population.zeroMeaning === 'logical_zero' && (
    population.estimate !== 0 ||
    population.range.conservative !== 0 ||
    population.range.optimistic !== 0
  )) {
    context.addIssue({
      code: 'custom',
      path: ['zeroMeaning'],
      message: 'logical_zero 只允许用于已证明上下界均为 0 的逻辑空集',
    })
  }
  if (population.estimate > 0 && population.zeroMeaning === 'model_underflow') {
    context.addIssue({
      code: 'custom',
      path: ['zeroMeaning'],
      message: '正数人口不能标记为 model_underflow',
    })
  }
  if (population.estimate === 0 && (
    population.zeroMeaning === 'not_zero' ||
    population.zeroMeaning === 'positive_below_resolution'
  )) {
    context.addIssue({
      code: 'custom',
      path: ['zeroMeaning'],
      message: '数值 0 不能标记为正数状态',
    })
  }
})

const unavailablePopulationSchema = object({
  status: literal('unavailable'),
  reason: string().min(1),
  modelVersion: string().min(1).optional(),
  dataVersion: string().min(1).optional(),
}).strict()

export const relationshipPopulationLayerSchema = discriminatedUnion('status', [
  availablePopulationSchema,
  unavailablePopulationSchema,
])

export type RelationshipPopulationLayer = Infer<typeof relationshipPopulationLayerSchema>

const factorScenarioOverrideSchema = object({
  status: literal('scenario'),
  range: relationshipRateRangeSchema,
  note: string().min(1).optional(),
}).strict()

const factorUnavailableOverrideSchema = object({
  status: literal('unavailable'),
  reason: string().min(1),
}).strict()

const factorNotEstimatedOverrideSchema = object({
  status: literal('not_estimated'),
  reason: string().min(1),
}).strict()

export const relationshipFactorOverrideSchema = discriminatedUnion('status', [
  factorScenarioOverrideSchema,
  factorUnavailableOverrideSchema,
  factorNotEstimatedOverrideSchema,
])

export type RelationshipFactorOverride = Infer<typeof relationshipFactorOverrideSchema>

export const relationshipScenarioOverridesSchema = object({
  orientationCompatibility: relationshipFactorOverrideSchema.optional(),
  currentlySingle: relationshipFactorOverrideSchema.optional(),
  relationshipWillingness: relationshipFactorOverrideSchema.optional(),
}).strict().default({})

export const relationshipScenarioRequestSchema = object({
  seekerGender: enumSchema(GENDERS),
  targetGender: enumSchema(GENDERS),
  overrides: relationshipScenarioOverridesSchema,
}).strict()

export const relationshipScenarioInputSchema = relationshipScenarioRequestSchema.extend({
  targetPopulation: relationshipPopulationLayerSchema,
}).strict()

export type RelationshipScenarioInput = Infer<typeof relationshipScenarioInputSchema>
export type RelationshipScenarioRequest = Infer<typeof relationshipScenarioRequestSchema>
export type RelationshipPairing = 'male_female' | 'female_male' | 'male_male' | 'female_female'

export function parseRelationshipScenarioInput(input: unknown): RelationshipScenarioInput {
  return relationshipScenarioInputSchema.parse(input)
}
