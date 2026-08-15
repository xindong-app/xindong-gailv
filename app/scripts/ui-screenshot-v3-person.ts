// 小人 3.0 验收截图: 预填条件 -> 开筛 -> 截漏斗人群 / 揭榜结果
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.addInitScript((sel) => {
    (globalThis as unknown as { sessionStorage: { setItem(k: string, v: string): void } })
      .sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /开筛/ }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '_shots/v3-funnel-full.png', fullPage: true })

  // 漏斗人群局部放大(竞技场区域)
  const arena = page.locator('.ff-arena').first()
  if (await arena.count()) {
    await arena.screenshot({ path: '_shots/v3-funnel-arena.png' })
  }

  // 快进到淘汰中段再看一张(部分小人已灰化)
  await page.waitForTimeout(4000)
  if (await arena.count()) {
    await arena.screenshot({ path: '_shots/v3-funnel-mid.png' })
  }
  await page.screenshot({ path: '_shots/v3-funnel-mid-full.png', fullPage: true })

  await browser.close()
  console.log('v3 shots saved')
}

void run()
