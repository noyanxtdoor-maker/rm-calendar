import { expect, test } from '@playwright/test'

test('the Milestone 1 local workspace stays usable at phone width and reopens offline with saved data', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start with what matters.' })).toBeVisible()
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
  await page.goto('/people')

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
