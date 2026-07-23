import { expect, test } from '@playwright/test'

test('the Milestone 0 shell stays usable at phone width and reopens offline', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A reliable starting point' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible()

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)

  await page.waitForTimeout(200)

  await page.screenshot({
    path: testInfo.outputPath('milestone-0-mobile-shell.png'),
    fullPage: false,
    animations: 'disabled'
  })

  await page.getByRole('link', { name: 'Calendar' }).click()
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()

  await page.context().setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
  await page.context().setOffline(false)
})
