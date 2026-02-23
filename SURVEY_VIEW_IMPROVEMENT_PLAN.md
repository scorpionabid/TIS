# Plan: "Sorğulara Baxış" (Survey View) Tabının Təkmilləşdirilməsi

Bu plan "Təsdiqləmələr" (Approvals) səhifəsindəki "Sorğulara Baxış" tabının funksionallığının və vizual keyfiyyətinin artırılmasını hədəfləyir. Əsas məqsəd sorğu nəticələrini Excel-ə bənzər dinamik bir cədvəldə, asan oxunur şəkildə təqdim etməkdir.

## 1. Mövcud Vəziyyətin Təhlili

Hazırkı `SurveyViewDashboard` və `SurveyResponsesDataTable` komponentlərində aşağıdakı məhdudiyyətlər var:
-   **Kliyen-tərəfli pagination:** Bütün məlumatlar (maks 100) bir dəfəyə yüklənir və brauzerdə səhifələnir. Minlərlə cavab olduqda bu, performans problemidir.
-   **Mətn formatlama:** Mürəkkəb cavab tipləri (məsələn: `multiple_choice`, `table_input`) `JSON.stringify` ilə göstərilir ki, bu da son istifadəçi üçün oxunmazdır.
-   **Filtrlər:** Yalnız müəssisə adı ilə axtarış var. Statusa və ya digər meyarlara görə filtr yoxdur.
-   **Vizual:** Cədvəl xanaları çox sadədir, xüsusi vizuallaşdırma (məsələn: status rəngləri) yoxdur.

---

## 2. Texniki Təkmilləşdirmə Planı

### Addım 1: Server-tərəfli İdarəetməyə Keçid
-   **Dinamik Loading:** `SurveyViewDashboard`-da `page`, `per_page`, `search` və `sort` state-ləri əlavə ediləcək.
-   **API Integrasiyası:** Hər səhifə dəyişdikdə və ya axtarış edildikdə backend-ə yeni sorğu göndəriləcək. Bu, minlərlə müəssisənin məlumatını sürətli görüntüləməyə imkan verəcək.

### Addım 2: "Ağıllı" Xanalar (Smart Cells)
Hər sual tipinə uyğun xüsusi formatlayıcı (formatter) tətbiq ediləcək:
-   **Seçimli suallar:** ID-lər əvəzinə sualın `options` metadata-sından istifadə edərək etiketi (label) göstərmək.
-   **Dinamik Cədvəl (`table_input`):** Xananın daxilində sıxılmış mətn əvəzinə `[X sətir]` badge-i və hover/popover vasitəsilə kiçik bir önizləmə.
-   **Fayl yükləmə:** Fayl adı və yükləmə (Download) ikonu.
-   **Qiymətləndirmə (Rating):** Rəngli dairə və ya ulduz ikonu ilə göstərim.

### Addım 3: Vizual və UX Təkmilləşdirmələr
-   **Sticky (Sabit) Sütunlar:** Müəssisə adı sütununu sola sabitləyərək, sağa doğru sürüşdürmə zamanı (horizontal scroll) müəssisənin həmişə görünməsini təmin etmək.
-   **Sual Başlıqları:** Uzun sual başlıqları üçün tooltip-lər (başlığın üzərinə gəldikdə tam mətnin görünməsi).
-   **Status Nişanları:** Hər müəssisənin qarşısında cavabın statusu (Təsdiqləndi, Gözləyir, Qaralama) kiçik rəngli indikatorla.

### Addım 4: Analitik Filtrlər
-   Statusa görə filtr (Approved, Submitted, Draft).
-   Region və ya Müəssisə tipinə görə filtr.

### Addım 5: Eksport Funksionallığı
-   "Cari Görünüşü Export Et" düyməsi əlavə etmək. Bu düymə tətbiq edilmiş filtrləri nəzərə alaraq peşəkar Excel faylı yaradacaq.

---

## 3. İcra Ardıcıllığı

1.  **Faza 1 (Data Flow):** `SurveyViewDashboard`-un server-side pagination-a keçirilməsi (Backend artıq bunu dəstəkləyir).
2.  **Faza 2 (Formatting):** `SurveyResponsesDataTable` komponentində `renderCell()` funksiyasının yaradılması və sual tiplərinin formatlanması.
3.  **Faza 3 (UI/UX):** Sticky sütunlar, başlıq tooltipləri və status badge-ləri.
4.  **Faza 4 (Export):** Excel export düyməsinin integrasiyası.

---

## 4. Gözlənilən Fayda

-   **İstifadəçi Təcrübəsi:** İstifadəçi JSON formatında kodlar görmək əvəzinə, "Bəli", "Xeyr" kimi real cavabları görəcək.
-   **Sürət:** Məlumatlar hissə-hissə yükləndiyi üçün interfeys donmayacaq.
-   **Analiz:** Bir baxışda bütün məktəblərin cavablarını yan-yana müqayisə etmək mümkün olacaq.
