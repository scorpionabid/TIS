# PRD-2: Əsas Sistem Funksionallığı

## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### 1. AUTHENTICATION & AUTHORIZATION SYSTEM
**Priority**: Must Have

**Enhanced Features**:
- 6-səviyyəli ierarxik rol sistemi
- Şöbə-əsaslı RegionOperator təyinatı
- Long-term session management (8 saat)
- Multi-device support limitli (3 cihaz maksimum)
- Admin-only password management
- Role-based UI adaptation

**Technical Specifications**:
- Laravel Sanctum authentication
- Spatie Laravel Permission package
- Session timeout: 8 hours
- Failed login attempts: 5 attempt sonra 30 dəqiqə lock
- Password complexity: min 8 xarakter, böyük/kiçik hərf, rəqəm

### 2. HIERARCHICAL MANAGEMENT SYSTEM
**Priority**: Must Have

**Enhanced Structure**:
```
Regional Təhsil İdarəsi
├── Şöbələr (Departments)
│   ├── Maliyyə Şöbəsi (Finance)
│   ├── İnzibati Şöbəsi (Administrative)
│   └── Təsərrüfat Şöbəsi (Economic Affairs)
└── Sektorlar (Sectors - Rayonlar)
    └── Təhsil Müəssisələri
        ├── Məktəbəqədər Təhsil
        ├── İbtidai/Orta Məktəblər
        └── Məktəbdənkənar Təhsil
```

**Dynamic Hierarchy Features**:
- Runtime-da yeni sektor əlavə etmə
- Təhsil müəssisəsi növlərinin dinamik yaradılması
- Cross-departmental access control by SuperAdmin
- Institutional data scope limitation
- Delegation workflow system

### 3. ENHANCED DATA COLLECTION & SURVEY SYSTEM  
**Priority**: Must Have

**Detailed Survey Features**:

**Survey Types & Frequency**:
- **Aylıq Statistik Sorğular**: Şagird sayı, dərs saatları, müəllim statistikası
- **Rüblük Maliyyə Hesabatları**: Büdcə icra, xərclər, investisiyalar
- **İllik Strategik Planlar**: Məqsədlər, KPI-lər, inkişaf planları
- **Gündəlik Təcili Məlumatlar**: Xəbərdarlıq, təcili bildirişlər

**Question Types**:
1. **Text Input**: Açıq cavab sahələri
2. **Number Input**: Rəqəmsal məlumatlar (min/max validation)  
3. **Date Picker**: Tarix seçimi (calendar widget)
4. **Single Choice**: Radio button seçimlər
5. **Multiple Choice**: Checkbox seçimlər
6. **File Upload**: PDF, Excel (max 10MB)
7. **Rating Scale**: 1-10 qiymətləndirmə sistemi
8. **Table/Matrix**: Strukturlaşdırılmış cədvəl məlumatları

**Survey Management**:
- **Survey Limitation**: Hər sorğuda maksimum 2-3 sual
- **Template System**: Təkrarlanan sorğular üçün şablonlar
- **Target Audience Selection**: Sektor, müəssisə və ya fərdi seçim
- **Approval Workflow**: SchoolAdmin → SektorAdmin → RegionAdmin
- **Auto-Archive**: Məlumat toplandıqdan sonra avtomatik arxivləşdirmə

### 4. TASK MANAGEMENT SYSTEM
**Priority**: Should Have

**Enhanced Task Features**:
- **Task Creation Authority**: RegionAdmin və SektorAdmin-lər yarada bilər
- **Task Categories**: 
  - Hesabat hazırlama
  - Təmir və təsərrüfat işləri
  - Tədbir təşkili və koordinasiya
  - Audit və nəzarət tapşırıqları
  - Təlimat və metodiki materialların paylaşılması
- **Priority Levels**: Aşağı, Orta, Yüksək, Təcili
- **Progress Tracking**: 0-100% tamamlanma göstəricisi
- **Deadline Management**: Avtomatik xatırlatma sistemi
- **File Attachment**: Tapşırıqla əlaqəli sənədlər

### 5. DOCUMENT MANAGEMENT & FILE SHARING
**Priority**: Should Have

**Enhanced Document Features**:
- **File Types**: PDF, Excel, Word (JPG minimal hallarda)
- **File Size Limits**: 
  - Tək fayl: 10MB maksimum
  - İstifadəçi başına aylıq: 100MB limit
- **Access Control**: 
  - Public (hamı görə bilər)
  - Regional (region daxilində)
  - Sectoral (sektor daxilində)  
  - Institution (müəssisə daxilində)
- **Link Sharing**: Müddətli link yaratma (7-30 gün)
- **Version Control**: Sənəd versiyalarının saxlanması
- **Download Tracking**: Kim, nə vaxt endirdi məlumatı

### 6. REAL-TIME NOTIFICATION SYSTEM
**Priority**: Must Have

**Notification Triggers**:
- **Yeni Sorğu**: Target audience-ə avtomatik bildiriş
- **Deadline Warning**: 3 gün qalmış xatırlatma
- **Approval Status**: Cavab təsdiqləndi/rədd edildi bildirişi  
- **New Task Assignment**: Yeni tapşırıq təyinatı
- **System Alerts**: Texniki xəbərdarlıqlar

**Notification Channels**:
- **In-App**: Real-time browser bildirişləri
- **Email**: Gmail SMTP vasitəsilə
- **SMS**: Local provider (yalnız kritik hallarda)

**Multilingual Support**:
- Default: Azərbaycan dili
- Optional: Rus dili, İngilis dili
- İstifadəçi profil səhifəsindən seçim
