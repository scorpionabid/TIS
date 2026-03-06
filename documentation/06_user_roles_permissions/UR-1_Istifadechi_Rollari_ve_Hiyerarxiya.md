# UR-1: İstifadəçi Rolları və Hiyerarxiya
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.1
**Created**: İyul 2025
**Category**: İstifadəçi Rolları və İcazələr
**Owner**: Təhlükəsizlik və Giriş Nəzarəti Komandası

---

## 1. ÜMUMI MƏLUMAT

Bu sənəd ATİS sistemində mövcud olan istifadəçi rollarını, onların hiyerarxik strukturunu və əsas məsuliyyətlərini təsvir edir. İstifadəçi rolları sistemin bütün səviyyələrində təhlükəsizliyi və məlumat giriş nəzarətini təmin etmək üçün əsas vasitədir.

## 2. ROL HİYERARXİYASI VƏ SƏVİYYƏLƏRİ

### 2.1. Hiyerarxik Struktur

```
Level 1: SuperAdmin (Sistem Administratoru)
├── Level 2: RegionAdmin (Regional İdarəetmə Rəhbəri)
│   ├── Level 3: RegionOperator (Regional Əməliyyat Specialisti)
│   └── Level 4: SektorAdmin (Sektor Rəhbəri)
│       └── Level 5: MəktəbAdmin (Təhsil Müəssisəsi Rəhbəri)
│           └── Level 6: Müəllim (Təhsil İşçisi)
```

### 2.2. Rolların Əsas Xüsusiyyətləri

| Rol | Səviyyə | Data Scope | İdarəetmə Hüquqları | İstifadəçi Yaratma Hüquqları |
|-----|---------|------------|---------------------|-----------------------------|
| SuperAdmin | 1 | Global | Tam | Bütün rollar |
| RegionAdmin | 2 | Regional | Regional | RegionOperator, SektorAdmin, MəktəbAdmin, Müəllim |
| RegionOperator | 3 | Regional | Məhdud | Yoxdur |
| SektorAdmin | 4 | Sektor | Sektor | MəktəbAdmin, Müəllim |
| MəktəbAdmin | 5 | Məktəb | Məktəb | Müəllim |
| Müəllim | 6 | Şəxsi | Yoxdur | Yoxdur |

## 3. ROL TƏSVİRLƏRİ

### 3.1 SuperAdmin (Level 1)
**Sistem Administratoru**

#### Ümumi Təsvir:
- Sistemin tam nəzarətini həyata keçirir
- Bütün məlumatlara və funksionallığa giriş hüququ vardır
- Digər bütün rolları yarada və idarə edə bilər
- Sistem konfiqurasiyasını dəyişə bilər
- Audit qeydlərini və təhlükəsizlik jurnallarını izləyə bilər

#### Data Access Scope:
```
✓ Bütün istifadəçi məlumatları
✓ Bütün regionlar, sektorlar və məktəblər
✓ Sistem konfiqurasiyası və parametrləri
✓ Təhlükəsizlik qeydləri və audit jurnalları
✓ Bütün modul və funksiyalara əlçatım
✓ İnteqrasiya və API idarəetməsi
```

#### Əsas Vəzifələr:
- Sistem təhlükəsizliyini təmin etmək
- Yeni regionlar və istifadəçilər yaratmaq
- Sistem monitorinqi və performans analizi
- Kritik sistem yeniləmələrini təsdiq etmək
- İstifadəçi səlahiyyətlərini idarə etmək
- Fövqəladə hallarda sistemə müdaxilə etmək

### 3.2 RegionAdmin (Level 2)
**Regional İdarəetmə Rəhbəri**

#### Ümumi Təsvir:
- Regional səviyyədə sistem idarəetməsi
- Öz regionuna aid bütün məlumatları görə bilər
- RegionOperator və SektorAdmin təyin edə bilər
- Regional tapşırıqları və sorğuları idarə edir
- Regional hesabatları yaradır və izləyir

#### Data Access Scope:
```
✓ Regional istifadəçi məlumatları
✓ Regional məktəblər və sektorlar
✓ Regional tapşırıqlar və sorğular
✓ Regional sənəd idarəetməsi
✓ Regional statistika və hesabatlar
❌ Digər region məlumatları
❌ Sistem səviyyəli konfiqurasiya
```

#### Əsas Vəzifələr:
- Regional performans monitorinqi
- Regional istifadəçi hesablarının idarəedilməsi
- Sektorların fəaliyyətinin koordinasiyası
- Regional səviyyədə tapşırıqların təyini
- Regional hesabatların hazırlanması
- Regional səviyyədə resursların təyin edilməsi
