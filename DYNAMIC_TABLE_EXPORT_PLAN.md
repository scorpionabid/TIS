# Plan: Dinamik Cədvəl (table_input) Excel Export Təkmilləşdirilməsi

Bu sənəd "Sorğu Nəticələri" (Approvals) səhifəsindəki Excel export funksionallığının, xüsusilə sonuncu əlavə edilmiş **Dinamik Cədvəl** (`table_input`) sual tipi üçün təkmilləşdirilməsi planını əks etdirir.

## 1. Mövcud Vəziyyətin Təhlili

Dinamik cədvəl sualları üçün export hazırda iki şəkildə işləyir:
1.  **Ana vərəq (Main Sheet):** Bütün cavablar bir yerdə göstərilir, dinamik cədvəl məlumatları isə tək bir xanada mətn formatında (`Sətir 1: val1 | val2`) sıxılır.
2.  **Xüsusi vərəqlər (Detail Sheets):** Hər bir `table_input` sualı üçün ayrıca vərəq yaradılır və hər bir sətir ayrı Excel sətri kimi çıxarılır.

### Kritik Problemlər:
-   **Məlumat Tipləri:** Rəqəm və tarixlər Excel-ə mətn kimi düşür, nəticədə riyazi hesablamalar aparmaq mümkün olmur.
-   **Sütun Limitləri:** Hazırda sütun hərfləri `range('D', 'Z')` ilə məhdudlaşır (maksimum 23 sütun).
-   **Boş Cavablar:** Heç bir sətir əlavə etməyən müəssisələr bəzən xüsusi vərəqdə görünmür.
-   **Formatlama:** Excel vərəqlərində filtr, dondurulmuş panellər (freeze panes) və avtomatik ölçüləndirmə yoxdur.

---

## 2. Texniki Təkmilləşdirmə Planı

### Faza 1: Backend (Laravel Excel) Təkmilləşdirilməsi

#### 1.1 `TableInputSheetExport.php` - Məlumat Tiplərinin Düzəldilməsi
-   `collection()` metodunda dəyərləri `type` sütununa uyğun kast (cast) etmək:
    -   `number` -> `(float)` və ya `(int)`
    -   `date` -> Excel-in tanıdığı tarix formatına çevirmək.
-   `WithColumnFormatting` concern-indən istifadə edərək Excel-də sütun formatlarını (Məsələn: `#,#0.00`) təyin etmək.

#### 1.2 `TableInputSheetExport.php` - Sütun İdarəetməsi
-   `range('D', 'Z')` məhdudiyyətini silmək. `PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex()` funksiyasından istifadə etməklə qeyri-məhdud sütun dəstəyi təmin etmək.
-   `TableInputSheetExport` sinfinə `WithAutoFilter` əlavə edərək başlıq sətirlərinə avtomatik filtr qoymaq.

#### 1.3 `SurveyApprovalExport.php` - Ana Vərəq Xülasəsi
-   Dinamik cədvəl məlumatlarını ana vərəqdə `"Sətir 1: ... | Sətir 2: ..."` kimi uzun mətn şəklində saxlamaq əvəzinə, daha qısa xülasə göstərmək:
    -   Nümunə: `"[5 sətir məlumat] — Detallar üçün 'Sual Adı' vərəqinə baxın"`

#### 1.4 `SingleSurveyResponseExport.php` - Təkli Export Təkmilləşdirilməsi
-   Tək bir müəssisənin cavabını export edərkən dinamik cədvəli daha səliqəli (cədvəl daxilində cədvəl effekti) göstərmək üçün `formatTableInputAnswer` metodunu optimallaşdırmaq.

#### 1.5 Excel Rahatlığı (UX)
-   Başlıq sətirlərini dondurmaq (`freezePane('A2')`).
-   Fayl adını daha informativ etmək: `ATİS_Sorğu_[Ad]_[Tarix].xlsx`.

---

### Faza 2: Frontend (React) Təkmilləşdirilməsi

#### 2.1 İxrac Xəbərdarlığı
-   Əgər sorğuda `table_input` sualı varsa, istifadəçiyə export düyməsinə basdıqda "Bu sorğu çox-vərəqli Excel faylı yaradacaq" mesajını göstərmək.

#### 2.2 Yükləmə İndikatoru
-   Böyük məlumat bazalarında (məs: 2000+ məktəb və hərəsində 10 sətir dinamik cədvəl) export uzun çəkə biləcəyi üçün progress bar və ya daha aydın loading statusu.

---

## 3. İcra Ardıcıllığı

1.  **Prioritet 1 (Kritik):** `TableInputSheetExport.php` faylında rəqəm/tarix formatı və sütun hərfləri probleminin həlli.
2.  **Prioritet 2 (Funksional):** `WithAutoFilter` və `freezePane` kimi Excel "qızıl standart"larının tətbiqi.
3.  **Prioritet 3 (Vizual):** Ana vərəqdəki xülasə mətninin sadələşdirilməsi və təkli export-un təkmilləşdirilməsi.
4.  **Prioritet 4 (UX):** Frontend tərəfdə fayl adlandırma və xəbərdarlıqların əlavə edilməsi.

---

## 4. Gözlənilən Nəticə

Təkmilləşdirmədən sonra istifadəçi Excel-i açdıqda:
-   Rəqəm sütunlarını seçib cəm (SUM) hesablaya biləcək.
-   Tarixləri filtr ilə aylara/illərə görə qruplaşdıra biləcək.
-   Minlərlə sətir arasında filtr ilə rahat axtarış edəcək.
-   Faylın hansı sorğuya aid olduğunu adından dərhal anlayacaq.
