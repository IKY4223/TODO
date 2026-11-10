import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'

const UID = '700000001' // served from backend/tests/fixtures/enka_showcase.json
const MISSING_UID = '404000000'
const MIN_TOUCH_TARGET_PX = 44
const MIN_INPUT_FONT_PX = 16
const MIN_CONTROLS_ON_SCREEN = 10
// A 1x1 transparent PNG: no test may depend on the real image host.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

let problems: string[] = []

test.beforeEach(async ({ page }) => {
  problems = []
  page.on('pageerror', (error) => problems.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  await page.route('https://enka.network/**', async (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  )
  await page.goto('/')
})

async function loadShowcase(page: Page, uid = UID): Promise<void> {
  await page.getByLabel('UID').fill(uid)
  await page.getByRole('button', { name: 'Load characters' }).click()
}

const card = (page: Page, name: string): Locator =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name }) })

test('imports a showcase and shows every character with its gear', async ({ page }) => {
  await loadShowcase(page)
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Amber', 'Ganyu'])

  const amber = card(page, 'Amber')
  await expect(amber.getByText('Lv. 90 · C6 · Pyro')).toBeVisible()
  await expect(amber.getByText('Skyward Harp · Lv. 90 · R2')).toBeVisible()
  await amber.getByText('Artifacts (5)').click()
  await expect(amber.getByText('Flower · Bloodstained Chivalry +20')).toBeVisible()
  expect(problems).toEqual([]) // also proves the Content-Security-Policy lets the app run
})

test('calculates damage for an imported character', async ({ page }) => {
  await loadShowcase(page)
  const ganyu = card(page, 'Ganyu')
  await ganyu.getByText('Damage', { exact: true }).click()
  await expect(ganyu.getByLabel('Damage bonus')).toHaveValue('cryo_dmg')
  await ganyu.getByLabel('Talent multiplier, %').fill('392')
  await ganyu.getByRole('button', { name: 'Calculate damage' }).click()

  // 2249 ATK x 392% x 1.466 Cryo bonus x 0.5 defense x 0.9 resistance, 48.2% / 209.7% crit.
  await expect(ganyu.getByRole('definition')).toContainText(['11,689', '18,011', '5,816'])
  expect(problems).toEqual([])
})

test('explains why an import failed', async ({ page }) => {
  await loadShowcase(page, MISSING_UID)
  await expect(page.getByRole('alert')).toHaveText('Player not found. Check the UID.')
})

test('forecasts wishes', async ({ page }) => {
  await page.getByRole('link', { name: 'Wishes' }).click()
  await page.getByLabel('Pulls since last 5★').fill('10')
  await page.getByLabel('Pulls available').fill('80')
  await page.getByRole('button', { name: 'Calculate', exact: true }).click()
  await expect(page.getByText('56.9%')).toBeVisible()
  await expect(page.getByRole('row', { name: '100% 170' })).toBeVisible()
  expect(problems).toEqual([])
})

test('keeps a loaded showcase across tools and the back button', async ({ page }) => {
  await loadShowcase(page)
  await expect(card(page, 'Amber')).toBeVisible()
  await page.getByRole('link', { name: 'Wishes' }).click()
  await expect(page.getByRole('heading', { name: 'Wish forecast' })).toBeVisible()
  await page.goBack()
  await expect(card(page, 'Amber')).toBeVisible()
})

async function openEverything(page: Page): Promise<void> {
  await loadShowcase(page)
  await expect(card(page, 'Ganyu')).toBeVisible()
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) details.open = true
  })
}

test('fits the screen and keeps every control easy to touch', async ({ page }) => {
  await openEverything(page)
  const layout = await page.evaluate((minHeight) => {
    const selector = 'input:not([type=checkbox]), select, button, summary, nav a'
    // The other tool stays mounted but hidden, so only what is on screen counts.
    const controls = [...document.querySelectorAll(selector)].filter((control) =>
      control.checkVisibility(),
    )
    return {
      controls: controls.length,
      overflows: document.documentElement.scrollWidth > window.innerWidth,
      // Named, so a failure says which control is too small.
      tooSmall: controls
        .map((control) => ({ control, height: control.getBoundingClientRect().height }))
        .filter(({ height }) => height < minHeight)
        .map(({ control, height }) => `${control.tagName} "${control.textContent.trim()}" is ${height}px`),
      smallestInputFont: Math.min(
        ...controls
          .filter((control) => control.matches('input, select'))
          .map((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
      ),
    }
  }, MIN_TOUCH_TARGET_PX)
  expect(layout.controls).toBeGreaterThan(MIN_CONTROLS_ON_SCREEN) // the filter must not empty the check
  expect(layout.overflows).toBe(false)
  expect(layout.tooSmall).toEqual([])
  expect(layout.smallestInputFont).toBeGreaterThanOrEqual(MIN_INPUT_FONT_PX) // smaller makes iOS zoom in
})

test('has no accessibility violations in either tool', async ({ page }) => {
  await openEverything(page)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.getByRole('link', { name: 'Wishes' }).click()
  await page.getByLabel('Pulls available').fill('80')
  await page.getByRole('button', { name: 'Calculate', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
