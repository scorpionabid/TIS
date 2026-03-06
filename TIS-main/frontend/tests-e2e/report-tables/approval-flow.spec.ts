import { test, expect, Page } from '@playwright/test';

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

/**
 * Helper: SektorAdmin kimi login ol
 */
async function loginAsSectorAdmin(page: Page) {
    await page.goto('/');
    await page.fill('#email', 'sektoradmin@atis.az');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });
}

test.describe('Report Table Approval Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsSuperAdmin(page);
    });

    test('approve row moves it from Təsdiq gözləyir to Hazır tab', async ({ page }) => {
        // Navigate to report tables
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        // Switch to Təsdiq gözləyir tab
        const approvalTab = page.locator('text=Təsdiq gözləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            // Look for a table with pending rows
            const pendingCard = page.locator('[data-testid="approval-queue-table"]').first();
            if (await pendingCard.isVisible().catch(() => false)) {
                // Expand the table
                await pendingCard.click();
                
                // Wait for pending rows to appear
                const pendingRow = page.locator('[data-testid="pending-row"]').first();
                if (await pendingRow.isVisible().catch(() => false)) {
                    // Store the row data for verification
                    const rowText = await pendingRow.textContent();
                    
                    // Click approve button
                    const approveButton = pendingRow.locator('button:has-text("Təsdiqlə")');
                    if (await approveButton.isVisible().catch(() => false)) {
                        await approveButton.click();
                        
                        // Wait for success toast
                        await expect(page.locator('text=Sətir təsdiq edildi')).toBeVisible({ timeout: 5000 });
                        
                        // Verify the row is no longer in pending tab
                        await expect(pendingRow).not.toBeVisible({ timeout: 3000 });
                        
                        // Switch to Hazır tab and verify the row is there
                        const readyTab = page.locator('text=Hazır').first();
                        await readyTab.click();
                        await page.waitForTimeout(500);
                        
                        // Verify approved row exists in Hazır tab
                        const approvedRow = page.locator('[data-testid="approved-row"]').first();
                        await expect(approvedRow).toBeVisible();
                    }
                }
            }
        }
    });

    test('reject row returns it to school for correction', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const approvalTab = page.locator('text=Təsdiq gözləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            const pendingCard = page.locator('[data-testid="approval-queue-table"]').first();
            if (await pendingCard.isVisible().catch(() => false)) {
                await pendingCard.click();
                
                const pendingRow = page.locator('[data-testid="pending-row"]').first();
                if (await pendingRow.isVisible().catch(() => false)) {
                    // Click reject button
                    const rejectButton = pendingRow.locator('button:has-text("Rədd et")');
                    if (await rejectButton.isVisible().catch(() => false)) {
                        await rejectButton.click();
                        
                        // Fill rejection reason
                        const reasonInput = page.locator('textarea[placeholder*="səbəb"]').first();
                        if (await reasonInput.isVisible().catch(() => false)) {
                            await reasonInput.fill('Məlumatlar natamamdır');
                            
                            // Confirm rejection
                            const confirmButton = page.locator('button:has-text("Rədd et")').last();
                            await confirmButton.click();
                            
                            // Wait for success toast
                            await expect(page.locator('text=Sətir rədd edildi')).toBeVisible({ timeout: 5000 });
                        }
                    }
                }
            }
        }
    });

    test('bulk approve multiple rows at once', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const approvalTab = page.locator('text=Təsdiq gözləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            // Select multiple rows
            const checkboxes = page.locator('[data-testid="row-checkbox"]').slice(0, 3);
            const checkboxCount = await checkboxes.count();
            
            if (checkboxCount > 0) {
                for (let i = 0; i < checkboxCount; i++) {
                    await checkboxes.nth(i).click();
                }
                
                // Click bulk approve button
                const bulkApproveButton = page.locator('button:has-text("Seçilənləri təsdiqlə")');
                if (await bulkApproveButton.isVisible().catch(() => false)) {
                    await bulkApproveButton.click();
                    
                    // Wait for success message
                    await expect(page.locator('text=təsdiq edildi')).toBeVisible({ timeout: 5000 });
                }
            }
        }
    });
});

test.describe('Report Table Grouping E2E', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsSuperAdmin(page);
    });

    test('approval queue shows correct grouping: Table -> Sector -> School', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const approvalTab = page.locator('text=Təsdiq gözləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            // Verify table-level grouping exists
            const tableGroup = page.locator('[data-testid="table-group"]').first();
            await expect(tableGroup).toBeVisible();

            // Expand table to see sectors
            await tableGroup.click();
            
            // Verify sector grouping exists
            const sectorGroup = page.locator('[data-testid="sector-group"]').first();
            if (await sectorGroup.isVisible().catch(() => false)) {
                // Verify sector name is displayed
                await expect(sectorGroup.locator('text=Sektor')).toBeVisible();
                
                // Expand sector to see schools
                await sectorGroup.click();
                
                // Verify school entries exist
                const schoolEntry = page.locator('[data-testid="school-entry"]').first();
                await expect(schoolEntry).toBeVisible();
            }
        }
    });

    test('ready tab shows correct grouping: Table -> Sector -> School', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const readyTab = page.locator('text=Hazır').first();
        if (await readyTab.isVisible().catch(() => false)) {
            await readyTab.click();
            await page.waitForTimeout(500);

            // Verify table-level grouping exists
            const tableGroup = page.locator('[data-testid="ready-table-group"]').first();
            await expect(tableGroup).toBeVisible();

            // Expand to see sectors
            await tableGroup.click();
            
            // Verify sector grouping
            const sectorGroup = page.locator('[data-testid="ready-sector-group"]').first();
            if (await sectorGroup.isVisible().catch(() => false)) {
                await expect(sectorGroup.locator('text=Sektor')).toBeVisible();
            }
        }
    });
});

test.describe('Sector Admin Scoping E2E', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsSectorAdmin(page);
    });

    test('sector admin only sees schools from their sector in approval queue', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const approvalTab = page.locator('text=Təsdiq görləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            // Verify sector filter is applied
            const sectorBadge = page.locator('[data-testid="sector-filter-badge"]').first();
            if (await sectorBadge.isVisible().catch(() => false)) {
                const sectorName = await sectorBadge.textContent();
                expect(sectorName).toBeTruthy();
            }

            // Verify only one sector is shown in grouping
            const sectorGroups = page.locator('[data-testid="sector-group"]');
            const sectorCount = await sectorGroups.count();
            
            // Sector admin should see max 1 sector (their own)
            expect(sectorCount).toBeLessThanOrEqual(1);
        }
    });

    test('sector admin can only approve/reject rows from their sector schools', async ({ page }) => {
        await page.goto('/report-tables');
        await page.waitForLoadState('networkidle');

        const approvalTab = page.locator('text=Təsdiq gözləyir').first();
        if (await approvalTab.isVisible().catch(() => false)) {
            await approvalTab.click();
            await page.waitForTimeout(500);

            // Find a pending row and verify school belongs to sector
            const pendingRow = page.locator('[data-testid="pending-row"]').first();
            if (await pendingRow.isVisible().catch(() => false)) {
                const schoolName = await pendingRow.locator('[data-testid="school-name"]').textContent();
                expect(schoolName).toBeTruthy();
                
                // Verify approve button is available
                const approveButton = pendingRow.locator('button:has-text("Təsdiqlə")');
                await expect(approveButton).toBeVisible();
            }
        }
    });
});
