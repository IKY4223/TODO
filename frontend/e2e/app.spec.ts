import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'

const UID = '700000001' // served from backend/tests/fixtures/enka_showcase.json
const MISSING_UID = '404000000'
// What Android's error page reads once the wish history fails to reload (see WishHistory.tsx).
const ANDROID_TEXT =
  'Webpage not available\n\nThe webpage at https://webstatic-sea.hoyoverse.com/genshin/event/' +
  'e20190909gacha-v3/index.html?authkey_ver=1&authkey=a%2Bb%2Fc%3D%3D&lang=en#/log could not be ' +
  'loaded because:\n\nnet::ERR_INTERNET_DISCONNECTED'
// The import pauses between banners so HoYoverse does not refuse it.
const IMPORT_TIMEOUT_MS = 30_000
const MIN_TOUCH_TARGET_PX = 44
const MIN_INPUT_FONT_PX = 16
const MIN_CONTROLS_ON_SCREEN = 10
// Game and tool links, the UID form, a toggle per character.
const MIN_STARRAIL_CONTROLS = 6
// Three tabs, two instruction toggles, the text box, two buttons.
const MIN_HISTORY_CONTROLS = 8
const MIN_FORECAST_CONTROLS = 10 // banner, pity, pulls, target, button and the navigation
const MIN_SPEED_CONTROLS = 6 // the navigation only
const MIN_PAGE_CONTROLS = 6 // the UID field, its button and the navigation
const MIN_RELIC_CONTROLS = 19 // 9 selects, 5 number fields, the button and the navigation links
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
  await page.goto('/#genshin/builds')
})

/** The tool on screen: the others stay mounted, hidden, so page-wide lookups would find them too. */
const shown = (page: Page): Locator => page.locator('main > div:not([hidden])')

async function loadShowcase(page: Page, uid = UID): Promise<void> {
  await shown(page).getByLabel('UID').fill(uid)
  await shown(page).getByRole('button', { name: 'Load characters' }).click()
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
  await shown(page).getByLabel('Pulls since last 5★').fill('10')
  await shown(page).getByLabel('Pulls available').fill('80')
  await shown(page).getByRole('button', { name: 'Calculate', exact: true }).click()
  await expect(page.getByText('56.9%')).toBeVisible()
  await expect(page.getByRole('row', { name: '100% 170' })).toBeVisible()
  expect(problems).toEqual([])
})

test('forecasts Star Rail light cone warps', async ({ page }) => {
  await page.goto('/#starrail/warps')
  const tool = shown(page)
  await tool.getByLabel('Banner').selectOption('starrail_light_cone')
  await tool.getByLabel('Pulls available').fill('160')
  await tool.getByRole('button', { name: 'Calculate', exact: true }).click()
  // 160 pulls cover a lost 75/25 and the guaranteed light cone after it.
  await expect(tool.getByText('100%').first()).toBeVisible()
  await expect(tool.getByRole('row', { name: '100% 160' })).toBeVisible()
  expectPhoneFriendly(await measureLayout(page), MIN_FORECAST_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(problems).toEqual([])
})

test('shows final stats and plans team speed from the loaded showcase', async ({ page }) => {
  await page.getByRole('link', { name: 'Star Rail' }).click()
  await expect(page.getByRole('link', { name: 'Star Rail' })).toHaveAttribute('aria-current', 'page')
  await loadShowcase(page)
  await expect(card(page, 'Hyacine').getByText('SPD', { exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Speed' }).click()
  const tool = shown(page)
  await expect(tool.getByRole('heading', { level: 3 })).toHaveCount(2)
  await expect(tool.getByText(/^One more turn in cycle 0 at \d+\.\d SPD/)).toHaveCount(2)
  expectPhoneFriendly(await measureLayout(page), MIN_SPEED_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
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

interface Layout {
  readonly controls: number
  readonly overflows: boolean
  readonly tooSmall: readonly string[]
  readonly smallestInputFont: number
}

/** What a phone user would trip over: sideways scrolling, tiny controls, zooming inputs. */
async function measureLayout(page: Page): Promise<Layout> {
  return page.evaluate((minHeight) => {
    const selector = 'input:not([type=checkbox]), select, textarea, button, summary, nav a, a.more'
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
          .filter((control) => control.matches('input, select, textarea'))
          .map((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
      ),
    }
  }, MIN_TOUCH_TARGET_PX)
}

function expectPhoneFriendly(layout: Layout, minControls: number): void {
  expect(layout.controls).toBeGreaterThanOrEqual(minControls) // the filter must not empty the check
  expect(layout.overflows).toBe(false)
  expect(layout.tooSmall).toEqual([])
  expect(layout.smallestInputFont).toBeGreaterThanOrEqual(MIN_INPUT_FONT_PX) // smaller makes iOS zoom in
}

test('fits the screen and keeps every control easy to touch', async ({ page }) => {
  await openEverything(page)
  expectPhoneFriendly(await measureLayout(page), MIN_CONTROLS_ON_SCREEN)
})

test('has no accessibility violations in either tool', async ({ page }) => {
  await openEverything(page)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.getByRole('link', { name: 'Wishes' }).click()
  await shown(page).getByLabel('Pulls available').fill('80')
  await shown(page).getByRole('button', { name: 'Calculate', exact: true }).click()
  await expect(shown(page).getByRole('table')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('imports wish history from the text Android shows and keeps it on the device', async ({ page }) => {
  test.setTimeout(IMPORT_TIMEOUT_MS * 2)
  await page.getByRole('link', { name: 'History' }).click()
  await page.getByLabel('Text from the error page').fill(ANDROID_TEXT)
  await page.getByRole('button', { name: 'Import history' }).click()
  // Served by backend/tests/gacha_fixture.py: 25 character pulls, 3 standard ones.
  await expect(page.getByRole('status')).toHaveText('28 new pulls imported.', { timeout: IMPORT_TIMEOUT_MS })
  await expect(page.getByLabel('Text from the error page')).toHaveValue('')

  const character = card(page, 'Character Event')
  await expect(character.getByText('15 pulls since the last 5★')).toBeVisible()
  await expect(character.getByRole('row', { name: 'Furina 10' })).toBeVisible()
  await expect(card(page, 'Standard').getByText('3 pulls since the last 5★')).toBeVisible()

  expectPhoneFriendly(await measureLayout(page), MIN_HISTORY_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.reload()
  await expect(card(page, 'Character Event').getByText('15 pulls since the last 5★')).toBeVisible()
  expect(problems).toEqual([])
})

test('imports a Star Rail profile and showcase with skills and relic rolls', async ({ page }) => {
  await page.getByRole('link', { name: 'Star Rail' }).click()
  // Until the switch renders, the Genshin tool is still the one on screen.
  await expect(page.getByRole('link', { name: 'Star Rail' })).toHaveAttribute('aria-current', 'page')
  await loadShowcase(page)
  // Served from backend/tests/fixtures/enka_starrail.json.
  await expect(shown(page).getByRole('heading', { level: 3 })).toHaveText([
    'Trailblazer',
    'Hyacine',
    'March 7th',
  ])
  const profile = card(page, 'Trailblazer')
  await expect(profile.getByText('Trailblaze Lv. 70 · Equilibrium 6')).toBeVisible()
  await expect(profile.getByText('Looking for co-op')).toBeVisible()
  await expect(profile.locator('dl > div')).toContainText(['Achievements500', 'Relics2,400'])
  const hyacine = card(page, 'Hyacine')
  await expect(hyacine.getByText('Lv. 80 · E0 · Wind · Remembrance')).toBeVisible()
  await expect(hyacine.getByText("The Story's Next Page · Lv. 70 · S1")).toBeVisible()
  await hyacine.getByText('Relics (6)').click()
  await expect(hyacine.getByText('Head · Warrior Goddess of Sun and Thunder +15')).toBeVisible()
  await expect(hyacine.getByText(/SPD 12\.1 ×5/)).toBeVisible()
  const march = card(page, 'March 7th')
  await expect(march.getByText(/E6 · Imaginary · The Hunt/)).toBeVisible()
  await expect(march.locator('dl:has-text("Basic ATK") > div')).toHaveText([
    'Basic ATK7 (+1)',
    'Skill11 (+2)',
    'Ultimate10 (+2)',
    'Talent11 (+2)',
  ])

  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) details.open = true
  })
  expectPhoneFriendly(await measureLayout(page), MIN_STARRAIL_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(problems).toEqual([])
})

test('opens a character page and comes back with the back button', async ({ page }) => {
  await page.getByRole('link', { name: 'Star Rail' }).click()
  await expect(page.getByRole('link', { name: 'Star Rail' })).toHaveAttribute('aria-current', 'page')
  await loadShowcase(page)
  await card(page, 'March 7th').getByRole('link', { name: 'Skills and eidolons' }).click()
  const tool = shown(page)
  await expect(tool.getByRole('heading', { level: 2, name: 'March 7th' })).toBeVisible()
  // March 7th is E6 with a level 11 Skill in the fixture.
  await expect(tool.getByText('Skill · Lv. 11')).toBeVisible()
  // All six eidolons and ten of her thirteen trace nodes.
  await expect(tool.getByText('Unlocked', { exact: true })).toHaveCount(16)
  await expect(tool.getByText('Not unlocked', { exact: true })).toHaveCount(3)
  await expect(tool.getByText(/#\d+\[/)).toHaveCount(0) // every number is filled in
  await expect(tool.getByRole('link', { name: '← All characters' })).toBeInViewport()
  // Three of March 7th's stat nodes are not unlocked, so materials are still owed.
  await expect(tool.getByRole('heading', { name: 'Traces', exact: true })).toBeVisible()
  await expect(tool.locator('.materials div').first()).toContainText('Credit')
  expectPhoneFriendly(await measureLayout(page), MIN_PAGE_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.goBack()
  await expect(shown(page).getByRole('heading', { level: 3 })).toHaveText([
    'Trailblazer',
    'Hyacine',
    'March 7th',
  ])
  expect(problems).toEqual([])
})

test('tells what the upgrades a relic has left can bring', async ({ page }) => {
  // Load the showcase first: the advisor compares with the relics its characters wear.
  await page.getByRole('link', { name: 'Star Rail' }).click()
  await expect(page.getByRole('link', { name: 'Star Rail' })).toHaveAttribute('aria-current', 'page')
  await loadShowcase(page)
  await expect(card(page, 'Hyacine').getByText(/Relics \(6\) · score \d+\.\d/)).toBeVisible()
  await page.getByRole('link', { name: 'Relics' }).click()
  const tool = shown(page)
  await tool.getByLabel('Main stat').selectOption('hp')
  await tool.getByLabel('Level').selectOption('12')
  await tool.getByLabel('Substat 1').selectOption('atk')
  await tool.getByLabel('Substat 2').selectOption('def')
  await tool.getByLabel('Substat 3').selectOption('spd')
  await tool.getByLabel('Value 3').fill('2.6')
  await tool.getByLabel('Substat 4').selectOption('crit_rate')
  await tool.getByLabel('Value 4').fill('3.2')
  await tool.getByLabel('Goal stat').selectOption('spd')
  await tool.getByLabel('Goal value').fill('4.6')
  await tool.getByLabel('Compare with').selectOption('Hyacine · Head')
  await tool.getByRole('button', { name: 'Calculate' }).click()
  // SPD and CRIT Rate are wanted by default: one upgrade, two of four substats.
  await expect(tool.getByText('1 upgrade left')).toBeVisible()
  await expect(tool.getByRole('row')).toHaveText(['Wanted upgradesChance', 'At least 150%'])
  await expect(tool.locator('.answers div')).toHaveText([
    'Score now2.0',
    // Hyacine's head has SPD 12.1: far ahead of a relic with one upgrade left.
    'Chance to beat the equipped relic0%',
    // SPD is picked one time in four and any roll then reaches 4.6.
    'Chance to reach SPD 4.625%',
  ])

  expectPhoneFriendly(await measureLayout(page), MIN_RELIC_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(problems).toEqual([])
})

test('explains why a relic cannot exist', async ({ page }) => {
  await page.goto('/#starrail/relics')
  const tool = shown(page)
  await tool.getByLabel('Main stat').selectOption('hp')
  await tool.getByLabel('Substat 1').selectOption('atk')
  await tool.getByLabel('Substat 2').selectOption('atk')
  await tool.getByLabel('Substat 3').selectOption('spd')
  await tool.getByRole('button', { name: 'Calculate' }).click()
  await expect(tool.getByRole('alert')).toHaveText('A relic cannot have the same substat twice.')
})

test('shows Star Rail in Russian and keeps the choice', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('link', { name: 'Билды' })).toHaveAttribute('aria-current', 'page')
  await shown(page).getByLabel('UID').fill(UID)
  await shown(page).getByRole('button', { name: 'Загрузить персонажей' }).click()
  await expect(shown(page).getByRole('heading', { level: 3 })).toHaveText([
    'Trailblazer',
    'Гиацина',
    'Март 7',
  ])
  await expect(card(page, 'Гиацина').getByText('Ур. 80 · E0 · Ветряной · Память')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Язык')).toHaveValue('ru')
  expectPhoneFriendly(await measureLayout(page), MIN_STARRAIL_CONTROLS)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(problems).toEqual([])
})

test('Star Rail is where the app opens', async ({ page }) => {
  await page.goto('/')
  await expect(shown(page).getByText(/Honkai: Star Rail/)).toBeVisible()
})
