export const JS_GZIP_BUDGET_KIB = 166
export const CSS_GZIP_BUDGET_KIB = 25

export function exceedsGzipBudget(gzipBytes: number, budgetKib: number): boolean {
  return gzipBytes > budgetKib * 1024
}
