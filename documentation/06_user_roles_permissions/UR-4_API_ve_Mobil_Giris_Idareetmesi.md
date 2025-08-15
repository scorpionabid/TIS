# UR-4: API və Mobil Giriş İdarəetməsi
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.1
**Created**: İyul 2025
**Category**: İstifadəçi Rolları və İcazələr
**Owner**: Təhlükəsizlik və Giriş Nəzarəti Komandası

---

## 1. ÜMUMI MƏLUMAT

Bu sənəd ATİS sisteminə API və mobil tətbiqlər vasitəsilə girişin idarə edilməsi üçün təhlükəsizlik qaydalarını, istifadəçi rollarının əlçatım imkanlarını və səlahiyyət mexanizmlərini təsvir edir.

## 2. API GİRİŞ NƏZARƏTİ

### 2.1. API Autentifikasiya və Avtorizasiya

| Metod | Təsvir | 
|-------|-------|
| **OAuth2.0** | API-yə giriş üçün əsas autentifikasiya protokolu |
| **API Token** | Təşkilatlar və inteqrasiya üçün uzunmüddətli API açarları |
| **JWT** | JSON Web Tokens vasitəsilə avtorizasiya |
| **Skop-əsaslı Giriş** | API funksiyalarının spesifik skoplara ayrılması |

### 2.2. API Rolu Əlçatım Matrisi

| API Skopu | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-----------|------------|-------------|----------------|-------------|-------------|---------|
| **system:admin** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **system:config** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **users:manage** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **reports:all** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **reports:regional** | ✓ | ✓ | ✓ | ❌ | ❌ | ❌ |
| **reports:sector** | ✓ | ✓ | ✓ | ✓ | ❌ | ❌ |
| **reports:school** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |
| **reports:personal** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **tasks:manage** | ✓ | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **tasks:view** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **surveys:manage** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **surveys:respond** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **documents:manage** | ✓ | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **documents:view** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **notifications:send** | ✓ | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **schools:manage** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ Own | ❌ |
| **schools:view** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ School |
| **analytics:full** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **analytics:limited** | ✓ | ✓ | ✓ | ✓ | ✓ | ❌ |

### 2.3. API İşləmləri Məhdudiyyətləri

| API Əməliyyat Tipi | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|--------------------|------------|-------------|----------------|-------------|-------------|---------|
| **GET** (system level) | ✓ | ✓ Limited | ✓ Limited | ✓ Limited | ✓ Limited | ✓ Limited |
| **POST** (system level) | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PUT** (system level) | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **DELETE** (system level) | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GET** (regional) | ✓ | ✓ Own | ✓ Own | ❌ | ❌ | ❌ |
| **POST** (regional) | ✓ | ✓ Own | ❌ | ❌ | ❌ | ❌ |
| **PUT** (regional) | ✓ | ✓ Own | ❌ | ❌ | ❌ | ❌ |
| **DELETE** (regional) | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GET** (sector) | ✓ | ✓ | ✓ | ✓ Own | ❌ | ❌ |
| **POST** (sector) | ✓ | ✓ | ❌ | ✓ Own | ❌ | ❌ |
| **PUT** (sector) | ✓ | ✓ | ❌ | ✓ Own | ❌ | ❌ |
| **DELETE** (sector) | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **GET** (school) | ✓ | ✓ | ✓ | ✓ | ✓ Own | ✓ Own |
| **POST** (school) | ✓ | ✓ | ✓ | ✓ | ✓ Own | ❌ |
| **PUT** (school) | ✓ | ✓ | ❌ | ✓ | ✓ Own | ❌ |
| **DELETE** (school) | ✓ | ✓ | ❌ | ✓ | ❌ | ❌ |

## 3. MOBİL TƏTBİQ GİRİŞ NƏZARƏTİ

### 3.1. Mobil Tətbiq Funksionallıq Matrisi

| Mobil Funksionallıq | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|--------------------|------------|-------------|----------------|-------------|-------------|---------|
| **Dashboard** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Task Management** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Surveys** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Document Access** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **User Management** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **System Admin** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Reporting** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Offline Access** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Push Notifications** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **File Upload** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Calendar View** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Quick Actions** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 3.2. Mobil Tətbiq Spesifik İcazələr

| Mobil İcazə | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|------------|------------|-------------|----------------|-------------|-------------|---------|
| **Send Push to All** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Send Regional Push** | ✓ | ✓ | ❌ | ❌ | ❌ | ❌ |
| **Send Sector Push** | ✓ | ✓ | ❌ | ✓ | ❌ | ❌ |
| **Send School Push** | ✓ | ✓ | ❌ | ✓ | ✓ | ❌ |
| **Upload Media Files** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Offline Database** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Location Services** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Camera Access** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Contacts Access** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Calendar Access** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 4. TƏHLÜKƏSİZLİK VƏ MONİTORİNQ

### 4.1. API və Mobil Monitoring İcazələri

| Monitoring Funksiyası | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|----------------------|------------|-------------|----------------|-------------|-------------|---------|
| **View API Logs** | ✓ Tam | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **View Login History** | ✓ Tam | ✓ Regional | ✓ Limited | ✓ Sector | ✓ School | ✓ Personal |
| **View Error Logs** | ✓ Tam | ✓ Limited | ❌ | ❌ | ❌ | ❌ |
| **View API Usage Statistics** | ✓ Tam | ✓ Regional | ❌ | ✓ Limited | ❌ | ❌ |
| **Security Alerts** | ✓ Tam | ✓ Regional | ❌ | ✓ Limited | ❌ | ❌ |
| **Rate Limit Dashboard** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Login Attempt Monitoring** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Device Management** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ✓ Personal |

### 4.2. API və Mobil Təhlükəsizlik İdarəetməsi

| Təhlükəsizlik Funksiyası | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-------------------------|------------|-------------|----------------|-------------|-------------|---------|
| **Create API Keys** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Revoke API Keys** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Set Rate Limits** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Block IP Addresses** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Force Logout Users** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Reset 2FA** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Remote Device Wipe** | ✓ | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **Configure Session Timeout** | ✓ | ✓ Limited | ❌ | ❌ | ❌ | ❌ |

## 5. İNTEQRASİYA VƏ WEBHOOKs

### 5.1. Webhook və İnteqrasiyalar İdarəetməsi

| İnteqrasiya Funksiyası | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|-----------------------|------------|-------------|----------------|-------------|-------------|---------|
| **Create Webhook** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Edit Webhook** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Delete Webhook** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Configure Integrations** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **View Webhook Logs** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Manage OAuth Apps** | ✓ | ✓ Regional | ❌ | ❌ | ❌ | ❌ |
| **Set Callback URLs** | ✓ | ✓ Regional | ❌ | ✓ Sector | ❌ | ❌ |
| **Configure API Scopes** | ✓ | ✓ Limited | ❌ | ❌ | ❌ | ❌ |

### 5.2. Webhook və İnteqrasiya Hadisələri

| Webhook Hadisə | SuperAdmin | RegionAdmin | RegionOperator | SektorAdmin | MəktəbAdmin | Müəllim |
|--------------|------------|-------------|----------------|-------------|-------------|---------|
| **system.config** | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **user.created** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **user.updated** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **user.deleted** | ✓ Tam | ✓ Regional | ❌ | ✓ Sector | ✓ School | ❌ |
| **task.created** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **task.updated** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **task.completed** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **survey.published** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **survey.submitted** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **document.uploaded** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
| **school.created** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ❌ | ❌ |
| **school.updated** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ❌ |
| **report.generated** | ✓ Tam | ✓ Regional | ✓ Regional | ✓ Sector | ✓ School | ✓ Personal |
