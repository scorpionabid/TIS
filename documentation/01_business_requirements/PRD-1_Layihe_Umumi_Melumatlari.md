# PRD-1: Layihə Ümumi Məlumatları

## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### PROJECT OVERVIEW

**Project Name**: Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)
**Version**: 2.0 Enhanced
**Target Release**: Q2 2025
**Document Owner**: Development Team Lead
**Last Updated**: January 2025

### 1. EXECUTIVE SUMMARY

**Vision Statement**: 
Azərbaycan regional təhsil idarələrinin tam rəqəmsal transformasiyası üçün vahid, ierarxik idarəetmə platforması yaratmaq. Sistem regional təhsil idarələri və onlara tabe 700+ təhsil müəssisəsini əhatə edərək, məlumat toplama, təhlil və qərar qəbuletmə proseslərini avtomatlaşdıracaq.

**Problem Statement**:
- Regional təhsil idarələrində məlumat toplanması manual və vaxt aparır
- Region-sektor-müəssisə səviyyələrində koordinasiya çatışmazlığı  
- Sənəd dövriyyəsi və sorğu prosesləri effektiv deyil
- Rol-əsaslı səlahiyyət sistemi və ierarxik nəzarət yoxdur
- Məlumat toplanması və hesabat hazırlama prosesləri standartlaşdırılmayıb

**Success Metrics**:
- 700+ təhsil müəssisəsinin sistemi aktiv istifadəsi (100% adoption rate)
- Məlumat toplama vaxtının 80% azaldılması (3 gündən 1 günə)
- Sorğu cavab müddətinin 70% qısaldılması
- İstifadəçi məmnunluğu 90%+
- Sistema daxil olma və işləmə sürətinin 90% yaxşılaşması

### 2. TARGET AUDIENCE & USER PERSONAS

#### 2.1 Detailed User Roles & Quantities

**Hierarchy Structure:**
```
SuperAdmin (1-2 users)
└── RegionAdmin (1 per region - 10+ regions)
    ├── RegionOperator (6-7 per region, 2-3 per department)
    │   ├── Maliyyə Operatoru
    │   ├── İnzibati Operatoru  
    │   └── Təsərrüfat Operatoru
    └── SektorAdmin (7-8 per region)
        └── SchoolAdmin (600-700 total)
            └── School Personnel (700+ total):
                ├── Müavin (Deputy) - Dərs bölgüsü və cədvəl
                ├── UBR (Tədrir-Bilimlər Referenti) - Tədbirlər 
                ├── Təsərrüfat Müdiri - İnventarizasiya
                ├── Psixoloq - Şagird qayğısı
                ├── Müəllim (Teacher) - Fənn müəllimi
                └── Digər Personal
```

**Primary Users:**

1. **SuperAdmin (1-2 users)** - Sistem administratoru
   - Tam sistem nəzarəti və konfiqurasiyası
   - Regionadmin yaratma və idarəetmə səlahiyyəti
   - Sistem performans monitorinqi
   - Qlobal statistik təhlillər

2. **RegionAdmin (1 per region)** - Regional idarəetmə rəhbəri  
   - Regional səviyyədə tam nəzarət
   - Sorğu yaratma və nəticə təhlili
   - RegionOperator və SektorAdmin idarəetməsi
   - Regional hesabat hazırlama

3. **RegionOperator (6-7 per region)** - Regional əməliyyat specialisti
   - **Maliyyə Operatoru**: Maliyyə sorğuları və hesabatları
   - **İnzibati Operatoru**: Kadr məsələləri və inzibati qərarlar  
   - **Təsərrüfat Operatoru**: Tikinti, təmir və təsərrüfat işləri
   - Öz sahəsində sorğu yaratma və nəzarət
   - Sektorlarla birbaşa əlaqə

4. **SektorAdmin (7-8 per region)** - Sektor rəhbəri
   - Rayon/şəhər səviyyəsində nəzarət
   - Məktəblər üçün sorğu yaratma
   - SchoolAdmin performance monitorinqi
   - Lokal təhsil siyasətinin həyata keçirilməsi

5. **SchoolAdmin (600-700 total)** - Təhsil müəssisəsi rəhbəri
   - Direktor və ya director tərəfindən təyin olunan şəxs
   - Sorğulara cavab verme məsuliyyəti
   - Müəssisə səviyyəsində məlumat idarəetməsi
   - Müəllimlərə tapşırıq verilməsi

6. **Məktəb İşçiləri (700+ total)**
   - **Müavin (Deputy)**: Dərs bölgüsü və cədvəl idarəetməsi
   - **UBR (Tədrir-Bilimlər Referenti)**: Tədbirlər planlaşdırması
   - **Təsərrüfat Müdiri**: İnventarizasiya idarəetməsi
   - **Psixoloq**: Şagird qayğısı və dəstək
   - **Müəllim**: Fənn tədrisatı və qiymətləndirmə
   - **Digər Personal**: Məhdud sistemə giriş imkanları

#### 2.2 Regional Structure Details

**Sample Regional Structure - Şəki-Zaqatala Regional Təhsil İdarəsi:**
```
Şəki-Zaqatala Regional Təhsil İdarəsi
├── Maliyyə Şöbəsi
├── İnzibati Şöbəsi  
├── Təsərrüfat Şöbəsi
└── Sektorlar:
    ├── Balakən Sektoru
    ├── Zaqatala Sektoru
    ├── Qax Sektoru
    ├── Şəki Şəhər Sektoru
    ├── Oğuz Sektoru
    ├── Qəbələ Sektoru
    ├── Şahmat Sektoru (optional)
    └── İdman Sektoru (optional)
```

### 3. DEVELOPMENT PHASES & TIMELINE

#### Phase 1: Foundation (Months 1-2)
- Authentication & Authorization system
- User management & role assignment
- Basic hierarchical structure
- Database schema implementation

#### Phase 2: Core Features (Months 3-4)  
- Survey creation & response system
- Basic reporting dashboard
- Document upload & sharing
- Notification system implementation

#### Phase 3: Advanced Features (Months 5-6)
- Task management system
- Advanced analytics & reporting
- File management with versioning
- Performance optimization

#### Phase 4: Enhancement & Testing (Months 7-8)
- Multilingual support
- Advanced security features
- Load testing & optimization
- User acceptance testing

#### School Module Extension (Months 9-16)
##### Phase 1: Foundation (Months 9-10)
- Enhanced user role system (6 school personnel types)
- Basic school structure and personnel management

##### Phase 2: Core Features (Months 11-12)  
- Schedule generation and management system
- Assessment data entry and tracking
- Attendance management system

##### Phase 3: Advanced Features (Months 13-14)
- Document templates and management
- Event planning and calendar system
- Performance analytics and ranking

##### Phase 4: School Module Complete (Months 15-16)
- Asset management integration
- Staff substitution system
- Advanced reporting and export features

### 4. RISKS & MITIGATION STRATEGIES

#### 4.1 Technical Risks
- **Risk**: Database performance with 700+ institutions
- **Mitigation**: Proper indexing, query optimization, Redis caching

- **Risk**: Concurrent user load during peak times
- **Mitigation**: Load balancing, connection pooling, background job processing

- **Risk**: File storage management
- **Mitigation**: Automated cleanup, compression, cloud backup strategy

#### 4.2 Business Risks  
- **Risk**: User adoption resistance in rural areas
- **Mitigation**: Training programs, local language support, simple UI

- **Risk**: Network connectivity issues
- **Mitigation**: Offline capability planning, mobile-optimized design

### 5. TECHNICAL REQUIREMENTS

#### 5.1 Enhanced Technology Stack
- **Backend**: PHP Laravel 11.x + PostgreSQL 15+
- **Frontend**: React 18+ (Mobile-first responsive)
- **API**: RESTful API with versioning (/api/v1/)
- **Caching**: Redis (session, query cache)
- **Background Jobs**: Laravel Queue + Redis
- **File Storage**: Local file system + backup strategy
- **Authentication**: Laravel Sanctum

#### 5.2 Performance Requirements
**Enhanced Specifications**:
- **Concurrent Users**: 400-500 peak time (09:00-18:00)
- **Surge Capacity**: 600+ users during deadline periods
- **Page Load Time**: < 2 seconds (95th percentile)
- **API Response Time**: < 300ms (average)
- **Uptime Target**: 99.8% (43 minutes downtime/month)
- **Database Response**: < 100ms for standard queries

**Server Specifications**:
- **CPU**: 32 cores
- **RAM**: 128GB
- **Storage**: Primary 1TB SSD + 2TB backup
- **Network**: Gigabit connection

#### 5.3 Data Management Strategy
**Data Retention Policy**:
- **Active Data**: Current year + last 3 years
- **Archive Policy**: Older data moved to archive storage
- **Survey Lifecycle**: Collection → Analysis → Archive → Deletion
- **Backup Strategy**: Daily incremental, weekly full backup

**Database Optimization**:
- **Indexing Strategy**: Multi-column indexes for hierarchical queries
- **Partitioning**: Year-based table partitioning
- **Query Optimization**: Regular EXPLAIN ANALYZE reviews
- **Connection Pooling**: PgBouncer implementation
