import { test, expect, Page } from '@playwright/test';

/**
 * Helper: SchoolAdmin kimi login ol
 */
async function loginAsSchoolAdmin(page: Page) {
    await page.goto('/');
    await page.fill('#email', 'schooladmin@atis.az');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });
}

/**
 * Helper: SuperAdmin kimi login ol
 */
async function loginAsSuperAdmin(page: Page) {
    await page.goto('/');
    await page.fill('#email', 'superadmin@atis.az');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });
}

test.describe('Fixed Rows (Stable Tables) E2E', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsSuperAdmin(page);
    });

    test('create stable table with fixed rows', async ({ page }) => {
        // Navigate to create table
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        // Click create button
        const createButton = page.locator('button:has-text("Yeni cədvəl")').first();
        if (await createButton.isVisible().catch(() => false)) {
            await createButton.click();

            // Fill basic info
            await page.fill('[name="title"]', 'Test Stabil Cədvəl');
            await page.fill('[name="description"]', 'Test təsviri');
            
            // Navigate to columns step
            const nextButton = page.locator('button:has-text("Növbəti")').first();
            await nextButton.click();
            await page.waitForTimeout(500);

            // Enable stable table mode
            const stableToggle = page.locator('[data-testid="stable-table-toggle"]').first();
            if (await stableToggle.isVisible().catch(() => false)) {
                await stableToggle.click();
                
                // Add fixed rows
                const addRowButton = page.locator('button:has-text("Sətir əlavə et")').first();
                await addRowButton.click();
                await addRowButton.click();
                
                // Fill row labels
                const rowInputs = page.locator('[data-testid="fixed-row-input"]');
                await rowInputs.nth(0).fill('9-cu sinif');
                await rowInputs.nth(1).fill('10-cu sinif');
                await rowInputs.nth(2).fill('11-cu sinif');
                
                // Verify row count
                const rowCount = await rowInputs.count();
                expect(rowCount).toBe(3);
            }

            // Add a column
            const addColumnButton = page.locator('button:has-text("Sütun əlavə et")').first();
            await addColumnButton.click();
            await page.fill('[name="column_label"]', 'Məktəb adı');
            await page.selectOption('[name="column_type"]', 'text');

            // Save table
            const saveButton = page.locator('button:has-text("Yarat")').first();
            await saveButton.click();

            // Verify success
            await expect(page.locator('text=Cədvəl yaradıldı')).toBeVisible({ timeout: 5000 });
        }
    });

    test('stable table shows fixed rows to school admin', async ({ page }) => {
        // Login as school admin
        await loginAsSchoolAdmin(page);
        
        // Navigate to tables
        await page.goto('/report-tables-entry');
        await page.waitForLoadState('networkidle');

        // Find a stable table
        const stableTable = page.locator('[data-testid="fixed-rows-badge"]').first();
        if (await stableTable.isVisible().catch(() => false)) {
            // Click on the table
            const tableCard = stableTable.locator('..').locator('..');
            await tableCard.click();

            // Verify fixed rows are displayed
            const fixedRowLabels = page.locator('[data-testid="fixed-row-label"]');
            const labelCount = await fixedRowLabels.count();
            expect(labelCount).toBeGreaterThan(0);

            // Verify add row button is NOT visible for stable tables
            const addRowButton = page.locator('button:has-text("Sətir əlavə et")');
            await expect(addRowButton).not.toBeVisible();

            // Verify delete row buttons are NOT visible
            const deleteRowButtons = page.locator('[data-testid="delete-row-button"]');
            const deleteCount = await deleteRowButtons.count();
            expect(deleteCount).toBe(0);
        }
    });

    test('school can fill fixed rows and submit', async ({ page }) => {
        await loginAsSchoolAdmin(page);
        
        await page.goto('/report-tables-entry');
        await page.waitForLoadState('networkidle');

        // Find and open a stable table
        const tableCard = page.locator('[data-testid="report-table-card"]').first();
        if (await tableCard.isVisible().catch(() => false)) {
            await tableCard.click();

            // Fill cells in fixed rows
            const cellInputs = page.locator('[data-testid="table-cell-input"]');
            const cellCount = await cellInputs.count();
            
            if (cellCount > 0) {
                // Fill first cell
                await cellInputs.nth(0).fill('Test dəyər 1');
                
                // Fill second cell if exists
                if (cellCount > 1) {
                    await cellInputs.nth(1).fill('Test dəyər 2');
                }

                // Submit the form
                const submitButton = page.locator('button:has-text("Göndər")').first();
                await submitButton.click();

                // Verify submission
                await expect(page.locator('text=Cavab göndərildi')).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('dynamic table allows adding rows', async ({ page }) => {
        await loginAsSchoolAdmin(page);
        
        await page.goto('/report-tables-entry');
        await page.waitForLoadState('networkidle');

        // Find a dynamic table (no fixed-rows badge)
        const tableCards = page.locator('[data-testid="report-table-card"]');
        const cardCount = await tableCards.count();
        
        for (let i = 0; i < cardCount; i++) {
            const card = tableCards.nth(i);
            const hasFixedBadge = await card.locator('[data-testid="fixed-rows-badge"]').isVisible().catch(() => false);
            
            if (!hasFixedBadge) {
                // This is a dynamic table
                await card.click();
                
                // Verify add row button IS visible
                const addRowButton = page.locator('button:has-text("Sətir əlavə et")').first();
                await expect(addRowButton).toBeVisible();
                
                // Add a row
                const initialRows = await page.locator('[data-testid="table-row"]').count();
                await addRowButton.click();
                
                // Verify row was added
                const newRows = await page.locator('[data-testid="table-row"]').count();
                expect(newRows).toBe(initialRows + 1);
                
                break;
            }
        }
    });
});
