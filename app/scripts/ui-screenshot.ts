// UI 截图验证: 预填一份带城市皮肤的条件, 分别截桌面端与手机端
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

  // 桌面端
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desktop.addInitScript((sel) => {
    window.sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await desktop.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: '_shots/desktop-welcome.png' })
  await desktop.getByRole('button', { name: /开筛/ }).click()
  await desktop.waitForTimeout(1200)
  await desktop.screenshot({ path: '_shots/desktop-funnel.png' })

  // 揭榜页
  await desktop.getByRole('button', { name: /揭榜/ }).first().click()
  await desktop.waitForTimeout(1200)
  await desktop.screenshot({ path: '_shots/desktop-results.png' })

  // 手机端
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mobile.addInitScript((sel) => {
    window.sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await mobile.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await mobile.getByRole('button', { name: /开筛/ }).click()
  await mobile.waitForTimeout(1200)
  await mobile.screenshot({ path: '_shots/mobile-step.png' })
  // 打开底部战况条
  await mobile.getByRole('button', { name: /查看战况/ }).click()
  await mobile.waitForTimeout(1400)
  await mobile.screenshot({ path: '_shots/mobile-result.png' })

  await browser.close()
  console.log('shots saved')
}

void run()
