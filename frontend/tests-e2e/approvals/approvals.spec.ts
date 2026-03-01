import { test, expect } from '@playwright/test';

test.describe('Approvals Dashboard E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login as SuperAdmin
        await page.goto('/');
        await page.fill('#email', 'superadmin@atis.az');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');

        // Confirm login
        await expect(page.getByText('Sistem İdarəetməsi')).toBeVisible();

        // Navigate to Approvals
        await page.goto('/approvals');
    });

    test('[approvals] Sorğu cavablarının təsdiqi səhifəsi yüklənir', async ({ page }) => {
        // Wait for title
        await expect(page.getByTestId('survey-approval-title')).toBeVisible();

        // Check if stats cards are visible
        await expect(page.getByTestId('stat-card-total')).toBeVisible();
        await expect(page.getByTestId('stat-card-pending')).toBeVisible();
        await expect(page.getByTestId('stat-card-approved')).toBeVisible();
        
        // Ensure values are numbers (even if 0)
        const pendingText = await page.getByTestId('stat-value-pending').textContent();
        expect(pendingText).not.toBeNull();
        expect(Number(pendingText)).toBeGreaterThanOrEqual(0);
    });

    test('[approvals] Toplu təsdiqləmə düymələri mövcuddur', async ({ page }) => {
        // Depending on whether there are items to select, the bulk action bar 
        // will show up when items are selected. We will just check if the buttons 
        // are generally findable when they appear in the DOM.
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
        
        // Find checkboxes to select row
        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 1) { // 1 might be the 'select all'
            // Click the first row checkbox
            await checkboxes.nth(1).check();
            
            // Now bulk action buttons should be visible
            await expect(page.getByTestId('bulk-approve-btn')).toBeVisible();
            await expect(page.getByTestId('bulk-reject-btn')).toBeVisible();
        }
    });
});
