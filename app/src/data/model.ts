/**
 * Runtime parameters used by the population engine.
 *
 * Important: an official mean or prevalence is not automatically an official
 * threshold distribution. Parameters marked C below are replaceable modelling
 * assumptions constrained by the machine-readable evidence registry. The
 * engine propagates their uncertainty and never presents them as direct counts.
 */

type Gender = 'male' | 'female'

function interpolate(points: ReadonlyArray<readonly [number, number]>, value: number): number {
  if (value <= points[0][0]) return points[0][1]
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1]
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index]
    const [x1, y1] = points[index + 1]
    if (value >= x0 && value <= x1) return y0 + ((y1 - y0) * (value - x0)) / (x1 - x0)
  }
  return points[points.length - 1][1]
}

// ---------- Height ---------------------------------------------------------
// A-grade centres: Fifth National Physical Fitness Monitoring Bulletin (2020),
// evidence.appearance.height.sport-monitoring-2020.
// C-grade dispersion: evidence.appearance.height.distribution-assumption.
const HEIGHT_MEANS: Record<Gender, ReadonlyArray<readonly [number, number]>> = {
  male: [[22, 172.6], [27, 172.1], [32, 171.4], [37, 170.4], [42, 169.4], [47, 168.7], [52, 167.9]],
  female: [[22, 160.6], [27, 159.8], [32, 159.1], [37, 158.6], [42, 158.0], [47, 157.7], [52, 157.0]],
}

export const HEIGHT_DISTRIBUTION_GRADE = 'C' as const
export const HEIGHT_SD_SCENARIOS: Readonly<Record<Gender, {
  conservative: number
  baseline: number
  optimistic: number
}>> = {
  male: { conservative: 5.8, baseline: 6.2, optimistic: 6.6 },
  female: { conservative: 5.3, baseline: 5.7, optimistic: 6.1 },
}
export function heightDist(age: number, gender: Gender): { mean: number; sd: number } {
  return {
    mean: interpolate(HEIGHT_MEANS[gender], age),
    // The registry explicitly records these as replaceable C-grade assumptions.
    sd: HEIGHT_SD_SCENARIOS[gender].baseline,
  }
}

// ---------- BMI ------------------------------------------------------------
// The NHC directly anchors overweight (34.3%) and obesity (16.4%), but does not
// publish a complete age-by-sex density in that source. A normal approximation
// is therefore C-grade even though the two aggregate anchors are A-grade.
export const BMI_DISTRIBUTION_GRADE = 'C' as const
export function bmiDist(age: number, gender: Gender): { mean: number; sd: number } {
  const baseMean = gender === 'male' ? 24.0 : 22.8
  const ageAdjustment = age <= 30 ? -0.8 : age <= 35 ? -0.4 : age <= 45 ? 0 : 0.3
  return { mean: baseMean + ageAdjustment, sd: gender === 'male' ? 4.16 : 4.0 }
}

// ---------- Income (research scenario only) -------------------------------
// The registry has 2025 wage/household/migrant-worker anchors, but no direct
// personal pre-tax income quantiles for every 18–50-year-old. These anchors
// also have different denominators. The constants below remain solely for
// saved-result/research compatibility; population-policy.ts explicitly marks
// economy.income as do_not_apply in the main estimate.
export const INCOME_DISTRIBUTION_GRADE = 'C' as const
export const INCOME_QUANTIFICATION_STATUS = 'research_only' as const
export const INCOME_MAIN_ESTIMATE_EFFECT = 'do_not_apply' as const
/** @deprecated Research scenario centre; 6.09 is an annualised mean, not a median. */
export const INCOME_MEDIAN_WAN = 6.09
/** @deprecated Unvalidated legacy log spread for research sensitivity only. */
export const INCOME_SIGMA = 0.68
/** @deprecated Scale-enterprise employee mean; not an all-adult personal income anchor. */
export const NATIONAL_INCOME_ANCHOR = 106_080

export function incomeAgeFactor(age: number): number {
  return interpolate([
    [20, 0.45], [25, 0.75], [28, 0.92], [30, 1.0], [35, 1.15],
    [40, 1.22], [45, 1.2], [50, 1.1],
  ], age)
}

// ---------- Household wealth (research scenario only) ---------------------
// The 2019 anchor describes urban households, while the product asks about a
// target person's/family's threshold across mainland adults. No denominator-
// matched, current age×sex×city microdistribution is available. Keep these
// legacy parameters for sensitivity experiments only; never reduce main count.
export const WEALTH_DISTRIBUTION_GRADE = 'C' as const
export const WEALTH_QUANTIFICATION_STATUS = 'research_only' as const
export const WEALTH_MAIN_ESTIMATE_EFFECT = 'do_not_apply' as const
/** @deprecated 2019 urban-household research anchor; not a mainland personal median. */
export const WEALTH_MEDIAN_WAN = 163
/** @deprecated Unvalidated log spread for research sensitivity only. */
export const WEALTH_SIGMA = 0.563
export function wealthAgeFactor(age: number): number {
  return interpolate([
    [22, 0.35], [25, 0.45], [30, 0.7], [35, 1.0], [40, 1.3], [45, 1.5], [50, 1.6],
  ], age)
}

// ---------- Education ------------------------------------------------------
// The direct census table supports age/sex extraction, but that extraction is
// not yet bundled as a complete runtime table. These cohort parameters remain
// C-grade approximations and are never labelled A/B in the UI.
export const EDUCATION_DISTRIBUTION_GRADE = 'C' as const
export const EDU = {
  juniorPlus: 0.38,
  bachelorPlus: 0.22,
  masterPlus: 0.05,
  phd: 0.006,
} as const

export function eduAgeFactor(age: number): number {
  return interpolate([
    [22, 1.12], [25, 1.1], [30, 1.0], [35, 0.85], [40, 0.6], [45, 0.45], [50, 0.35],
  ], age)
}

// Conditional income shifts are model assumptions, not causal returns.
export const EDU_INCOME_PREMIUM: Readonly<Record<string, number>> = {
  大专: 0.85,
  本科: 1.5,
  硕士: 1.9,
  博士: 2.4,
}

// ---------- Housing and vehicle (research scenario only) ------------------
// Household ownership and vehicles-per-100-households do not identify whether
// the target individual owns a local home/car of the requested type/price.
// These legacy baselines may power an explicitly labelled sensitivity sandbox,
// but population-policy.ts forbids using them in the main estimate.
export const HOUSE_QUANTIFICATION_STATUS = 'research_only' as const
export const HOUSE_MAIN_ESTIMATE_EFFECT = 'do_not_apply' as const
export const VEHICLE_QUANTIFICATION_STATUS = 'research_only' as const
export const VEHICLE_MAIN_ESTIMATE_EFFECT = 'do_not_apply' as const
/** @deprecated Assumption, not an observed probability for the product definition. */
export const HOUSE_LOCAL_RATE = 0.45
/** @deprecated Assumption, not an observed personal vehicle probability. */
export const CAR_RATE = 0.35

// ---------- Lifestyle ------------------------------------------------------
// Direct 2024 China CDC current-smoking complements.
export function nonSmokerRate(gender: Gender): number {
  return gender === 'male' ? 0.561 : 0.982
}

/**
 * 2024 China CDC alcohol-use complements.
 * - notRegular: no alcohol in the past 30 days (male 65.7%, female 94.1%).
 * - none: no alcohol in the past 12 months (male 55.5%, female 89.8%).
 * The internal enum names are retained for saved-session compatibility; the
 * registry and visible labels define the actual recall-period semantics.
 */
export function drinkingRate(gender: Gender, level: 'none' | 'notRegular', age?: number): number {
  const sexRate = level === 'notRegular'
    ? (gender === 'male' ? 0.657 : 0.941)
    : (gender === 'male' ? 0.555 : 0.898)
  if (age == null) return sexRate
  // Public tables expose age bands and sex only as separate marginals, not a
  // joint age×sex table. Apply the age-band prevalence ratio to the sex
  // marginal (raking approximation), then clamp to a probability. This is C,
  // not a directly observed age×sex rate.
  const ageUseRate = age <= 24
    ? (level === 'notRegular' ? 0.143 : 0.220)
    : age <= 44
      ? (level === 'notRegular' ? 0.232 : 0.325)
      : (level === 'notRegular' ? 0.212 : 0.273)
  const allAgeUseRate = level === 'notRegular' ? 0.203 : 0.276
  const adjustedUseRate = (1 - sexRate) * ageUseRate / allAgeUseRate
  return Math.min(1, Math.max(0, 1 - adjustedUseRate))
}

export interface ProbabilityScenario {
  conservative: number
  baseline: number
  optimistic: number
}

/**
 * C-grade raking sensitivity. The registry's 30-day all-age prevalence range
 * (18.4%–22.2%, centre 20.3%) is propagated through the actual raking
 * denominator. The 12-month branch uses the same relative uncertainty because
 * no separate joint age×sex table is available. This is a scenario range, not
 * a sampling confidence interval.
 */
export function drinkingRateScenario(
  gender: Gender,
  level: 'none' | 'notRegular',
  age: number,
): ProbabilityScenario {
  const baseline = drinkingRate(gender, level, age)
  const sexRate = level === 'notRegular'
    ? (gender === 'male' ? 0.657 : 0.941)
    : (gender === 'male' ? 0.555 : 0.898)
  const ageUseRate = age <= 24
    ? (level === 'notRegular' ? 0.143 : 0.220)
    : age <= 44
      ? (level === 'notRegular' ? 0.232 : 0.325)
      : (level === 'notRegular' ? 0.212 : 0.273)
  const centralDenominator = level === 'notRegular' ? 0.203 : 0.276
  const lowerDenominator = centralDenominator * (0.184 / 0.203)
  const upperDenominator = centralDenominator * (0.222 / 0.203)
  const noUseAtDenominator = (denominator: number) => Math.min(
    1,
    Math.max(0, 1 - ((1 - sexRate) * ageUseRate / denominator)),
  )
  return {
    conservative: Math.min(baseline, noUseAtDenominator(lowerDenominator)),
    baseline,
    optimistic: Math.max(baseline, noUseAtDenominator(upperDenominator)),
  }
}

// ---------- Hair -----------------------------------------------------------
// Complement of age-specific androgenetic alopecia prevalence in the six-city
// community study. The paper reports the same four age bands for both sexes.
export function fullHairRate(age: number, gender: Gender): number {
  if (gender === 'female') {
    if (age < 30) return 0.987
    if (age < 40) return 0.977
    if (age < 50) return 0.946
    return 0.925
  }
  if (age < 30) return 0.972
  if (age < 40) return 0.867
  if (age < 50) return 0.786
  return 0.681
}

// ---------- Correlation ----------------------------------------------------
// Replaceable C-grade dependence assumption. It only joins two already bounded
// marginals; the joint result is clamped below both marginals by the engine.
export const ECON_RHO = 0.45
