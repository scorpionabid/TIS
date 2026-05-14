import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the home page (which should redirect to login if not authenticated)
        await page.goto('/');
    });

    test('should display login page', async ({ page }) => {
        console.log('Current URL:', page.url());
        const content = await page.content();
        // Instead of console.log which might be truncated, write to a shared file if possible or just log a bit
        console.log('Content snippet:', content.substring(0, 500));
        await expect(page.locator('h1')).toContainText('ATİS');
        await expect(page.getByText('Sistemə giriş')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.fill('#email', 'wrong@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message
        const errorAlert = page.locator('[role="alert"]').first();
        await expect(errorAlert).toBeVisible();
        await expect(errorAlert).toContainText('Xətası');
    });

    test('should login successfully with superadmin credentials', async ({ page }) => {
        // Note: This requires backend to be running and have the test data
        await page.fill('#email', 'superadmin@atis.az');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');

        // Should redirect to dashboard or home
        // We check for some element that's only in the dashboard
        // For example, the user profile or a specific sidebar link
        await expect(page).not.toHaveURL(/.*login.*/);

        // Check if some dashboard specific text appears
        // Since I don't know the exact dashboard content yet, 
        // I'll check if the URL changes or a common element appears.
        // Let's assume there is a sidebar or header after login.
    });
});
