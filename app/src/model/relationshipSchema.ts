import {
  _default,
  discriminatedUnion,
  enum as enumSchema,
  extend,
  literal,
  maximum,
  minLength,
  minimum,
  number,
  optional,
  strictObject,
  string,
  superRefine,
  type infer as Infer,
} from 'zod/v4/mini'
import { GENDERS } from './schema'

export const relationshipRateRangeSchema = strictObject({
  lower: number().check(minimum(0), maximum(1)),
  reference: number().check(minimum(0), maximum(1)),
  upper: number().check(minimum(0), maximum(1)),
}).check(superRefine((range, context) => {
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
}))

export type RelationshipRateRange = Infer<typeof relationshipRateRangeSchema>

export const relationshipCountRangeSchema = strictObject({
  lower: number().check(minimum(0)),
  reference: number().check(minimum(0)),
  upper: number().check(minimum(0)),
}).check(superRefine((range, context) => {
  if (range.lower > range.reference || range.reference > range.upper) {
    context.addIssue({
      code: 'custom',
      message: '人数范围必须满足下界 ≤ 参考值 ≤ 上界',
    })
  }
}))

export type RelationshipCountRange = Infer<typeof relationshipCountRangeSchema>

const availablePopulationSchema = strictObject({
  status: literal('available'),
  estimate: number().check(minimum(0)),
  zeroMeaning: optional(enumSchema([
    'not_zero',
    'positive_below_resolution',
    'model_underflow',
    'logical_zero',
  ])),
  range: strictObject({
    conservative: number().check(minimum(0)),
    baseline: number().check(minimum(0)),
    optimistic: number().check(minimum(0)),
  }).check(superRefine((range, context) => {
    if (range.conservative > range.baseline || range.baseline > range.optimistic) {
      context.addIssue({
        code: 'custom',
        message: '主人口范围必须满足保守值 ≤ 基准值 ≤ 乐观值',
      })
    }
  })),
  modelVersion: string().check(minLength(1)),
  dataVersion: string().check(minLength(1)),
}).check(superRefine((population, context) => {
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
}))

const unavailablePopulationSchema = strictObject({
  status: literal('unavailable'),
  reason: string().check(minLength(1)),
  modelVersion: optional(string().check(minLength(1))),
  dataVersion: optional(string().check(minLength(1))),
})

export const relationshipPopulationLayerSchema = discriminatedUnion('status', [
  availablePopulationSchema,
  unavailablePopulationSchema,
])

export type RelationshipPopulationLayer = Infer<typeof relationshipPopulationLayerSchema>

const factorScenarioOverrideSchema = strictObject({
  status: literal('scenario'),
  range: relationshipRateRangeSchema,
  note: optional(string().check(minLength(1))),
})

const factorUnavailableOverrideSchema = strictObject({
  status: literal('unavailable'),
  reason: string().check(minLength(1)),
})

const factorNotEstimatedOverrideSchema = strictObject({
  status: literal('not_estimated'),
  reason: string().check(minLength(1)),
})

export const relationshipFactorOverrideSchema = discriminatedUnion('status', [
  factorScenarioOverrideSchema,
  factorUnavailableOverrideSchema,
  factorNotEstimatedOverrideSchema,
])

export type RelationshipFactorOverride = Infer<typeof relationshipFactorOverrideSchema>

export const relationshipScenarioOverridesSchema = _default(strictObject({
  orientationCompatibility: optional(relationshipFactorOverrideSchema),
  currentlySingle: optional(relationshipFactorOverrideSchema),
  relationshipWillingness: optional(relationshipFactorOverrideSchema),
}), {})

export const relationshipScenarioRequestSchema = strictObject({
  seekerGender: enumSchema(GENDERS),
  targetGender: enumSchema(GENDERS),
  overrides: relationshipScenarioOverridesSchema,
})

export const relationshipScenarioInputSchema = extend(relationshipScenarioRequestSchema, {
  targetPopulation: relationshipPopulationLayerSchema,
})

export type RelationshipScenarioInput = Infer<typeof relationshipScenarioInputSchema>
export type RelationshipScenarioRequest = Infer<typeof relationshipScenarioRequestSchema>
export type RelationshipPairing = 'male_female' | 'female_male' | 'male_male' | 'female_female'

export function parseRelationshipScenarioInput(input: unknown): RelationshipScenarioInput {
  return relationshipScenarioInputSchema.parse(input)
}
