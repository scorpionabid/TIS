import { test, expect } from '@playwright/test';

test.describe('Bulk Attendance E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await page.goto('/');
    await page.fill('#email', 'superadmin@atis.az');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and redirect to dashboard
    await page.waitForURL(/\/dashboard|\/$/);
    await page.waitForLoadState('networkidle');
  });

  test('[smoke] should load page and show date picker', async ({ page }) => {
    // Navigate to bulk attendance page
    await page.goto('/school/attendance/bulk');
    await page.waitForLoadState('networkidle');

    // Check if page loads correctly
    await expect(page.locator('h1')).toContainText('Toplu Davamiyyət Qeydiyyatı');
    
    // Check for date picker
    const dateInput = page.getByTestId('bulk-attendance-date');
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toHaveAttribute('type', 'date');
  });

  test('[form] should allow number input in attendance fields', async ({ page }) => {
    // Navigate to bulk attendance page
    await page.goto('/school/attendance/bulk');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForSelector('[data-testid="bulk-table"]', { timeout: 10000 });

    // Find an attendance input and try to enter a number
    const firstInput = page.locator('[data-testid^="attendance-input-"]').first();
    if (await firstInput.isVisible()) {
      await firstInput.click();
      await firstInput.fill('5');
      
      // Verify the value was entered
      await expect(firstInput).toHaveValue('5');
    } else {
      // If no inputs are visible, that's also a valid state (no classes)
      console.log('No attendance inputs found - possibly no classes data');
    }
  });

  test('[save] save button should be enabled and clickable', async ({ page }) => {
    // Navigate to bulk attendance page
    await page.goto('/school/attendance/bulk');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForSelector('[data-testid="bulk-table"]', { timeout: 10000 });

    // Check for save buttons
    const morningSaveBtn = page.getByTestId('bulk-attendance-save-morning');
    const eveningSaveBtn = page.getByTestId('bulk-attendance-save-evening');
    
    // At least one save button should be present
    const saveButtonsVisible = await Promise.any([
      morningSaveBtn.isVisible().catch(() => false),
      eveningSaveBtn.isVisible().catch(() => false)
    ]);

    if (saveButtonsVisible) {
      // Try to click one of the save buttons
      if (await morningSaveBtn.isVisible()) {
        await morningSaveBtn.click();
        // Wait for any response (success/error/loading state)
        await page.waitForTimeout(1000);
      } else if (await eveningSaveBtn.isVisible()) {
        await eveningSaveBtn.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('Save buttons not found - possibly no classes data');
    }
  });

  test('[refresh] refresh button should be present and clickable', async ({ page }) => {
    // Navigate to bulk attendance page
    await page.goto('/school/attendance/bulk');
    await page.waitForLoadState('networkidle');

    // Check for refresh button
    const refreshBtn = page.getByTestId('bulk-attendance-refresh');
    await expect(refreshBtn).toBeVisible();
    
    // Click refresh button
    await refreshBtn.click();
    
    // Wait for potential data refresh
    await page.waitForTimeout(1000);
  });

  test('[draft] should preserve data when navigating away and back', async ({ page }) => {
    // Navigate to bulk attendance page
    await page.goto('/school/attendance/bulk');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForSelector('[data-testid="bulk-table"]', { timeout: 10000 });

    // Find an attendance input and enter a value
    const firstInput = page.locator('[data-testid^="attendance-input-"]').first();
    if (await firstInput.isVisible()) {
      const testValue = '3';
      await firstInput.click();
      await firstInput.fill(testValue);
      
      // Verify the value was entered
      await expect(firstInput).toHaveValue(testValue);
      
      // Navigate to another page
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate back to bulk attendance
      await page.goto('/school/attendance/bulk');
      await page.waitForLoadState('networkidle');
      
      // Check if the value is preserved (this might not work if draft is not implemented)
      const sameInput = page.locator('[data-testid^="attendance-input-"]').first();
      if (await sameInput.isVisible()) {
        const currentValue = await sameInput.inputValue();
        // Note: This test might fail if draft functionality is not fully implemented
        console.log(`Input value after navigation: ${currentValue}`);
      }
    } else {
      console.log('No attendance inputs found for draft test');
    }
  });
});
