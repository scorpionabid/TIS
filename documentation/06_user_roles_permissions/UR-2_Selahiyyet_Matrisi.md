# UR-2: Səlahiyyət Matrisi
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.1
**Created**: İyul 2025
**Category**: İstifadəçi Rolları və İcazələr
**Owner**: Təhlükəsizlik və Giriş Nəzarəti Komandası

---

## 1. ÜMUMI MƏLUMAT

Bu sənəd ATİS sistemindəki müxtəlif rolların əsas sistem funksiyalarına çıxış səlahiyyətlərini və icazələrini detallı şəkildə təsvir edir. Hər bir rolun nələri görə və idarə edə biləcəyini aydın şəkildə müəyyən edir.

## 2. İSTİFADƏÇİ İDARƏETMƏSİ MATRİSİ

### 2.1. İstifadəçi Hesablarının İdarə Edilməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create SuperAdmin** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create RegionAdmin** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create RegionOperator** | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **Create SektorAdmin** | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **Create MəktəbAdmin** | ✓ | ✓ | ❌ | ✓ | ❌ | ❌ |
| **Create Müəllim** | ✓ | ✓ | ❌ | ✓ | ✓ | ❌ |
| **Edit Users (Own Level)** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Delete Users** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **View User List** | ✓ All | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Reset Passwords** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Assign Permissions** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Bulk User Import** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |

### 2.2. Hesab və Profil İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **View Own Profile** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Edit Own Profile** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Change Own Password** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View Activity History** | ✓ All | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **2FA Management** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **API Key Management** | ✓ | ✓ | ❌ | ✓ | ❌ | ❌ |
| **Session Management** | ✓ All | ✓ Regional | ❌ | ✓ Sector | ✓ School | ✓ Personal |

## 3. SYSTEM MANAGEMENT MATRİSİ

### 3.1. Konfiqurasiya və Sistem İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **System Settings** | ✓ All | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Email Templates** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Notification Rules** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Integration Management** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Data Import/Export** | ✓ All | ✓ Regional | ✓ Limited | ✓ Sector | ✓ School | ✓ Personal |
| **System Backup** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Maintenance Mode** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Error Logs** | ✓ | ✓ Limited | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✓ All | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |

### 3.2. Regional və Məktəb Strukturu İdarəetməsi

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Region** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Edit Region** | ✓ | ✓ Own | ❌ | ❌ | ❌ | ❌ |
| **Create Sector** | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **Edit Sector** | ✓ | ✓ | ❌ | ✓ Own | ❌ | ❌ |
| **Create School** | ✓ | ✓ | ❌ | ✓ | ❌ | ❌ |
| **Edit School** | ✓ | ✓ | ❌ | ✓ | ✓ Own | ❌ |
| **View Structure Tree** | ✓ All | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

## 4. DASHBOARD VƏ ANALİTİKA MATRİSİ

### 4.1. Dashboard Görünüşləri və Statistikalar

| Funksiya | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|---------|------------|-------------|----------------|-------------|-------------|---------|
| **Global Statistics** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Regional Statistics** | ✓ | ✓ | ✓ | ❌ | ❌ | ❌ |
| **Sector Statistics** | ✓ | ✓ | ✓ | ✓ | ❌ | ❌ |
| **School Statistics** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |
| **Personal Statistics** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **System Health Monitor** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Real-time Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Activity Timeline** | ✓ All | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |

### 4.2. Hesabat Görünüşləri

| Hesabat Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-------------|------------|-------------|----------------|-------------|-------------|----------|
| **User Activity Reports** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **System Performance** | ✓ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Security Audit** | ✓ Full | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Survey Analytics** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Institution Performance** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **Comparative Analysis** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ❌ | ❌ |
| **Task Completion** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Document Usage** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Response Rates** | ✓ Global | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |

## 5. MƏLUMAT GİRİŞ SƏVİYYƏSİ MATRİSİ

### 5.1. Məlumat Filterlənməsi

| Məlumat Səviyyəsi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|------------------|------------|-------------|----------------|-------------|-------------|---------|
| **System-Level Data** | ✓ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cross-Regional Data** | ✓ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Regional Data** | ✓ Full | ✓ Own | ✓ Own | ❌ | ❌ | ❌ |
| **Cross-Sector Data** | ✓ Full | ✓ Regional | ✓ Regional | ❌ | ❌ | ❌ |
| **Sector Data** | ✓ Full | ✓ Regional | ✓ Regional | ✓ Own | ❌ | ❌ |
| **Cross-School Data** | ✓ Full | ✓ Regional | ✓ Regional | ✓ Sector | ❌ | ❌ |
| **School Data** | ✓ Full | ✓ Regional | ✓ Regional | ✓ Sector | ✓ Own | ❌ |
| **Personal Data** | ✓ Full | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Own |

### 5.2. Məlumat Eksportu Məhdudiyyətləri

| Export Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-------------|------------|-------------|----------------|-------------|-------------|---------|
| **Full Database Export** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Regional Data Export** | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **Sector Data Export** | ✓ | ✓ | ✓ | ✓ | ❌ | ❌ |
| **School Data Export** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |
| **Personal Data Export** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Anonymized Analytics** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
