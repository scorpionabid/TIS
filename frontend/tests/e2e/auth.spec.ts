import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login/)
    
    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Fill login form
    await page.fill('input[type="email"]', 'superadmin@atis.az')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // Check if user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    
    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'superadmin@atis.az')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // Then logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('should handle session timeout', async ({ page }) => {
    // Mock expired session
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired-token')
    })
    
    // Try to access protected route
    await page.goto('http://localhost:3000/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/)
  })
})
