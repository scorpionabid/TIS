# ATİS Sistemi - Manual Test Təlimatı

## 📋 Ümumi Məlumat

Bu sənəd ATİS (Azərbaycan Təhsil İdarəetmə Sistemi) platformasının əsas funksionallıqlarının manual test edilməsi üçün addım-addım təlimatlar təqdim edir.

**Test Mühiti:** Docker konteyner mühiti
**URL:** http://localhost:3000
**Backend API:** http://localhost:8000/api

---

## 🔐 Test İstifadəçiləri

| Rol | Email | Şifrə | Səlahiyyətlər |
|-----|-------|-------|---------------|
| SuperAdmin | superadmin@atis.az | admin123 | Bütün sistemə tam giriş |
| RegionAdmin | admin@atis.az | admin123 | Regional idarəetmə |
| SchoolAdmin | test@example.com | test123 | Məktəb səviyyəsində idarəetmə |

---

## 1️⃣ Sorğular (Surveys) Funksionallığı

### 1.1 Yeni Sorğu Yaratmaq

**Rol:** SuperAdmin, RegionAdmin, SektorAdmin

**Test Addımları:**

1. **Sorğular səhifəsinə keçid**
   - Sol menyudan "Sorğular" bölməsinə klikləyin
   - Səhifə yüklənməli və mövcud sorğuların siyahısı görünməlidir

2. **Yeni sorğu yaratmaq**
   - Sağ yuxarı küncdə "➕ Yeni Sorğu" düyməsinə klikləyin
   - Sorğu yaratma modalı açılmalıdır

3. **Əsas məlumatları doldurun**
   - **Başlıq:** "2024-2025 Tədris ili İşçilərin Məmnuniyyət Sorğusu"
   - **Təsvir:** "Təhsil işçilərinin iş şəraitindən məmnuniyyətini ölçmək məqsədilə"
   - **Status:** "Aktiv" seçin
   - **Başlama tarixi:** Bugünün tarixini seçin
   - **Bitmə tarixi:** 1 ay sonrakı tarixi seçin

4. **Hədəf auditoriya seçimi**
   - **Rol seçimi:** "Müəllimlər" checkbox-ını işarələyin
   - **İnstitusiya seçimi:** Test məktəbinizi seçin
   - Seçilmiş hədəflərin sayını yoxlayın

5. **Suallar əlavə etmək**
   - "Sual Əlavə Et" düyməsinə klikləyin
   - **Sual 1:**
     - Mətn: "İş mühitinizdən nə dərəcədə razısınız?"
     - Tip: "Çoxseçimli (Radio)"
     - Variantlar: "Çox razıyam, Razıyam, Neytral, Razı deyiləm, Heç razı deyiləm"
     - "Məcburi sual" checkbox-ını işarələyin

   - **Sual 2:**
     - Mətn: "Hansı sahələrdə dəstəyə ehtiyacınız var?"
     - Tip: "Çoxseçimli (Checkbox)"
     - Variantlar: "Texniki avadanlıq, Tədris materialları, Peşəkar inkişaf, Maaş artımı"

   - **Sual 3:**
     - Mətn: "Təkliflərinizi yazın"
     - Tip: "Uzun mətn"
     - Məcburi deyil

6. **Sorğunu yadda saxlamaq**
   - "Sorğu Yarat" düyməsinə klikləyin
   - Uğurlu mesaj görünməlidir
   - Sorğular siyahısında yeni sorğu görünməlidir

**Gözlənilən Nəticə:** ✅ Sorğu uğurla yaradılır və hədəf auditoriyanın sayı düzgün göstərilir

---

### 1.2 Sorğuya Cavab Vermək

**Rol:** Müəllim (hədəflənmiş istifadəçi)

**Test Addımları:**

1. **Müəllim hesabı ilə giriş**
   - Sistem açıq sorğuları avtomatik göstərməlidir

2. **Sorğunu açmaq**
   - Dashboard-da "Açıq Sorğular" bölməsindən sorğuya klikləyin
   - Sorğu səhifəsi açılmalıdır

3. **Cavabları doldurmaq**
   - Sual 1: "Razıyam" seçin
   - Sual 2: "Texniki avadanlıq" və "Tədris materialları" seçin
   - Sual 3: "Smartboard və projektor lazımdır" yazın

4. **Göndərmək**
   - "Göndər" düyməsinə klikləyin
   - Təsdiq mesajı görünməlidir
   - Sorğu "Tamamlanmış" statusuna keçməlidir

**Gözlənilən Nəticə:** ✅ Cavablar uğurla göndərilir və sorğu tamamlanmış kimi işarələnir

---

### 1.3 Sorğu Nəticələrinə Baxmaq

**Rol:** SuperAdmin, RegionAdmin

**Test Addımları:**

1. **Sorğular səhifəsinə keçid**
   - Sorğular siyahısından test sorğusunu tapın

2. **Nəticələri göstərmək**
   - Sorğu sətirində "👁️ Nəticələr" düyməsinə klikləyin
   - Nəticələr səhifəsi açılmalıdır

3. **Statistikaya baxmaq**
   - Ümumi cavab sayını yoxlayın
   - Hər sualın statistikasını gözdən keçirin
   - Qrafik və diaqramları yoxlayın

4. **Fərdi cavablara baxmaq**
   - "Bütün Cavablar" tab-ına keçid edin
   - Hər istifadəçinin cavablarını görün
   - Filterlə axtarış edin

**Gözlənilən Nəticə:** ✅ Statistika düzgün hesablanır və qrafiklər görsənir

---

## 2️⃣ Bildirişlər (Notifications)

### 2.1 Bildiriş Göndərmək

**Rol:** SuperAdmin, RegionAdmin

**Test Addımları:**

1. **Bildirişlər bölməsinə keçid**
   - Sol menyudan "Bildirişlər" seçin

2. **Yeni bildiriş yaratmaq**
   - "➕ Yeni Bildiriş" düyməsinə klikləyin

3. **Bildiriş məlumatları**
   - **Başlıq:** "Təcili: Sistem Yeniləməsi"
   - **Məzmun:** "Sabah saat 14:00-da sistem 30 dəqiqə ərzində yenilənəcək"
   - **Tip:** "Xəbərdarlıq" (warning)
   - **Prioritet:** "Yüksək"

4. **Hədəf istifadəçilər**
   - **Rol:** "Bütün istifadəçilər" seçin
   - və ya spesifik rollar seçin

5. **Göndərmək**
   - "Göndər" düyməsinə klikləyin
   - Təsdiq mesajı görünməlidir

**Gözlənilən Nəticə:** ✅ Bildiriş hədəf istifadəçilərə dərhal göndərilir

---

### 2.2 Bildirişləri Oxumaq

**Rol:** İstənilən istifadəçi

**Test Addımları:**

1. **Bildiriş ikonu**
   - Sağ yuxarı küncdə zəng ikonu (🔔) görünməlidir
   - Oxunmamış bildiriş sayı qırmızı nöqtə ilə göstərilməlidir

2. **Bildirişlər panelini açmaq**
   - Zəng ikonuna klikləyin
   - Dropdown panel açılmalıdır

3. **Bildirişi oxumaq**
   - Bildirişə klikləyin
   - Oxunmuş kimi işarələnməlidir
   - Sayğac azalmalıdır

4. **Bütün bildirişləri görmək**
   - "Hamısına bax" linkinə klikləyin
   - Tam bildirişlər səhifəsi açılmalıdır

**Gözlənilən Nəticə:** ✅ Bildirişlər real-vaxt rejimində görsənir və oxunma statusu düzgün işləyir

---

## 3️⃣ Linklər (Links) - Resurs Paylaşımı

### 3.1 Link Təyin Etmək

**Rol:** RegionAdmin, SektorAdmin

**Test Addımları:**

1. **Resurslar səhifəsinə keçid**
   - Sol menyudan "Resurslar" seçin

2. **Yeni link əlavə etmək**
   - "Linklər" tab-ına keçid edin
   - "➕ Yeni Link" düyməsinə klikləyin

3. **Link məlumatları**
   - **Başlıq:** "E-Dərslik Platforması"
   - **URL:** "https://e-derslik.edu.az"
   - **Təsvir:** "Rəqəmsal dərslik və tədris materialları"
   - **Kateqoriya:** "Tədris materialları"

4. **Hədəf təyin etmək**
   - **Rollar:** "Müəllimlər" seçin
   - **İnstitusiyalar:** Test məktəbinizi seçin

5. **Yadda saxlamaq**
   - "Təyin Et" düyməsinə klikləyin
   - Uğur mesajı görünməlidir

**Gözlənilən Nəticə:** ✅ Link hədəf istifadəçilərə təyin edilir

---

### 3.2 Təyin Edilmiş Linkə Baxmaq

**Rol:** Müəllim

**Test Addımları:**

1. **Mənim Resurslarım səhifəsinə keçid**
   - Sol menyudan "Mənim Resurslarım" seçin

2. **Təyin Edilmiş Resurslar bölməsi**
   - "Linklər" tab-ına keçid edin
   - Təyin edilmiş link görünməlidir

3. **Linkə daxil olmaq**
   - Link başlığına klikləyin
   - Yeni tab-da URL açılmalıdır
   - Sistem istifadə tarixini qeyd etməlidir

**Gözlənilən Nəticə:** ✅ Təyin edilmiş linklər düzgün görsənir və açılır

---

## 4️⃣ Sənədlər (Documents)

### 4.1 Sənəd Yükləmək

**Rol:** RegionAdmin, SektorAdmin

**Test Addımları:**

1. **Resurslar səhifəsinə keçid**
   - "Sənədlər" tab-ına keçid edin

2. **Yeni sənəd yükləmək**
   - "📤 Sənəd Yüklə" düyməsinə klikləyin

3. **Sənəd məlumatları**
   - **Fayl seçimi:** PDF, Word və ya Excel fayl seçin (max 10MB)
   - **Başlıq:** "2024-2025 Tədris Planı"
   - **Təsvir:** "İllik tədris planı və qiymətləndirmə meyarları"
   - **Kateqoriya:** "Rəsmi sənədlər"

4. **Hədəf təyini**
   - **Rollar:** "Məktəb adminləri" və "Müəllimlər" seçin
   - **İnstitusiyalar:** Test məktəbini seçin

5. **Yükləmək**
   - "Yüklə və Təyin Et" düyməsinə klikləyin
   - Yükləmə proqressi görünməlidir
   - Uğur mesajı gözləyin

**Gözlənilən Nəticə:** ✅ Sənəd uğurla yüklənir və hədəf istifadəçilərə təyin edilir

---

### 4.2 Sənədi Yükləmək (Download)

**Rol:** Müəllim

**Test Addımları:**

1. **Mənim Resurslarım səhifəsi**
   - "Sənədlər" tab-ına keçid edin
   - Təyin edilmiş sənəd görünməlidir

2. **Sənəd haqqında məlumat**
   - Fayl adı, ölçüsü, kateqoriya görsənməlidir
   - Yükləyən şəxsin adı və tarixi görsənməlidir

3. **Yükləmək**
   - "⬇️ Yüklə" düyməsinə klikləyin
   - Fayl brauzerin download qovluğuna yüklənməlidir

4. **Faylı açmaq**
   - Yüklənmiş faylı açın
   - Məzmunun düzgün olduğunu təsdiq edin

**Gözlənilən Nəticə:** ✅ Sənəd düzgün yüklənir və açılır

---

## 5️⃣ Paylaşılan Folderlər (Shared Folders)

### 5.1 Folder Yaratmaq

**Rol:** SuperAdmin, RegionAdmin

**Test Addımları:**

1. **Mənim Resurslarım səhifəsinə keçid**
   - "Paylaşılan Folderlər" bölməsinə baxın

2. **Yeni folder yaratmaq**
   - "📁 Yeni Folder" düyməsinə klikləyin

3. **Folder məlumatları**
   - **Ad:** "Riyaziyyat Tədris Materialları"
   - **Təsvir:** "5-9-cu sinif riyaziyyat üzrə dərslik və test materialları"
   - **Rəng:** Mavi seçin

4. **Hədəf institutlar**
   - Test məktəbinizi seçin
   - Digər məktəbləri də əlavə edə bilərsiniz

5. **Yaratmaq**
   - "Folder Yarat" düyməsinə klikləyin
   - Folder siyahıda görünməlidir

**Gözlənilən Nəticə:** ✅ Folder uğurla yaradılır və hədəf institutlara paylaşılır

---

### 5.2 Folderə Sənəd Əlavə Etmək

**Rol:** SuperAdmin, RegionAdmin, SektorAdmin, SchoolAdmin

**Test Addımları:**

1. **Folderi açmaq**
   - Yaratdığınız folderə klikləyin
   - Folder modal pəncərəsi açılmalıdır

2. **Sənəd yükləmək**
   - "📤 Fayl Yüklə" düyməsinə klikləyin
   - PDF, Word və ya Excel fayl seçin

3. **Yükləmə prosesi**
   - Yükləmə proqress barı görünməlidir
   - Uğurla yükləndikdə sənəd folderədəki siyahıda görünməlidir

4. **Çoxsaylı fayl yükləmək**
   - Eyni prosesi təkrarlayın
   - 3-5 fərqli fayl yükləyin

**Gözlənilən Nəticə:** ✅ Fayllar uğurla folderə yüklənir və siyahıda görsənir

---

### 5.3 Folderdəki Sənədə Baxmaq

**Rol:** Hədəf institutun istənilən istifadəçisi

**Test Addımları:**

1. **Mənim Resurslarım səhifəsi**
   - "Paylaşılan Folderlər" bölməsinə baxın
   - Paylaşılmış folder görünməlidir

2. **Folderi açmaq**
   - Folder kartına klikləyin
   - Folderdəki bütün sənədlər siyahıda görsənməlidir

3. **Sənəd məlumatları**
   - Hər sənəd üçün: ad, ölçü, yükləyən, tarix görünməlidir

4. **Sənədi yükləmək**
   - "⬇️" düyməsinə klikləyin
   - Fayl yüklənməlidir

**Gözlənilən Nəticə:** ✅ Folder və sənədlər hədəf istifadəçilər üçün əlçatandır

---

## 6️⃣ Təsdiqləmə İşləri (Approvals)

### 6.1 Təsdiqləməyə Göndərmək

**Rol:** SchoolAdmin

**Test Addımları:**

1. **Tələb yaratmaq**
   - "Təsdiqləmələr" bölməsinə keçid edin
   - "➕ Yeni Tələb" düyməsinə klikləyin

2. **Tələb məlumatları**
   - **Növ:** "Büdcə Tələbi" seçin
   - **Başlıq:** "Kompüter Laboratoriyası Avadanlığı"
   - **Məbləğ:** 15000 AZN
   - **Əsaslandırma:** "30 ədəd kompüter və 1 projektor alışı üçün"
   - **Sənəd:** Smeta faylını əlavə edin

3. **Təsdiqləmə zənciri**
   - Avtomatik SektorAdmin-ə göndərilməlidir
   - Status: "Gözləmədə" olmalıdır

4. **Göndərmək**
   - "Təsdiqə Göndər" düyməsinə klikləyin
   - Təsdiq mesajı görünməlidir

**Gözlənilən Nəticə:** ✅ Tələb təsdiqləmə zəncirinə daxil olur

---

### 6.2 Tələbi Təsdiq Etmək

**Rol:** SektorAdmin

**Test Addımları:**

1. **Təsdiqləmələr səhifəsinə keçid**
   - Bildiriş gəlməlidir
   - Gözləyən tələblər siyahıda görünməlidir

2. **Tələbə baxmaq**
   - Tələb kartına klikləyin
   - Bütün detalları oxuyun
   - Əlavə olunmuş sənədi yükləyib yoxlayın

3. **Qərar vermək**
   - **Təsdiq etmək:**
     - "✅ Təsdiq Et" düyməsinə klikləyin
     - Qeyd əlavə edin: "Avadanlıq alışı məqsədəuyğundur"
     - Təsdiq edin

   - **və ya Rədd etmək:**
     - "❌ Rədd Et" düyməsinə klikləyin
     - Səbəb yazın: "Büdcə məhdudiyyəti səbəbilə"
     - Rədd edin

4. **Növbəti addım**
   - Təsdiq olunarsa → RegionAdmin-ə göndərilir
   - Rədd olunarsa → SchoolAdmin-ə bildiriş gedir

**Gözlənilən Nəticə:** ✅ Təsdiqləmə zənciri düzgün işləyir və bildirişlər göndərilir

---

### 6.3 Son Təsdiq (Final Approval)

**Rol:** RegionAdmin

**Test Addımları:**

1. **Son təsdiqləmə**
   - SektorAdmin təsdiq etdikdən sonra RegionAdmin-ə gəlir

2. **Yekun qərar**
   - Bütün təsdiqləmə tarixçəsinə baxın
   - Əvvəlki qeydləri oxuyun
   - Son qərarı verin

3. **Təsdiq nəticəsi**
   - Təsdiq: Status "Təsdiqləndi" olur
   - Rədd: Status "Rədd edildi" olur
   - Orijinal göndərənə bildiriş gedir

**Gözlənilən Nəticə:** ✅ Təsdiqləmə prosesi tamamlanır və bütün tərəflərə bildiriş gedir

---

## 7️⃣ Sorğu Nəticələrini Export Etmək

### 7.1 Excel Export

**Rol:** SuperAdmin, RegionAdmin

**Test Addımları:**

1. **Sorğu nəticələri səhifəsi**
   - Tamamlanmış sorğunu açın
   - "Nəticələr" bölməsinə keçid edin

2. **Export seçimləri**
   - "📊 Export" düyməsinə klikləyin
   - Dropdown menyudan format seçin

3. **Excel formatı**
   - "Excel (.xlsx)" seçin
   - Export prosesi başlamalıdır
   - Fayl avtomatik yüklənməlidir

4. **Excel faylını yoxlamaq**
   - Faylı Microsoft Excel və ya Google Sheets-də açın
   - **Yoxlanmalı məlumatlar:**
     - Sorğu başlığı və tarixi
     - İstifadəçi məlumatları (ad, soyad, rol, institutisiya)
     - Hər sualın cavabları
     - Tarix və zaman məlumatları
     - Ümumi statistika (ayrıca sheet-də)

**Gözlənilən Nəticə:** ✅ Excel faylı düzgün formatlı və tam məlumatla yüklənir

---

### 7.2 PDF Export

**Test Addımları:**

1. **PDF formatı seçmək**
   - "📄 PDF" seçin

2. **PDF parametrləri (əgər varsa)**
   - Üz səhifə daxil edilsin (checkbox)
   - Qrafikləri daxil et (checkbox)
   - Parametrləri təsdiq edin

3. **PDF yükləmək**
   - "Export" düyməsinə klikləyin
   - PDF hazırlanma prosesi görünməlidir
   - Fayl yüklənməlidir

4. **PDF-i yoxlamak**
   - PDF-i açın
   - **Yoxlanmalı məlumatlar:**
     - Düzgün formatlaşma
     - Qrafik və diaqramlar
     - Cədvəl strukturu
     - Səhifə nömrələri

**Gözlənilən Nəticə:** ✅ PDF düzgün formatda və oxunaqlı şəkildə hazırlanır

---

### 7.3 CSV Export (Raw Data)

**Test Addımları:**

1. **CSV formatı**
   - "📋 CSV" seçin
   - "Ham Data" və ya "Statistika" seçimi edə bilərsiniz

2. **CSV yükləmək**
   - Fayl .csv formatında yüklənməlidir

3. **CSV-ni yoxlamak**
   - Excel və ya mətn redaktorunda açın
   - Vergüllə ayrılmış dəyərlər olmalıdır
   - UTF-8 kodlaşdırma (Azərbaycan hərfləri düzgün görünməlidir)

**Gözlənilən Nəticə:** ✅ CSV fayl düzgün struktur və kodlaşdırma ilə hazırlanır

---

## 8️⃣ Tapşırıqlar (Tasks)

### 8.1 Tapşırıq Yaratmaq və Təyin Etmək

**Rol:** RegionAdmin, SektorAdmin

**Test Addımları:**

1. **Tapşırıqlar bölməsinə keçid**
   - Sol menyudan "Tapşırıqlar" seçin

2. **Yeni tapşırıq**
   - "➕ Yeni Tapşırıq" düyməsinə klikləyin

3. **Tapşırıq məlumatları**
   - **Başlıq:** "İllik Hesabat Hazırlığı"
   - **Təsvir:** "2023-2024 tədris ilinin akademik hesabatını hazırlayın"
   - **Prioritet:** "Yüksək" seçin
   - **Son tarix:** 2 həftə sonra seçin

4. **Təyin etmək**
   - **Rol:** "Məktəb adminləri" seçin
   - **İnstitusiyalar:** Test məktəbini seçin
   - və ya spesifik istifadəçi seçin

5. **Əlavə parametrlər**
   - **Attachment:** Təlimat faylı əlavə edin
   - **Xatırlatma:** 3 gün əvvəl xatırlat (checkbox)

6. **Yaratmaq**
   - "Tapşırıq Yarat" düyməsinə klikləyin
   - Bildiriş göndərilməlidir

**Gözlənilən Nəticə:** ✅ Tapşırıq yaradılır və hədəf istifadəçilərə təyin edilir

---

### 8.2 Tapşırığı İcra Etmək

**Rol:** SchoolAdmin (təyin edilmiş istifadəçi)

**Test Addımları:**

1. **Bildiriş almaq**
   - Yeni tapşırıq bildirişi gəlməlidir
   - Dashboard-da "Mənim Tapşırıqlarım" bölməsində görünməlidir

2. **Tapşırığa baxmaq**
   - Tapşırıq kartına klikləyin
   - Detalları oxuyun
   - Attachment-i yükləyin

3. **İşə başlamaq**
   - "▶️ İşə Başla" düyməsinə klikləyin
   - Status "İcrada" olaraq dəyişməlidir
   - Başlama tarixi qeyd edilməlidir

4. **Tərəqqi qeydləri**
   - "Qeyd Əlavə Et" düyməsinə klikləyin
   - Mesaj: "Məlumatlar toplanıldı, hesabat yazılır"
   - Yadda saxlayın
   - Tarixçədə görünməlidir

5. **Tamamlamaq**
   - "✅ Tamamla" düyməsinə klikləyin
   - Son qeyd əlavə edin: "Hesabat hazırdır"
   - Nəticə faylını yükləyin
   - Təsdiq edin

**Gözlənilən Nəticə:** ✅ Tapşırıq statusu düzgün dəyişir və tərəqqi qeydləri saxlanır

---

### 8.3 Tapşırıq Monitorinqi

**Rol:** RegionAdmin (tapşırığı yaradan)

**Test Addımları:**

1. **Tapşırıqlar səhifəsi**
   - "Mənim Yaratdığım Tapşırıqlar" tab-ına keçid edin

2. **Status filtri**
   - "İcrada" statusunu seçin
   - Aktiv tapşırıqlar görünməlidir

3. **Tərəqqi izləmək**
   - Tapşırığa klikləyin
   - "Tərəqqi Tarixçəsi" bölməsinə baxın
   - İcraçının qeydlərini görün

4. **Xatırlatma göndərmək**
   - Gecikmiş tapşırıq varsa
   - "🔔 Xatırlat" düyməsinə klikləyin
   - Xatırlatma bildirişi göndərilməlidir

5. **Statistikaya baxmaq**
   - Dashboard-da tapşırıq statistikası
   - Tamamlanma faizi
   - Gecikmiş tapşırıqlar sayı

**Gözlənilən Nəticə:** ✅ Tapşırıq monitorinqi real-vaxtda işləyir və statistika düzgündür

---

## 9️⃣ Ümumi Test Nöqtələri

### 9.1 İstifadəçi İcazələri (Permissions)

**Test Addımları:**

1. **Fərqli rollarla test**
   - SuperAdmin hesabı ilə bütün funksiyalara giriş olmalıdır
   - RegionAdmin regional səviyyədə idarəetmə edə bilməlidir
   - SchoolAdmin yalnız öz məktəbinin məlumatlarını görməlidir
   - Müəllim yalnız ona təyin edilmiş resursları görməlidir

2. **İcazəsiz əməliyyat cəhdi**
   - Müəllim hesabı ilə sorğu yaratmağa çalışın
   - Təsdiq: 403 Forbidden və ya düymənin görünməməsi

**Gözlənilən Nəticə:** ✅ RBAC düzgün işləyir və icazəsiz əməliyyatlara yol verilmir

---

### 9.2 Real-vaxt Yeniləmələr

**Test Addımları:**

1. **İki brauzerdə eyni anda giriş**
   - Browser 1: SuperAdmin
   - Browser 2: Müəllim

2. **Bildiriş göndərmək**
   - Browser 1-dən Müəllimə bildiriş göndərin

3. **Yeniləməni yoxlamak**
   - Browser 2-də bildiriş dərhal görünməlidir (səhifə refresh-siz)

**Gözlənilən Nəticə:** ✅ Real-vaxt bildirişlər və yeniləmələr işləyir

---

### 9.3 Fayl Yükləmə Məhdudiyyətləri

**Test Addımları:**

1. **Fayl ölçüsü testi**
   - 15MB fayl yükləməyə çalışın
   - Xəta: "Maksimum 10MB" mesajı görünməlidir

2. **Fayl tipi testi**
   - .exe və ya .zip fayl yükləməyə çalışın
   - Xəta: "İcazəli format deyil" mesajı görünməlidir

3. **İcazəli formatlar**
   - PDF, DOCX, XLSX, PNG, JPG yüklənməlidir

**Gözlənilən Nəticə:** ✅ Fayl validasiyası düzgün işləyir

---

### 9.4 Responsive Dizayn

**Test Addımları:**

1. **Desktop (1920x1080)**
   - Bütün elementlər düzgün yerləşməlidir
   - Sidebar açıq olmalıdır

2. **Tablet (768x1024)**
   - Sidebar collapse olmalıdır
   - Kartlar 2 sütunda olmalıdır

3. **Mobil (375x667)**
   - Hamburger menu görünməlidir
   - Kartlar 1 sütunda olmalıdır
   - Scrolling düzgün işləməlidir

**Gözlənilən Nəticə:** ✅ Sistem bütün cihazlarda düzgün görsənir

---

## 🐛 Problem Hallarının Test Edilməsi

### 10.1 Şəbəkə Xətası Halları

**Test Addımları:**

1. **İnternet kəsmək**
   - Browser DevTools → Network → Offline seçin

2. **Əməliyyat etməyə çalışmaq**
   - Sorğu yaratmağa və ya sənəd yükləməyə çalışın

3. **Xəta mesajı**
   - "İnternet bağlantısı yoxdur" mesajı görünməlidir
   - Retry düyməsi olmalıdır

4. **İnterneti bərpa etmək**
   - Network → Online seçin
   - Retry düyməsinə klikləyin
   - Əməliyyat uğurla tamamlanmalıdır

**Gözlənilən Nəticə:** ✅ Şəbəkə xətaları düzgün idarə olunur

---

### 10.2 Session Timeout

**Test Addımları:**

1. **Giriş etmək**
   - İstənilən hesabla giriş edin

2. **30 dəqiqə passiv qalmaq**
   - Heç bir əməliyyat etməyin

3. **Əməliyyat cəhdi**
   - 30 dəqiqədən sonra düyməyə klikləyin

4. **Yönləndirmə**
   - Avtomatik login səhifəsinə yönləndirilməlisiniz
   - "Session vaxtı bitdi" mesajı görünməlidir

**Gözlənilən Nəticə:** ✅ Session timeout düzgün işləyir və təhlükəsizdir

---

### 10.3 Validation Xətaları

**Test Addımları:**

1. **Boş forma göndərmək**
   - Heç bir sahə doldurmadan "Göndər" klikləyin

2. **Xəta mesajları**
   - Hər məcburi sahənin altında qırmızı xəta mesajı görünməlidir
   - "Bu sahə məcburidir" və s.

3. **Düzgün məlumat daxil etmək**
   - Xətalı sahələri düzəltmək
   - Xəta mesajları yox olmalıdır
   - Forma uğurla göndərilməlidir

**Gözlənilən Nəticə:** ✅ Frontend və backend validasiya sinxrondur

---

## 📊 Test Nəticələrinin Qeydiyyatı

### Test Checklist Forması

Hər funksionallıq üçün aşağıdakı formatda qeyd aparın:

```
📋 Test Tarixi: ___________
👤 Test Edən: ___________

| # | Funksionallıq | Status | Qeydlər |
|---|---------------|--------|---------|
| 1 | Sorğu yaratmaq | ✅/❌ | |
| 2 | Sorğuya cavab vermək | ✅/❌ | |
| 3 | Bildiriş göndərmək | ✅/❌ | |
| 4 | Link təyin etmək | ✅/❌ | |
| 5 | Sənəd yükləmək | ✅/❌ | |
| 6 | Folder yaratmaq | ✅/❌ | |
| 7 | Folderə sənəd əlavə | ✅/❌ | |
| 8 | Təsdiqləmə göndərmək | ✅/❌ | |
| 9 | Təsdiq/Rədd etmək | ✅/❌ | |
| 10 | Excel export | ✅/❌ | |
| 11 | PDF export | ✅/❌ | |
| 12 | Tapşırıq yaratmaq | ✅/❌ | |
| 13 | Tapşırığı icra etmək | ✅/❌ | |
| 14 | Tapşırıq monitorinqi | ✅/❌ | |
| 15 | İcazə yoxlamaları | ✅/❌ | |
| 16 | Real-vaxt yeniləmələr | ✅/❌ | |
| 17 | Fayl yükləmə məhdudiyyətləri | ✅/❌ | |
| 18 | Responsive dizayn | ✅/❌ | |
| 19 | Şəbəkə xətası | ✅/❌ | |
| 20 | Session timeout | ✅/❌ | |
```

---

## 🔍 Bug Raport Formatı

Xəta tapıldıqda aşağıdakı formatda raport hazırlayın:

```markdown
### 🐛 Bug #[Nömrə]

**Başlıq:** [Qısa təsvir]

**Prioritet:** 🔴 Yüksək / 🟠 Orta / 🟢 Aşağı

**Təsvir:** [Detallı təsvir]

**Reproduksiya Addımları:**
1. [Addım 1]
2. [Addım 2]
3. [Addım 3]

**Gözlənilən Nəticə:** [Nə olmalı idi]

**Faktiki Nəticə:** [Nə oldu]

**Ekran Görüntüləri:** [Əlavə et]

**Mühit:**
- Brauzer: [Chrome 120 / Safari 17 / Firefox 121]
- OS: [macOS Sonoma / Windows 11 / Ubuntu 22.04]
- Cihaz: [Desktop / Tablet / Mobile]
- Ekran ölçüsü: [1920x1080]

**Console Xətaları:**
```
[Console log-ları bura yapışdır]
```

**Əlavə Qeydlər:** [Digər məlumatlar]
```

---

## ✅ Uğurlu Test Meyarları

Test prosesi aşağıdakı hallarda uğurlu sayılır:

1. ✅ **Funksionallıq:** Bütün əsas funksiyalar işləyir
2. ✅ **Təhlükəsizlik:** İcazə yoxlamaları düzgündür
3. ✅ **İstifadəçi Təcrübəsi:** İntuitiv və rahat istifadə
4. ✅ **Performans:** Səhifələr 2 saniyədən tez yüklənir
5. ✅ **Responsive:** Bütün cihazlarda düzgün görünür
6. ✅ **Data İntegrity:** Məlumatlar düzgün saxlanır və göstərilir
7. ✅ **Error Handling:** Xətalar düzgün idarə olunur və mesajlar aydındır
8. ✅ **Notifications:** Real-vaxt bildirişlər işləyir

---

## 📞 Dəstək və Əlaqə

Test prosesində problem yaranarsa:

- **Developer Dəstək:** support@atis.az
- **GitHub Issues:** https://github.com/yourrepo/atis/issues
- **Dokumentasiya:** [CLAUDE.md](./CLAUDE.md)

---

**Son Yeniləmə:** 4 Oktyabr 2025
**Versiya:** 1.0
**Hazırlayanlar:** ATİS Development Team
