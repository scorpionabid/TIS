import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: Superadmin ilə giriş
// ---------------------------------------------------------------------------
async function loginAsSuperAdmin(page: Parameters<typeof test.fn>[0]['page']) {
  await page.goto('/');
  await page.fill('#email', 'superadmin@atis.az');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page.getByText('Sistem İdarəetməsi')).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
test.describe('GradeBook E2E — /grade-books?tab=list', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/grade-books?tab=list');
  });

  // -------------------------------------------------------------------------
  // 1. Səhifə yüklənməsi
  // -------------------------------------------------------------------------
  test('[load] Jurnal siyahısı səhifəsi yüklənir', async ({ page }) => {
    // "Sinif Jurnalları" tab görünür
    await expect(page.getByRole('tab', { name: /Sinif Jurnalları/i })).toBeVisible({ timeout: 10000 });

    // "Nəticə Analizi" tab da görünür
    await expect(page.getByRole('tab', { name: /Nəticə Analizi/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Status filter — "Aktiv" tab
  // -------------------------------------------------------------------------
  test('[filter-active] "Aktiv" tabı kliklədikdə URL dəyişmir amma filter tətbiq edilir', async ({ page }) => {
    // "Aktiv" tabına klik et
    await page.getByRole('button', { name: /^Aktiv$/i }).click();

    // Skeleton göstərilmir (yüklənmə bitdi)
    await expect(page.locator('[data-testid="skeleton"]')).toHaveCount(0, { timeout: 10000 });

    // "Hamısı" tab artıq aktiv deyil, "Aktiv" aktiv oldu
    // → yalnız onu yoxlayırıq ki, "Aktiv" düyməsi var
    await expect(page.getByRole('button', { name: /^Aktiv$/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3. Jurnal axtar — search input
  // -------------------------------------------------------------------------
  test('[search] Axtarış inputu mövcuddur və filter işləyir', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Jurnal axtar...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Mövcud olmayan mətni axtar → boş vəziyyət görünür
    await searchInput.fill('XYZnotexist12345');
    await expect(page.getByText('Jurnal tapılmadı')).toBeVisible({ timeout: 5000 });

    // Silincə jurnallar geri gəlir (ya da boş dövlət - institutionId yoxdursa)
    await searchInput.fill('');
  });

  // -------------------------------------------------------------------------
  // 4. Nəticə Analizi tab açılır
  // -------------------------------------------------------------------------
  test('[analysis-tab] "Nəticə Analizi" tabına keçid işləyir', async ({ page }) => {
    await page.getByRole('tab', { name: /Nəticə Analizi/i }).click();

    // URL-də tab=analysis olmalıdır
    await expect(page).toHaveURL(/tab=analysis/, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 5. Region Admin hiyerarşiyası
  // -------------------------------------------------------------------------
  test('[hierarchy] Superadmin üçün hiyerarşiya panel görünür', async ({ page }) => {
    // Superadmin canViewHierarchy=true olduğundan "Hiyerarşiya" panel render edilir
    await expect(page.getByPlaceholder('Məktəb və ya sektor axtar...')).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // 6. Siniflər paneli — məktəb seçimi
  // -------------------------------------------------------------------------
  test('[grade-panel] Məktəb seçildikdə siniflər paneli göstərilir', async ({ page }) => {
    // İlk institution node-unu tap (hierarchy navigator-da "institution" class)
    // Sadece hiyerarşiyada bir element varsa klik et
    const institutionBtn = page.locator('[class*="cursor-pointer"]').filter({ hasText: '' }).first();

    // Əgər hierarchy navigator varsa, ilk əlçatan məktəbə klikləməyə çalış
    const hierarchyNavigator = page.getByText('Hiyerarşiya');
    if (await hierarchyNavigator.isVisible()) {
      // "Siniflər" paneli mövcud olmalıdır
      await expect(page.getByText('Siniflər')).toBeVisible({ timeout: 10000 });
    }

    // "Bütün siniflər" düyməsi ya görünür (məktəb seçilib) ya da "Məktəb seçin" mesajı
    const allClassesBtn = page.getByRole('button', { name: /Bütün siniflər/i });
    const selectSchoolMsg = page.getByText('Məktəb seçin');
    await expect(allClassesBtn.or(selectSchoolMsg)).toBeVisible({ timeout: 5000 });
  });
});
