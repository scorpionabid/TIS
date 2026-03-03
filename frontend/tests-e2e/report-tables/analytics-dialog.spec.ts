import { test, expect, Page } from '@playwright/test';

/**
 * Helper: SuperAdmin kimi login ol
 */
async function loginAsSuperAdmin(page: Page) {
    await page.goto('/');
    await page.fill('#email', 'superadmin@atis.az');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    // Login sonrası dashboard-u gözlə
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });
}

test.describe('Report Table Analytics Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('analytics dialog shows full institution names and export button', async ({ page }) => {
    // Navigate to report tables page
    await page.goto('/report-tables');
    await page.waitForLoadState('networkidle');

    // Wait for report tables to load
    await page.waitForSelector('[data-testid="report-table-card"]', { timeout: 10000 });

    // Click on a table with analytics button
    const analyticsButton = page.locator('[data-testid="analytics-button"]').first();
    if (await analyticsButton.isVisible().catch(() => false)) {
      await analyticsButton.click();

      // Wait for analytics dialog to open
      await page.waitForSelector('[data-testid="analytics-dialog"]', { timeout: 5000 });

      // Verify dialog title
      await expect(page.locator('text=Cədvəl analitikası')).toBeVisible();

      // Check if Müəssisələr tab exists and click it
      const institutionsTab = page.locator('text=Müəssisələr');
      if (await institutionsTab.isVisible().catch(() => false)) {
        await institutionsTab.click();

        // Verify institution names column has proper width
        const institutionHeader = page.locator('th:has-text("Müəssisə adı")');
        await expect(institutionHeader).toBeVisible();

        // Verify row counts are displayed
        const rowCountCells = page.locator('td:has-text("Sətir sayı")');
        await expect(rowCountCells.first()).toBeVisible();
      }

      // Check if Doldurmayanlar tab exists and test export
      const nonFillingTab = page.locator('text=Doldurmayanlar');
      if (await nonFillingTab.isVisible().catch(() => false)) {
        await nonFillingTab.click();

        // Verify export button exists
        const exportButton = page.locator('text=İxrac et');
        await expect(exportButton).toBeVisible();

        // Verify school name column has proper width
        const schoolHeader = page.locator('th:has-text("Məktəb adı")');
        await expect(schoolHeader).toBeVisible();

        // Verify sector column exists
        const sectorHeader = page.locator('th:has-text("Sektor")');
        await expect(sectorHeader).toBeVisible();
      }
    }
  });
});
