# UR-5: İnteqrasiya və Hesabat Səlahiyyətləri
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.1
**Created**: İyul 2025
**Category**: İstifadəçi Rolları və İcazələr
**Owner**: Təhlükəsizlik və Giriş Nəzarəti Komandası

---

## 1. ÜMUMI MƏLUMAT

Bu sənəd ATİS sisteminin xarici sistemlərlə inteqrasiyası, hesabatların hazırlanması və analitika modullarına əlçatım səlahiyyətlərini, habelə rolların nümayəndəlik (delegation) qaydalarını təsvir edir.

## 2. İNTEQRASİYA SƏLAHİYYƏTLƏRİ

### 2.1. Xarici Sistem İnteqrasiyaları

| İnteqrasiya Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|------------------|------------|-------------|----------------|-------------|-------------|---------|
| **MFTİS İnteqrasiyası** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ✓ Məhdud | ❌ |
| **DVX Portalı** | ✓ Tam | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Elektron Hökümət** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ❌ | ❌ |
| **Elektron İmza** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |
| **SMS Gateway** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |
| **E-mail Gateway** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ödəniş Sistemləri** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **LMS İnteqrasiyası** | ✓ | ✓ Regional | ❌ | ✓ Sektor | ✓ Məktəb | ❌ |

### 2.2. İnteqrasiya Parametrləri Konfiqurasiyası

| İnteqrasiya Parametri | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-----------------------|------------|-------------|----------------|-------------|-------------|---------|
| **API Endpoint URLləri** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Auth Konfiqurasiyası** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Data Mapping** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Sinxronizasiya Parametrləri** | ✓ | ✓ Regional | ❌ | ✓ Sektor | ❌ | ❌ |
| **Webhook Konfiqurasiyaları** | ✓ | ✓ Regional | ❌ | ✓ Sektor | ❌ | ❌ |
| **Error Handling** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |

## 3. HESABAT SƏLAHİYYƏTLƏRİ

### 3.1. Hesabat Hazırlama

| Hesabat Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|--------------|------------|-------------|----------------|-------------|-------------|---------|
| **Sistem Monitorinq** | ✓ Tam | ✓ Məhdud | ❌ | ❌ | ❌ | ❌ |
| **Audit Jurnalları** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ✓ Məktəb | ❌ |
| **İstifadəçi Aktivliyi** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Regional Performans** | ✓ Tam | ✓ Regional | ✓ Regional | ❌ | ❌ | ❌ |
| **Sektor Müqayisəsi** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ❌ | ❌ |
| **Məktəb Müqayisəsi** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ❌ |
| **Tapşırıq Tamamlanma** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Sorğu Analitikası** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Dashboard Statistikaları** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **İstifadəçi Demoqrafiyası** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ✓ Məktəb | ❌ |
| **Sistem İstifadə Metrikalari** | ✓ Tam | ✓ Regional | ❌ | ✓ Məhdud | ✓ Məhdud | ❌ |

### 3.2. Hesabat Paylaşma və Export

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Hesabat Planlaşdırma** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ❌ |
| **Email Göndərmə** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **PDF Export** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Excel Export** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **CSV Export** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **API Hesabat Çıxışı** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ❌ | ❌ |
| **Dashboard Paylaşma** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Dərin Link Paylaşma** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 4. ANALİTİKA SƏLAHİYYƏTLƏRİ

### 4.1. Analitika Funksionallığı

| Analitik Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-------------------|------------|-------------|----------------|-------------|-------------|---------|
| **Fərdi Dashboard Yaratma** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Xüsusi Sorğu Yaratma** | ✓ Tam | ✓ Regional | ✓ Məhdud | ✓ Sektor | ✓ Məktəb | ❌ |
| **Data Mining** | ✓ Tam | ✓ Məhdud | ❌ | ❌ | ❌ | ❌ |
| **Trend Analizi** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ❌ |
| **Proqnozlaşdırma** | ✓ Tam | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Müqayisəli Analiz** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ❌ |
| **İstifadəçi Davranışı Analizi** | ✓ Tam | ✓ Regional | ❌ | ✓ Sektor | ✓ Məktəb | ❌ |
| **Performans KPIs** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |

### 4.2. Vizualizasiya və Dashboard

| Vizualizasiya Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|--------------------|------------|-------------|----------------|-------------|-------------|---------|
| **İnteraktiv Diaqramlar** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Real-vaxt Monitorinqi** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Coğrafi Xəritələr** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ❌ |
| **Qarşılıqlı Filtrlər** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sektor | ✓ Məktəb | ✓ Şəxsi |
| **Şəxsi Dashboard** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Export Funksiyaları** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 5. NÜMAYƏNDƏLİK (DELEGATION) QAYDALARI

### 5.1. Səlahiyyətlərin Ötürülməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Tam Səlahiyyət Ötürülməsi** | ✓ | ✓ | ❌ | ✓ | ✓ | ❌ |
| **Müvəqqəti Səlahiyyət** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Məhdud Səlahiyyət Ötürülməsi** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Nümayəndəlik Tarixçəsi** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Səlahiyyət Geri Alma** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 5.2. Səlahiyyət Ötürmə Məhdudiyyətləri

| Ötürmə Qaydaları | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-----------------|------------|-------------|----------------|-------------|-------------|---------|
| **Yuxarı Səviyyəyə Ötürə Bilməz** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Maksimum Ötürmə Müddəti** | 90 gün | 60 gün | 30 gün | 30 gün | 30 gün | 15 gün |
| **Eyni Vaxtda Maksimum Ötürmə** | Limitsiz | 3 | 1 | 2 | 2 | 1 |
| **Ötürülə Bilməyən Səlahiyyətlər** | Yoxdur | Sistem Konfig. | Çoxu | İstifadəçi Yaratma | İstifadəçi Yaratma | Çoxu |

## 6. MƏKTƏBİÇİ ROLLAR VƏ DƏLEGASİYA

### 6.1. Məktəb Daxili Rol Hiyerarxiyası

```
MəktəbAdmin (Məktəb Direktoru)
├── MüavinTədris (Tədris üzrə direktor müavini)
├── MüavinTərbiyə (Tərbiyə işləri üzrə direktor müavini)
├── MüavinTəsərrüfat (Təsərrüfat işləri üzrə direktor müavini)
├── DərsHissəMüdiri (Dərs hissəsi müdiri)
├── MetodBirləşməRəhbəri (Metodik birləşmə rəhbəri)
├── SinifRəhbəri (Sinif rəhbəri)
└── Müəllim (Fənn müəllimi)
```

### 6.2. Məktəb Daxili Rol Səlahiyyətləri

| Funksiya | MəktəbAdmin | MüavinTədris | MüavinTərbiyə | MüavinTəsərrüfat | DərsHissəMüdiri | MetodBirləşməRəhbəri | SinifRəhbəri | Müəllim |
|----------|------------|-------------|--------------|-----------------|----------------|---------------------|-------------|----------|
| **Dərs Cədvəli** | ✓ | ✓ | ❌ | ❌ | ✓ | ❌ | ✓ Baxış | ✓ Baxış |
| **Müəllim Dərs Yükü** | ✓ | ✓ | ❌ | ❌ | ✓ | ✓ Baxış | ❌ | ✓ Şəxsi |
| **Qiymətləndirmə** | ✓ | ✓ | ❌ | ❌ | ✓ | ✓ Fənn | ✓ Sinif | ✓ Fənn |
| **Davamiyyət** | ✓ | ✓ | ✓ | ❌ | ✓ | ❌ | ✓ Sinif | ✓ Dərs |
| **Tədbirlər** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Fənn | ✓ Sinif | ✓ Fənn |
| **Resurslar** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Fənn | ✓ Sinif | ✓ Fənn |
| **Tapşırıqlar** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Fənn | ✓ Sinif | ✓ Fənn |
| **Hesabatlar** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Fənn | ✓ Sinif | ✓ Fənn |
| **Valideyn Əlaqələri** | ✓ | ✓ | ✓ | ❌ | ✓ | ❌ | ✓ Sinif | ✓ Fənn |

## 7. TƏHLÜKƏSİZLİK VƏ UYĞUNLUQ TƏLƏBLƏRİ

### 7.1. ATİS Təhlükəsizlik Protokolları

- **Minimal Səlahiyyət Prinsipi**: Hər rol yalnız vəzifəsi üçün minimum lazımi səlahiyyətlərə malik olmalıdır
- **Səlahiyyətlərin Ayrılması**: Kritik funksiyalar müxtəlif rollar arasında bölünməlidir
- **Log və Audit**: Bütün kritik əməliyyatlar jurnallaşdırılmalıdır
- **Məlumat Təsnifatı**: Bütün məlumatlar həssaslıq səviyyələrinə görə təsnif edilməlidir
- **Şəxsi Məlumatların Qorunması**: Fərdi məlumatlar Azərbaycan Respublikasının qanunvericiliyinə uyğun qorunmalıdır

### 7.2. Uyğunluq Tələbləri

| Tələb | Tətbiq Qaydası |
|------|---------------|
| **Təhsil Nazirliyinin Təhlükəsizlik Standartları** | Bütün dəyişikliklər müvafiq səlahiyyətlərlə təsdiq edilməlidir |
| **Fərdi Məlumatların Qorunması Haqqında Qanun** | Şəxsi məlumatlar yalnız müvafiq icazələrlə əlçatan olmalıdır |
| **Audit İzləmə Tələbləri** | Məlumat dəyişikliyi edən istifadəçi, tarix və əməliyyat qeydə alınmalıdır |
| **Hesabatlılıq Tələbləri** | Səlahiyyət verilmiş istifadəçilərin fəaliyyətləri davamlı monitorinq edilməlidir |

### 7.3. İmplementasiya Yoxlama Siyahısı

- [ ] Bütün rollara aid səlahiyyətlər sistemdə konfiqurasiya edilib
- [ ] Minimal səlahiyyət prinsipi bütün rollarda tətbiq edilib
- [ ] Role əsaslanan interfeys elementləri UI-da düzgün görüntülənir
- [ ] Məlumat filtrləmə səlahiyyətlərdən asılı olaraq düzgün işləyir
- [ ] API endpoint-lər rol-əsaslı təhlükəsizlik yoxlamaları tətbiq edir
- [ ] Audit jurnalları bütün vacib əməliyyatları qeydə alır
- [ ] Təhlükəsizlik testləri keçirilib və sənədləşdirilib
- [ ] İstifadəçilər üçün rol və səlahiyyət təlimatları hazırlanıb
