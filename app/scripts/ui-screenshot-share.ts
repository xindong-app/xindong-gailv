// 分享战报卡视觉验证
import { chromium } from '@playwright/test'

const SELECTION = {
  target: {
    gender: 'male',
    age: { min: 26, max: 34 },
    cities: ['成都', '重庆'],
    maritalStatuses: [],
    heightCm: { min: 178, max: null },
  },
  correlated: {
    bodyTypes: [],
    minAnnualIncomeWan: null,
    minHouseholdWealthWan: null,
    educationLevels: ['master', 'doctorate'],
    schoolTier: null,
    housing: { required: false, location: null, minAreaSqm: null, type: null },
    vehicle: { required: false, priceBands: [] },
    smoking: 'any',
    drinking: 'any',
    healthCriteria: [],
    hairCriteria: [],
  },
  softPreferenceIds: [],
  entertainment: { zodiacs: ['leo'], mbti: [] },
  selfPreferenceIds: [],
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.addInitScript((sel) => {
    (globalThis as unknown as { sessionStorage: { setItem(key: string, value: string): void } })
      .sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /开筛/ }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: '生成战报' }).first().click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: '打开分享预览' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '_shots/share-dialog.png' })
  // 抓取真实生成的 PNG
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '生成并下载图片' }).click()
  const download = await downloadPromise
  await download.saveAs('_shots/share-card.png')
  console.log('card saved:', await download.suggestedFilename())
  await browser.close()
  console.log('share shot saved')
}

void run()
