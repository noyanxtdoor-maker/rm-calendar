import { expect, test, type Page } from '@playwright/test'

async function openLocalWorkspace(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'I understand this local-only privacy boundary.' }).check()
  await page.getByRole('button', { name: 'Continue to my planning space' }).click()
}

test('the Milestone 1 local workspace stays usable at phone width and reopens offline with saved data', async ({ page }, testInfo) => {
  await openLocalWorkspace(page)

  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Keep the work moving.' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible()

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)

  await page.waitForTimeout(200)

  await page.screenshot({
    path: testInfo.outputPath('milestone-1-mobile-shell.png'),
    fullPage: false,
    animations: 'disabled'
  })

  await page.getByRole('link', { name: 'Calendar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible()
  await expect(page.getByText('Avery visit')).toBeVisible()

  await page.getByRole('link', { name: 'Tools', exact: true }).click()
  await page.getByRole('button', { name: 'Add fictional person' }).click()
  await expect(page.getByText('Practice person 4 was saved on this device.')).toBeVisible()

  await page.getByRole('link', { name: 'People', exact: true }).click()
  await expect(page.getByText('Practice person 4')).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })

  await page.context().setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible()
  await expect(page.getByText('Practice person 4')).toBeVisible()
  await page.context().setOffline(false)
})

test('a user can create a person, plan a linked visit, and retain it offline after reload', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Morgan Local')
  await page.getByRole('button', { name: 'Save person' }).click()
  await expect(page.getByRole('heading', { name: 'Morgan Local' })).toBeVisible()

  await page.getByRole('link', { name: 'Plan a visit' }).click()
  expect(pageErrors).toEqual([])
  await page.getByLabel('Visit title').fill('Morgan local visit')
  await page.screenshot({ path: testInfo.outputPath('milestone-2-activity-form.png'), fullPage: true, animations: 'disabled' })
  const formLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(formLayout.scrollWidth).toBeLessThanOrEqual(formLayout.clientWidth)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByRole('heading', { name: 'Morgan local visit' })).toBeVisible()

  await page.getByRole('link', { name: 'Calendar', exact: true }).click()
  await expect(page.getByText('Morgan local visit')).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.context().setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Morgan local visit')).toBeVisible()
  await page.context().setOffline(false)
})

test('a user can complete a visit, create a linked next action, and retain it offline', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openLocalWorkspace(page, '/calendar')

  await page.getByRole('link', { name: 'Avery visit' }).click()
  await expect(page.getByRole('heading', { name: 'Avery visit' })).toBeVisible()
  await page.getByRole('link', { name: 'Complete visit' }).click()
  await page.getByLabel('Outcome (optional)').fill('Shared a clear next step.')
  await page.getByRole('button', { name: 'Save and create follow-up' }).click()

  await expect(page.getByRole('heading', { name: 'Create follow-up' })).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Follow up: Avery visit')
  await page.getByLabel('Title').fill('Send Avery a gentle reminder')
  await page.getByRole('button', { name: 'Save follow-up' }).click()
  await expect(page.getByText('Send Avery a gentle reminder')).toBeVisible()
  expect(pageErrors).toEqual([])

  await page.getByRole('link', { name: 'Tools', exact: true }).click()
  await expect(page.getByText('Send Avery a gentle reminder')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('milestone-3-complete-follow-up.png'),
    fullPage: true,
    animations: 'disabled'
  })

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.context().setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Send Avery a gentle reminder')).toBeVisible()
  await page.context().setOffline(false)
})

test('sync status exposes queued local work without exposing private record text', async ({ page }, testInfo) => {
  await openLocalWorkspace(page, '/people')
  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Private queue person')
  await page.getByRole('button', { name: 'Save person' }).click()

  await page.getByRole('link', { name: 'Tools', exact: true }).click()
  await page.getByRole('link', { name: /Sync status/ }).click()
  await expect(page.getByRole('heading', { name: 'Cloud sync is not set up.' })).toBeVisible()
  await expect(page.getByText('create contact', { exact: true })).toBeVisible()
  await expect(page.getByText('Private queue person')).toHaveCount(0)

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
  await page.screenshot({
    path: testInfo.outputPath('milestone-4-prep-sync-status.png'),
    fullPage: true,
    animations: 'disabled'
  })
})

test('local data controls export while offline and require an explicit erase acknowledgement', async ({ page }, testInfo) => {
  await openLocalWorkspace(page, '/people')
  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Private export person')
  await page.getByRole('button', { name: 'Save person' }).click()

  await page.getByRole('link', { name: 'Tools', exact: true }).click()
  await page.getByRole('link', { name: 'Data controls' }).click()
  await expect(page.getByRole('heading', { name: 'Your local data' })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('milestone-5-prep-data-controls.png'),
    fullPage: true,
    animations: 'disabled'
  })

  await page.context().setOffline(true)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download local data' }).click()
  const download = await downloadPromise
  await expect(page.getByText('Your private local export was downloaded. Store that file somewhere you trust.')).toBeVisible()
  expect(download.suggestedFilename()).toMatch(/^rm-calendar-local-export-\d{4}-\d{2}-\d{2}\.json$/)
  await page.context().setOffline(false)

  const erase = page.getByRole('button', { name: 'Clear this browser' })
  await expect(erase).toBeDisabled()
  await page.getByRole('checkbox', { name: 'I understand that this removes all RM Calendar data from this browser.' }).check()
  await expect(erase).toBeEnabled()
  await erase.click()
  await expect(page.getByRole('heading', { name: 'Local data cleared' })).toBeVisible()

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
})

test('week rhythm provides an original keyboard-operable planning scan at phone width', async ({ page }, testInfo) => {
  await openLocalWorkspace(page, '/calendar')

  const dayPlan = page.getByRole('tab', { name: 'Day plan' })
  const weekRhythm = page.getByRole('tab', { name: 'Week rhythm' })
  await expect(dayPlan).toHaveAttribute('aria-selected', 'true')
  await dayPlan.focus()
  await page.keyboard.press('ArrowRight')
  await expect(weekRhythm).toHaveAttribute('aria-selected', 'true')
  await expect(weekRhythm).toBeFocused()
  await expect(page.getByText('Scan the week before you commit to a day. Open any day to work with its detailed plan.')).toBeVisible()
  await expect(page.getByText('Avery visit')).toBeVisible()
  await expect(page.getByRole('button', { name: /Open day:/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Previous week' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible()

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
  await page.screenshot({
    path: testInfo.outputPath('calendar-week-rhythm.png'),
    fullPage: true,
    animations: 'disabled'
  })
})
