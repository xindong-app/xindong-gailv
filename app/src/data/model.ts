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
export function heightDist(age: number, gender: Gender): { mean: number; sd: number } {
  return {
    mean: interpolate(HEIGHT_MEANS[gender], age),
    // The registry explicitly records these as replaceable C-grade assumptions.
    sd: gender === 'male' ? 6.2 : 5.7,
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

// ---------- Income ---------------------------------------------------------
// The registry has 2025 wage/household/migrant-worker anchors, but no direct
// personal pre-tax income quantiles for every 18–50-year-old. The centre and
// spread below are consequently C-grade. The previous unsupported piecewise
// million-income tail has intentionally been removed; the engine now uses one
// continuous lognormal sensitivity model.
export const INCOME_DISTRIBUTION_GRADE = 'C' as const
export const INCOME_MEDIAN_WAN = 6.09 // 2025 migrant-worker annualised anchor; not claimed as a national direct median.
export const INCOME_SIGMA = 0.68 // Retained legacy spread, explicitly C-grade and widened in output uncertainty.
export const NATIONAL_INCOME_ANCHOR = 106_080 // 2025 scale-enterprise mean wage; anchor only.

export function incomeAgeFactor(age: number): number {
  return interpolate([
    [20, 0.45], [25, 0.75], [28, 0.92], [30, 1.0], [35, 1.15],
    [40, 1.22], [45, 1.2], [50, 1.1],
  ], age)
}

// ---------- Household wealth ---------------------------------------------
// A-grade median and C-grade log spread are both registered. High-wealth
// piecewise tails from the old model were removed because they lacked an active
// evidence entry with the same denominator.
export const WEALTH_DISTRIBUTION_GRADE = 'C' as const
export const WEALTH_MEDIAN_WAN = 163
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

// ---------- Housing and vehicle -------------------------------------------
// These are the registry's explicit C-grade sensitivity baselines for a target
// individual, not the A-grade household ownership calibration values.
export const HOUSE_LOCAL_RATE = 0.45
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

// ---------- Hair -----------------------------------------------------------
// Complement of age-specific androgenetic alopecia prevalence in the six-city
// community study. Female age-specific values are unavailable, so the female
// branch uses the reported overall complement and remains C-grade in runtime.
export function fullHairRate(age: number, gender: Gender): number {
  if (gender === 'female') return 0.94
  if (age < 30) return 0.972
  if (age < 40) return 0.867
  if (age < 50) return 0.786
  return 0.681
}

// ---------- Correlation ----------------------------------------------------
// Replaceable C-grade dependence assumption. It only joins two already bounded
// marginals; the joint result is clamped below both marginals by the engine.
export const ECON_RHO = 0.45
