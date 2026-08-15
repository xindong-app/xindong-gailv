// 小人 3.0 验收(揭榜页): 完整 80 人淘汰赛 + 幸存英雄 + 淘汰灰化
import { chromium } from '@playwright/test'

const SELECTION = {
  target: {
    gender: 'female',
    age: { min: 24, max: 32 },
    cities: ['成都'],
    maritalStatuses: [],
    heightCm: { min: 158, max: 172 },
  },
  correlated: {
    bodyTypes: ['slim', 'balanced'],
    minAnnualIncomeWan: 15,
    minHouseholdWealthWan: null,
    educationLevels: ['bachelor', 'master', 'doctorate'],
    schoolTier: null,
    housing: { required: false, location: null, minAreaSqm: null, type: null },
    vehicle: { required: false, priceBands: [] },
    smoking: 'non_smoker',
    drinking: 'any',
    healthCriteria: [],
    hairCriteria: [],
  },
  softPreferenceIds: [],
  entertainment: { zodiacs: [], mbti: [] },
  selfPreferenceIds: [],
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } })
  await page.addInitScript((sel) => {
    (globalThis as unknown as { sessionStorage: { setItem(k: string, v: string): void } })
      .sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /开筛/ }).click()
  await page.waitForTimeout(800)
  // 走完四步到揭榜
  for (let i = 0; i < 4; i++) {
    const next = page.getByRole('button', { name: /下一关|揭榜|冲!/ }).last()
    if (await next.count()) { await next.click(); await page.waitForTimeout(700) }
  }
  const reveal = page.getByRole('button', { name: /揭榜/ }).first()
  if (await reveal.count()) { await reveal.click() }
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '_shots/v3-result-early.png', fullPage: true })

  // 淘汰进行到一半: 部分灰化
  await page.waitForTimeout(6000)
  await page.screenshot({ path: '_shots/v3-result-mid.png', fullPage: true })

  // 结束: 幸存者与最终结果
  await page.waitForTimeout(14000)
  await page.screenshot({ path: '_shots/v3-result-final.png', fullPage: true })

  await browser.close()
  console.log('v3 result shots saved')
}

void run()
