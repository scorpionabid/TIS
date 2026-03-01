import { test, expect } from '@playwright/test';

test.describe('Assessment Gradebook E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Teacher or Admin with access to gradebook
        await page.goto('/');
        await page.fill('#email', 'superadmin@atis.az');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');

        // Confirm login
        await expect(page.getByText('Sistem İdarəetməsi')).toBeVisible();

        // Navigate to Gradebook
        await page.goto('/school/gradebook');
        // Wait for class select prompt to appear
        await expect(page.getByText('Sinif seçin', { exact: true })).toBeVisible();
    });

    test('[class-select] Sinif seçimi işləyir və tablar açılır', async ({ page }) => {
        // Find select trigger and open it
        const classSelect = page.getByTestId('class-select');
        await expect(classSelect).toBeVisible();
        await classSelect.click();

        // If there are classes available, select the first one
        // Typically role='option' in Radix UI Select
        const firstClassOption = page.getByRole('option').first();
        if (await firstClassOption.isVisible()) {
            await firstClassOption.click();
            
            // Wait for tabs to appear
            await expect(page.getByTestId('assessments-tab')).toBeVisible();
            await expect(page.getByTestId('grades-tab')).toBeVisible();
            await expect(page.getByTestId('new-assessment-btn')).toBeVisible();
        }
    });

    test('[grading] Qiymətləndirmə siyahısı və qiymət daxil etmə forması', async ({ page }) => {
        // First select a class
        const classSelect = page.getByTestId('class-select');
        await classSelect.click();
        
        const firstClassOption = page.getByRole('option').first();
        if (await firstClassOption.isVisible()) {
            await firstClassOption.click();

            // Click on existing assessment (if any) or create btn
            // We search for general specific card or button text inside the assessment list
            const viewBoxes = page.getByRole('button', { name: /Qiymətlər/i });
            
            if (await viewBoxes.first().isVisible()) {
                await viewBoxes.first().click();

                // Wait for the grading interface to load
                await expect(page.getByTestId('save-grades-btn')).toBeVisible();

                // Find at least one student grade input
                const firstGradeInput = page.locator('input[type="number"]').first();
                if (await firstGradeInput.isVisible()) {
                    await firstGradeInput.fill('10');
                }
            }
        }
    });
});
