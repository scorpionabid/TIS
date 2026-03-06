# PRD-4: Məktəb İdarəetmə Modulu

## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### ENHANCED USER ROLE STRUCTURE

**Updated Hierarchy:**
```
SchoolAdmin (600-700 total) - Məktəb Direktoru
└── School Personnel (700+ total):
    ├── Müavin (Deputy) - Dərs bölgüsü və cədvəl
    ├── UBR (Tədrir-Bilimlər Referenti) - Tədbirlər 
    ├── Təsərrüfat Müdiri - İnventarizasiya
    ├── Psixoloq - Şagird qayğısı
    ├── Müəllim (Teacher) - Fənn müəllimi
    └── Digər Personal
```

### 1. ACADEMIC SCHEDULE MANAGEMENT
**Priority**: Must Have

**Features**:
- **Automatic Schedule Generation**: Şablon əsasında dərs cədvəli yaratma
- **Manual Teacher Assignment**: Müəllim təyinatlarının düzəlişi
- **Room Management**: Otaq rezervasiya sistemi (laboratoriya, gimnaziya)
- **Schedule Validation**: Konflikt yoxlama (müəllim/otaq/vaxt)

**Schedule Data Structure**:
```
Dərs Cədvəli məlumatları:
- Sinif (Class)
- Fənn (Subject) 
- Müəllim (Teacher)
- Otaq nömrəsi (Room number)
- Saat (Time slot)
- Həftənin günü (Day of week)
- Dərs növü (Lesson type: adi/əlavə)
```

**Responsible Role**: Müavin (Deputy) - dərs bölgüsü və cədvəl səlahiyyəti

### 2. ACADEMIC ASSESSMENT SYSTEM
**Priority**: Must Have

**Assessment Types**:
- **KSQ Results**: Kurs Sonu Qiymətləndirmə nəticələri
- **BSQ Results**: Buraxılış Sonu Qiymətləndirmə nəticələri  
- **Monitoring Results**: Dövri müşahidə qiymətləndirmələri
- **Various Assessment Results**: Müxtəlif qiymətləndirmə nəticələri

**Teacher Certification Data**:
- **Sertifikasiya Balı**: Müəllim sertifikasiya nəticəsi
- **DQ Balı**: Dövlət Qulluğu balı
- **MİQ Balı**: Müəllim İxtisasartırma Qursu balı

**Statistical Analysis**:
- Sinif ortalaması və performans göstəriciləri
- Ən yüksək/aşağı qiymətlər analizi
- Uğur göstəriciləri və trend təhlili  
- Davamiyyət-performans əlaqəsi analizi

### 3. ATTENDANCE MANAGEMENT SYSTEM
**Priority**: Must Have

**Daily Attendance Tracking**:
- **Gün əvvəli sayım**: Sinifdə neçə şagird olmalıdır
- **Gün sonu sayım**: Faktiki olaraq neçə şagird sinifdə idi
- **İcazəli yoxluq**: Sənəd əsaslı yoxluq (xəstəlik, ailə məsələsi)
- **İcazəsiz yoxluq**: Səbəbsiz yoxluq
- **Aylıq hesabat**: Davamiyyət statistikası və trend təhlili

### 4. DOCUMENT MANAGEMENT & TEMPLATES
**Priority**: Should Have

**Document Categories**:
- **İdarəetmə sənədləri**: Məktəbin strategiyası, iş planları
- **Dərs bölgüsü**: Fənn bölgüsü və müəllim təyinatları
- **Dərs cədvəlləri**: Həftəlik və illik cədvəllər
- **Metodiki materiallar**: Dərs planları və qiymətləndirmə şablonları

**Template System**:
- **Fənn və sinif səviyyəsinə görə hazır şablonlar**
- **Düzəliş imkanı**: Məktəb xüsusiyyətlərinə uyğunlaşdırma
- **Version control**: Şablon versiyalarının idarəetməsi

### 5. EVENT & ACTIVITY PLANNING
**Priority**: Should Have

**Event Management**:
- **Tədrir-Bilimlər Referenti (UBR)** tərəfindən idarə olunur
- **Tədbir planlanması**: Dərs saatları, ekskursiyalar, yarışlar
- **Mərkəzi təqvim** + **məktəb səviyyəsində əlavə tədbirlər**
- **İmtahan tarixləri**: Rüblük və illik imtahan planlaması

### 6. ASSET & INVENTORY MANAGEMENT
**Priority**: Could Have

**Inventory Tracking**:
- **Təsərrüfat Müdiri** tərəfindən idarə olunur
- **Inventarizasiya** prosesləri və səmərəli resursan istifadə
- **Avadanlıq və materialların** uçotu
- **Təmir və bərpa işləri** planlaması

### 7. STUDENT SUPPORT SERVICES
**Priority**: Could Have

**Psychological Support**:
- **Psixoloq** tərəfindən idarə olunur
- **Şagird qayğısı** və dəstək proqramları
- **Konsultasiya** xidmətləri qeydiyyatı
- **İnkişaf hesabatları** və tövsiyələr

### 8. PERFORMANCE ANALYTICS & RANKING
**Priority**: Should Have

**School Comparison System**:
- **Akademik performans** əsaslı ranking
- **Davamiyyət göstəriciləri** müqayisəsi
- **Resurstan istifadə səmərəliliyi** qiymətləndirməsi
- **Regional və sektor səviyyəsində** müqayisə

**Access Permissions**:
- **RegionAdmin və SektorAdmin**: Statistik məlumatları görür
- **Performance hesabatları** və müqayisəli təhlillər
- **Sorğu yaratma** məktəb fəaliyyəti üçün
- **Dərs cədvəlinə müdaxilə yoxdur** (məktəb daxili işlər)

### 9. STAFF SUBSTITUTION SYSTEM
**Priority**: Should Have

**Temporary Assignment Features**:
- **Xəstəlik və məzuniyyət** hallarında avtomatik əvəzetmə
- **Müəllim yükü** yenidən bölüşdürülməsi
- **Cədvəl dəyişikliyi** və bildiriş sistemi
- **Qədərli dərslər** üçün xüsusi təyinatlar

### 10. TECHNICAL IMPLICATIONS

#### Database Extensions
**New Tables Required** (~15-20 tables):
- `schools`, `classes`, `subjects`, `teachers`, `staff_roles`
- `schedules`, `schedule_slots`, `room_assignments`
- `assessments`, `grades`, `attendance_records`
- `documents`, `templates`, `events`, `inventories`

#### User Interface Extensions
- **SchoolAdmin Dashboard**: Tam məktəb oversight
- **Müavin Interface**: Cədvəl və bölgü idarəetməsi
- **UBR Panel**: Tədbir planlaması
- **Təsərrüfat Interface**: İnventarizasiya sistemi
- **Psixoloq Panel**: Şagird support tracking

#### Performance Considerations
- **Additional concurrent users**: +200-300 məktəb personalı
- **Data volume increase**: ~50GB additional per year
- **Complex query requirements**: Multi-table joins for analytics
- **Real-time updates**: Schedule changes, attendance tracking
