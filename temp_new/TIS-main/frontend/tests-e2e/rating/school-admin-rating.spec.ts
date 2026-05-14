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

test.describe('School Admin Rating', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsSuperAdmin(page);
        await page.goto('/school-admin-rating');
        // Toolbar-ın yüklənməsini gözlə
        await expect(page.getByTestId('rating-refresh-btn')).toBeVisible({ timeout: 10000 });
    });

    test('[smoke] Səhifə yüklənir, toolbar elementləri görünür', async ({ page }) => {
        await expect(page.getByTestId('rating-search')).toBeVisible();
        await expect(page.getByTestId('rating-period-select')).toBeVisible();
        await expect(page.getByTestId('rating-refresh-btn')).toBeVisible();
        await expect(page.getByTestId('rating-status-select')).toBeVisible();
        await expect(page.getByTestId('rating-export-btn')).toBeVisible();
    });

    test('[filter] Axtarış inputuna mətn daxil etmək mümkündür', async ({ page }) => {
        const searchInput = page.getByTestId('rating-search');
        await searchInput.fill('Test');
        await expect(searchInput).toHaveValue('Test');
        // Axtarışı təmizlə
        await searchInput.fill('');
    });

    test('[ui] Ay seçicisi açılır və seçim edilə bilir', async ({ page }) => {
        const periodTrigger = page.getByTestId('rating-period-select');
        await periodTrigger.click();
        // Açılan dropdown-da ay seçimləri görünür (Yanvar, Fevral, etc.)
        const listbox = page.getByRole('listbox');
        await expect(listbox).toBeVisible();
        // Dropdown-ı bağla (Escape)
        await page.keyboard.press('Escape');
    });

    test('[ui] Sektor başlığına klik edildikdə qrup açılır', async ({ page }) => {
        // İlk sektor başlığını tap (Building2 ikonlu button)
        const sectorButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /direktor/ });
        const count = await sectorButtons.count();

        if (count === 0) {
            // Məlumat yoxdursa testi keç
            test.skip();
            return;
        }

        const firstSector = sectorButtons.first();
        // İlkin vəziyyət: bağlı (ChevronRight icon)
        await firstSector.click();
        // Açıldı: cədvəl görünür olmalıdır (rating-table)
        await expect(page.getByTestId('rating-table').first()).toBeVisible({ timeout: 5000 });
        // Yenidən klik — bağlanır
        await firstSector.click();
        await expect(page.getByTestId('rating-table').first()).not.toBeVisible({ timeout: 3000 });
    });

    test('[dialog] Manual bal dialog açılır, kateqoriya olmadıqda save disabled olur', async ({ page }) => {
        // Açıq bir sektoru tap
        const sectorButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /direktor/ });
        const count = await sectorButtons.count();

        if (count === 0) {
            test.skip();
            return;
        }

        // Sektoru aç
        await sectorButtons.first().click();

        // Cədvəldəki ilk manual edit düyməsini tap
        const editBtns = page.locator('[data-testid^="rating-manual-edit-"]');
        await expect(editBtns.first()).toBeVisible({ timeout: 5000 });
        await editBtns.first().click();

        // Dialog görünür
        const dialog = page.getByTestId('manual-score-dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Save düyməsi disabled (kateqoriya seçilməyib)
        const saveBtn = page.getByTestId('manual-score-save');
        await expect(saveBtn).toBeDisabled();

        // Cancel ilə bağla
        await page.getByTestId('manual-score-cancel').click();
        await expect(dialog).not.toBeVisible();
    });
});
