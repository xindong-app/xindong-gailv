import type { ModelSelection } from '../model/schema'

export type ShareErrorCode =
  | 'DOCUMENT_UNAVAILABLE'
  | 'CANVAS_UNAVAILABLE'
  | 'CONTEXT_UNAVAILABLE'
  | 'ENCODE_FAILED'
  | 'DOWNLOAD_UNAVAILABLE'

export class ShareCardError extends Error {
  readonly code: ShareErrorCode

  constructor(code: ShareErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ShareCardError'
    this.code = code
  }
}

export interface ShareSettings {
  showCount: boolean
  showRegion: boolean
  showAge: boolean
  showConditions: boolean
  showEntertainment: boolean
  /** Explicitly selected dimension ids. Values outside the registry are ignored. */
  includedDimensionIds: string[]
  /** A second, explicit opt-in required before a sensitive field may be shared. */
  sensitiveConsentDimensionIds: string[]
}

export interface ShareFieldCandidate {
  dimensionId: string
  label: string
  summary: string
  sensitive: boolean
  selectedByDefault: boolean
  requiresExplicitConsent: boolean
}

export interface ShareConditionDto {
  dimensionId: string
  label: string
  summary: string
}

/** 趣味展示块: 全部由已授权公开字段派生, 不新增信息暴露面 */
export interface ShareFunDto {
  tierKey: string
  tierLabel: string
  tierComment: string
  tierBg: string
  tierFg: string
  rarityText: string
  /** 80 小人剧场里还站着的数量(0–80) */
  survivors: number
  survivor: { name: string; emoji: string }
  /** 仅当条件列表公开时才带上毒舌总评(避免泄露被隐藏的维度) */
  verdict?: string
}

export interface ShareDto {
  schemaVersion: 1
  title: '择偶条件分析战报'
  versions: {
    modelVersion: string
    dataVersion: string
  }
  audience: {
    genderLabel: '男性' | '女性'
    ageRange?: string
  }
  region?: string
  population?: {
    estimateLabel: string
    rangeLabel: string
    resolutionExceeded: boolean
  }
  scores: {
    entertainment?: number
  }
  confidenceGrade: 'A' | 'B' | 'C' | 'D' | 'NA'
  conditions?: ShareConditionDto[]
  fun?: ShareFunDto
  notice: '仅供娱乐参考·模型推算，不是官方结论，也不预测具体感情结果'
}

export interface ShareInput {
  selection: ModelSelection
  result: import('../engine/modelEngine').ModelResult
  settings: ShareSettings
}
