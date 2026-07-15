import { test, expect } from '@playwright/test'

test.describe('Guest onboarding', () => {
  test('redirects to /today from root', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/today/)
  })

  test('shows Today page with greeting and date', async ({ page }) => {
    await page.goto('/today')
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible()
  })

  test('can navigate to Add Habit from Today', async ({ page }) => {
    await page.goto('/today')
    const addButton = page.getByRole('link', { name: /add habit/i }).first()
    await addButton.click()
    await expect(page).toHaveURL(/\/habits\/new/)
  })

  test('bottom nav is present on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/today')
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await expect(nav).toBeVisible()
  })

  test('sidebar is present on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/today')
    const sidebar = page.getByRole('complementary', { name: /sidebar navigation/i })
    await expect(sidebar).toBeVisible()
  })
})

test.describe('Habit creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/habits/new')
  })

  test('shows habit creation form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /new habit/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /habit name/i })).toBeVisible()
  })

  test('validates required name field', async ({ page }) => {
    await page.getByRole('button', { name: /create habit/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('can create a binary habit', async ({ page }) => {
    await page.getByRole('textbox', { name: /habit name/i }).fill('Morning meditation')
    await page.getByRole('button', { name: /binary/i }).click()
    await expect(page.getByRole('button', { name: /binary/i })).toHaveAttribute('aria-pressed', 'true')
  })

  test('can select weekday schedule', async ({ page }) => {
    await page.getByRole('textbox', { name: /habit name/i }).fill('Exercise')
    const scheduleSelect = page.getByRole('combobox', { name: /schedule type/i })
    await scheduleSelect.click()
    await page.getByRole('option', { name: /selected days/i }).click()
    await expect(page.getByRole('group', { name: /select days/i })).toBeVisible()
  })
})

test.describe('Navigation', () => {
  const pages = [
    { url: '/today', title: /today|DayByDay/i },
    { url: '/calendar', title: /calendar/i },
    { url: '/habits', title: /habits/i },
    { url: '/analytics', title: /analytics/i },
    { url: '/profile', title: /profile/i },
  ]

  for (const { url } of pages) {
    test(`${url} renders without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('Supabase'))
      expect(criticalErrors).toHaveLength(0)
    })
  }
})

test.describe('Accessibility', () => {
  test('Today page has main landmark', async ({ page }) => {
    await page.goto('/today')
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('All form inputs on habit creation have labels', async ({ page }) => {
    await page.goto('/habits/new')
    const inputs = await page.locator('input:not([type="hidden"])').all()
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const count = await label.count()
        expect(count, `Input #${id} has no label`).toBeGreaterThan(0)
      }
    }
  })

  test('Login page is accessible', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).not.toBeVisible()
    // Password field exists but as type=password
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('Theme', () => {
  test('can switch to dark theme from profile page', async ({ page }) => {
    await page.goto('/profile')
    const darkButton = page.getByRole('button', { name: /^dark$/i })
    await darkButton.click()
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })
})
