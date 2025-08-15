# UR-3: Funksional Giriş Nəzarəti
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.1
**Created**: İyul 2025
**Category**: İstifadəçi Rolları və İcazələr
**Owner**: Təhlükəsizlik və Giriş Nəzarəti Komandası

---

## 1. ÜMUMI MƏLUMAT

Bu sənəd ATİS sistemində tətbiq olunan funksional giriş nəzarəti və Feature Access Control (FAC) mexanizmlərini təsvir edir. Burada müxtəlif istifadəçi rollarının sistem komponentlərinə və funksiyalarına giriş icazələri ətraflı şəkildə göstərilir.

## 2. FUNKSİONAL GİRİŞ NƏZARƏTİ PRİNSİPLƏRİ

### 2.1. Nəzarət Səviyyələri

1. **Component-Level Control**: İstifadəçi interfeysi komponentlərinin görünürlüyü və əlçatanlığı
2. **Action-Level Control**: Sistemdə hər hansı bir əməliyyatın yerinə yetirilmə icazəsi
3. **Data-Level Control**: Məlumatlara əlçatım və filterlənmə
4. **Field-Level Control**: Xüsusi məlumat sahələrinə və attributlara əlçatım

### 2.2. Tətbiq Metodologiyası

- **Declarative Access Control**: Rollar və səlahiyyətlər konfiqurasiya fayllarında təyin edilir
- **Programmatic Enforcement**: Hər API nöqtəsində icazə yoxlanışları tətbiq olunur
- **UI Component Rendering**: İstifadəçi interfeysi rol-əsaslı olaraq dinamik şəkildə formalaşdırılır
- **Data Filtering**: Sorğular avtomatik olaraq rolun data scope-una uyğun filterlənir

## 3. SURVEY VƏ SORĞU SİSTEMİ İCAZƏLƏRİ

### 3.1. Survey İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Survey Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Edit Survey Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Delete Survey Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **View Survey Templates** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Assign Survey** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Complete Survey** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View Survey Results** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Export Survey Data** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Analytics & Reports** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

### 3.2. Form İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Form** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Edit Form** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Delete Form** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Publish Form** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Submit Form Response** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View Form Responses** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Export Form Data** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

## 4. TAPŞIRIQ İDARƏETMƏ SİSTEMİ İCAZƏLƏRİ

### 4.1. Tapşırıqların İdarə Edilməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Task** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Edit Task** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Delete Task** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Assign Task** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Complete Task** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Add Task Comment** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View Task History** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Task Statistics** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

### 4.2. Tapşırıq Şablonları

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Task Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Edit Task Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Delete Task Template** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Use Task Template** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

## 5. SƏNƏD İDARƏETMƏ SİSTEMİ İCAZƏLƏRİ

### 5.1. Sənədlərin İdarə Edilməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Upload Document** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Edit Document Properties** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Delete Document** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **View Documents** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Assigned |
| **Share Document** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Comment on Document** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Version Control** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 5.2. Sənəd Kategoriyaları və Təşkilatlanması

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Folder** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Manage Folder Structure** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Create Document Categories** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Set Document Permissions** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Document Templates** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |

## 6. BİLDİRİŞ SİSTEMİ İCAZƏLƏRİ

### 6.1. Bildiriş İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create System Announcement** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Send Notification** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Configure Notification Rules** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ✓ Personal |
| **View Notification History** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Create Email Templates** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Send Bulk Notifications** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |

### 6.2. Bildirişlərin Alınması

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Receive System Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Receive Task Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Receive Document Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Manage Notification Preferences** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Mark Notifications as Read** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Filter Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 7. MƏKTƏB İDARƏETMƏ MODULU İCAZƏLƏRİ

### 7.1. Akademik Struktur İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Manage Academic Years** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Terms** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Subjects** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Grades/Classes** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Rooms** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |

### 7.2. Dərs Cədvəli və Yük İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Manage Bell Schedules** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Create Class Schedules** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Assign Teaching Loads** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Manage Teacher Substitutions** | ✓ Global | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **View Schedules** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
