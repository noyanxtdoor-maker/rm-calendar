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

test('planning tools provides a compact secondary workflow without replacing primary navigation', async ({ page }) => {
  await openLocalWorkspace(page)

  await page.getByRole('button', { name: 'Open planning tools' }).click()
  const drawer = page.getByRole('dialog', { name: 'Planning tools' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: /Quick capture/ })).toBeVisible()
  await expect(drawer.getByRole('link', { name: /Weekly review/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()

  await drawer.getByRole('link', { name: /Quick capture/ }).click()
  await expect(page.getByRole('heading', { name: 'Quick capture', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Planning tools' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Open planning tools' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Planning tools' })).toHaveCount(0)
})

test('the cloud account route stays addressable for an email-link return', async ({ page }) => {
  await openLocalWorkspace(page, '/tools/cloud')

  await expect(page.getByRole('heading', { name: 'Keep new planning work in sync.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cloud workspace active' })).toHaveCount(0)
})

test('a user can create a private focus group with people at phone width', async ({ page }) => {
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Create focus group' }).click()
  await page.getByLabel('Group name').fill('This week')
  await page.getByLabel('Avery Brooks').check()
  await page.getByRole('button', { name: 'Save focus group' }).click()

  await expect(page.getByText('This week', { exact: true })).toBeVisible()
  await expect(page.getByText('1 person', { exact: true })).toBeVisible()
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
})

test('a user can open and safely update a focus group at phone width', async ({ page }) => {
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Create focus group' }).click()
  await page.getByLabel('Group name').fill('This week')
  await page.getByLabel('Avery Brooks').check()
  await page.getByRole('button', { name: 'Save focus group' }).click()

  await page.getByRole('link', { name: 'This week' }).click()
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit focus group' }).click()
  await page.getByLabel('Group name').fill('Next week')
  await page.getByLabel('Avery Brooks').uncheck()
  await page.getByLabel('Jordan Lee').check()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByRole('heading', { name: 'Next week' })).toBeVisible()
  await expect(page.getByText('Jordan Lee', { exact: true })).toBeVisible()
  await expect(page.getByText('Avery Brooks', { exact: true })).toHaveCount(0)
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
})

test('a user can plan a visit and a task directly from a focus group', async ({ page }) => {
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Create focus group' }).click()
  await page.getByLabel('Group name').fill('This week')
  await page.getByLabel('Avery Brooks').check()
  await page.getByRole('button', { name: 'Save focus group' }).click()
  await page.getByRole('link', { name: 'This week' }).click()

  await page.getByRole('link', { name: 'Plan a visit for Avery Brooks' }).click()
  await expect(page.getByLabel('Existing person (optional)')).toHaveValue(/.+/)
  await page.getByLabel('Visit title').fill('Avery group visit')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  await expect(page.getByText('Avery group visit', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Add a task for Avery Brooks' }).click()
  await expect(page.getByLabel('Person (optional)')).toHaveValue(/.+/)
  await page.getByRole('textbox', { name: 'Task' }).fill('Avery group task')
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  await expect(page.getByText('Avery group task', { exact: true })).toBeVisible()
})

test('a focus group puts people without a next step first and starts the next visit', async ({ page }) => {
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Queue one')
  await page.getByRole('button', { name: 'Save person' }).click()
  await page.getByRole('link', { name: 'People', exact: true }).click()
  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Queue two')
  await page.getByRole('button', { name: 'Save person' }).click()
  await page.getByRole('link', { name: 'People', exact: true }).click()

  await page.getByRole('link', { name: 'Create focus group' }).click()
  await page.getByLabel('Group name').fill('Weekly pass')
  await page.getByLabel('Queue one').check()
  await page.getByLabel('Queue two').check()
  await page.getByRole('button', { name: 'Save focus group' }).click()
  await page.getByRole('link', { name: 'Weekly pass' }).click()

  await expect(page.getByText('No one has a next step yet.')).toBeVisible()
  await page.getByRole('link', { name: 'Plan next visit for Queue one' }).click()
  await page.getByLabel('Visit title').fill('Queue one weekly pass')
  await page.getByRole('button', { name: 'Save plan' }).click()

  await expect(page.getByRole('heading', { name: 'Weekly pass' })).toBeVisible()
  await expect(page.getByText('1 of 2 people have a next step.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Plan next visit for Queue two' })).toBeVisible()
})

test('a user can keep a private person note and retain it offline', async ({ page }) => {
  await openLocalWorkspace(page, '/people')

  await page.getByRole('link', { name: 'Add person', exact: true }).click()
  await page.getByLabel('Person name').fill('Morgan Notes')
  await page.getByRole('button', { name: 'Save person' }).click()
  await page.getByLabel('New private note').fill('Prefers a short check-in after work.')
  await page.getByRole('button', { name: 'Save private note' }).click()
  await expect(page.getByText('Private note saved on this device.')).toBeVisible()
  await expect(page.getByText('Prefers a short check-in after work.')).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.context().setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Prefers a short check-in after work.')).toBeVisible()
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
