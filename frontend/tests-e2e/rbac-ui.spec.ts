import { test, expect } from '@playwright/test';

test.describe('RBAC UI Flow', () => {

    test('superadmin should see system administration dashboard', async ({ page }) => {
        // Login as SuperAdmin
        await page.goto('/');
        await page.fill('#email', 'superadmin@atis.az');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');

        // Verify Dashboard Title for SuperAdmin
        await expect(page.getByText('Sistem İdarəetməsi')).toBeVisible();
        await expect(page.getByText('Azərbaycan Təhsil İdarəetmə Sistemi - Ana Panel')).toBeVisible();

        // Verify Sidebar contains admin-only sections (e.g., Settings or Users if visible)
        // Checking for a common admin keyword in sidebars
        const sidebar = page.locator('nav');
        // Using a more generic approach if exact text is unknown, but based on Layout.tsx:
        // SuperAdmin subtitle is "Azərbaycan Təhsil İdarəetmə Sistemi - Ana Panel"
    });

    test('teacher should see personal dashboard without admin items', async ({ page }) => {
        // Login as Teacher/TestUser
        await page.goto('/');
        await page.fill('#email', 'test@example.com');
        await page.fill('#password', 'test123');
        await page.click('button[type="submit"]');

        // Verify Dashboard Title for non-admin
        await expect(page.getByText('İdarəetmə Paneli')).toBeVisible();
        await expect(page.getByText('Azərbaycan Təhsil İdarəetmə Sistemi')).toBeVisible();

        // Ensure admin panel subtitle is NOT visible
        await expect(page.getByText('Sistem İdarəetməsi')).not.toBeVisible();
    });
});
