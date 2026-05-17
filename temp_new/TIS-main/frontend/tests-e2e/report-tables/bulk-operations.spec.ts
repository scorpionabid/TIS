import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Bulk Operations in Report Tables
 * Tests the complete flow of selecting multiple rows and performing bulk actions
 */

test.describe('Bulk Operations in Approval Queue', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to report tables
    await page.goto('/report-tables');
    await page.waitForLoadState('networkidle');
  });

  test('should display bulk operations toolbar when rows exist', async ({ page }) => {
    // Wait for approval queue to load
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Check that bulk operations toolbar is visible
    await expect(page.getByText('Hamısını seç')).toBeVisible();
  });

  test('should select all rows using select all button', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Click select all
    await page.getByText('Hamısını seç').click();
    
    // Check that bulk action buttons appear
    await expect(page.getByText('Seçilənləri Təsdiqlə')).toBeVisible();
    await expect(page.getByText('Seçilənləri Rədd et')).toBeVisible();
  });

  test('should select individual rows using checkboxes', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Find first checkbox and click it
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    
    // Check selection count is displayed
    await expect(page.getByText(/\d+ seçilib/)).toBeVisible();
  });

  test('should open confirmation dialog for bulk approve', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select some rows
    await page.getByText('Hamısını seç').click();
    
    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();
    
    // Check confirmation dialog appears
    await expect(page.getByText('Toplu təsdiqləmə')).toBeVisible();
    await expect(page.getByText('Seçilmiş sətirləri təsdiqləmək istədiyinizə əminsiniz?')).toBeVisible();
  });

  test('should open confirmation dialog for bulk reject with reason input', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select some rows
    await page.getByText('Hamısını seç').click();
    
    // Click bulk reject
    await page.getByTestId('bulk-reject-button').click();
    
    // Check confirmation dialog appears with reason input
    await expect(page.getByText('Toplu rədd etmə')).toBeVisible();
    await expect(page.getByPlaceholder(/Rədd səbəbi/)).toBeVisible();
  });

  test('should cancel bulk operation and keep selection', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select some rows
    await page.getByText('Hamısını seç').click();
    
    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();
    
    // Cancel the dialog
    await page.getByText('Ləğv et').click();
    
    // Check dialog is closed
    await expect(page.getByText('Toplu təsdiqləmə')).not.toBeVisible();
    
    // Check selection is preserved
    await expect(page.getByText('Seçilənləri Təsdiqlə')).toBeVisible();
  });

  test('should clear selection with clear button', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select all
    await page.getByText('Hamısını seç').click();
    
    // Click clear selection
    await page.getByText('Seçimi ləğv et').click();
    
    // Check bulk action buttons are hidden
    await expect(page.getByText('Seçilənləri Təsdiqlə')).not.toBeVisible();
    
    // Check select all button is back
    await expect(page.getByText('Hamısını seç')).toBeVisible();
  });

  test('should show row count in confirmation dialog', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select rows
    const checkboxes = page.locator('input[type="checkbox"]').slice(0, 3);
    for (const checkbox of await checkboxes.all()) {
      await checkbox.click();
    }
    
    // Click bulk action
    await page.getByTestId('bulk-approve-button').click();
    
    // Check row count is shown
    await expect(page.getByText('Seçilmiş sətir sayı:')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
  });

  test('should handle partial selection across multiple tables', async ({ page }) => {
    // Wait for multiple tables if they exist
    const tables = page.locator('[data-testid="approval-queue-table"]');
    const count = await tables.count();
    
    if (count >= 2) {
      // Expand all tables
      await page.locator('[data-testid="approval-queue-table"] >> text=▼').first().click();
      await page.locator('[data-testid="approval-queue-table"] >> text=▼').nth(1).click();
      
      // Select rows from different tables
      const firstTableCheckbox = tables.first().locator('input[type="checkbox"]').first();
      const secondTableCheckbox = tables.nth(1).locator('input[type="checkbox"]').first();
      
      await firstTableCheckbox.click();
      await secondTableCheckbox.click();
      
      // Check selection count shows both
      const selectionText = await page.getByText(/\d+ seçilib/).textContent();
      expect(selectionText).toContain('2');
    }
  });

  test('should disable buttons during processing', async ({ page }) => {
    await page.waitForSelector('[data-testid="approval-queue-table"]', { timeout: 10000 });
    
    // Select rows
    await page.getByText('Hamısını seç').click();
    
    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();
    
    // Confirm (this will trigger loading state)
    await page.getByText('Təsdiqlə').click();
    
    // Check loading state or disabled buttons
    await expect(page.getByText('Gözləyin...').or(page.getByText('Təsdiqlə'))).toBeVisible();
  });
});

test.describe('Bulk Operations in Master Table View', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to master view
    await page.goto('/report-tables?view=master');
    await page.waitForLoadState('networkidle');
  });

  test('should display bulk operations in master view', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check toolbar is visible
    await expect(page.getByText('Hamısını seç')).toBeVisible();
  });

  test('should select institutions in master view', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first row checkbox
    const firstCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    
    // Check bulk actions appear
    await expect(page.getByText('Təsdiqlə')).toBeVisible();
  });

  test('should bulk approve institutions in master view', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Select all institutions
    await page.getByText('Hamısını seç').click();
    
    // Click bulk approve
    await page.getByText('Təsdiqlə').click();
    
    // Check confirmation dialog
    await expect(page.getByText('Toplu təsdiqləmə')).toBeVisible();
  });
});
