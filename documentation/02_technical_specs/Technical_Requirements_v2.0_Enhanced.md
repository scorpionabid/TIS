# Technical Requirements Document (TRD) v2.0
## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### DOCUMENT INFO
**Version**: 2.0 Enhanced with School Management
**Created**: January 2025
**Project**: ATİS - Comprehensive Education Management System
**Technology Stack**: Laravel 12 + PostgreSQL 15 + React 18 + Redis

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 Enhanced High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React 18+     │◄──►│   Laravel 12    │◄──►│   PostgreSQL    │
│   (Mobile First)│    │   PHP 8.2+      │    │   15+           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   4GB Memory    │
                       │   Sessions+Jobs │
                       └─────────────────┘
                              │
                    ┌─────────────────────┐
                    │   File Storage      │
                    │   Institution-Based │
                    │   /region/sector/   │
                    └─────────────────────┘
```

### 1.2 System Capacity Planning
**Current Load Specifications:**
- **Total Institutions**: 700 schools/institutions
- **Daily Active**: ~700 institutions online
- **Peak Concurrent**: 200 institutions simultaneously
- **User Base**: 1,400+ total users across all roles
- **Data Volume**: Low-moderate (educational administrative data)

**Server Infrastructure:**
- **CPU**: 32 cores (confirmed)
- **RAM**: 128GB total (124GB application + 4GB Redis)
- **Storage**: Primary 1TB SSD + 2TB backup
- **Redis Allocation**: 4GB (sufficient for session + cache management)

---

## 2. DATABASE DESIGN & ARCHITECTURE

### 2.1 Database Strategy - Normalized Approach
**Design Philosophy**: Variant 1 - Fully normalized tables for maximum flexibility and future expansion capability.

**Core Principles:**
- Separate tables for different entity types
- Foreign key relationships for data integrity
- Minimal data duplication
- Easy to modify/extend without structural changes

### 2.2 Minimum Viable Schema (8 Core Tables)

#### Core System Tables
```sql
-- User Management
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id BIGINT REFERENCES roles(id),
    institution_id BIGINT REFERENCES institutions(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    language_preference VARCHAR(5) DEFAULT 'az',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    level INTEGER NOT NULL, -- 1=SuperAdmin, 6=School Staff
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Institution Hierarchy
CREATE TABLE institutions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'region', 'sector', 'school'
    parent_id BIGINT REFERENCES institutions(id),
    level INTEGER NOT NULL, -- 1=Region, 2=Sector, 3=School
    region_code VARCHAR(10),
    contact_info JSONB,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### School Management Tables
```sql
-- School Staff (Enhanced from "müəllim")
CREATE TABLE school_staff (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    school_id BIGINT REFERENCES institutions(id),
    staff_type VARCHAR(50) NOT NULL, -- 'muavin', 'ubr', 'tesserrufat', 'psixoloq', 'muellim'
    department VARCHAR(50), -- 'maliyye', 'inzibati', 'tesserrufat'
    specialization VARCHAR(100), -- Fənn üçün müəllimlər
    certification_score INTEGER, -- Sertifikasiya balı
    dq_score INTEGER, -- DQ balı 
    miq_score INTEGER, -- MİQ balı
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Class Management
CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES institutions(id),
    class_name VARCHAR(20) NOT NULL, -- '11-A', '9-B'
    grade_level INTEGER NOT NULL, -- 1-11
    student_count INTEGER DEFAULT 0,
    room_number VARCHAR(10),
    class_teacher_id BIGINT REFERENCES school_staff(id),
    academic_year VARCHAR(10), -- '2024-2025'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subject Management
CREATE TABLE subjects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Riyaziyyat', 'Fizika'
    code VARCHAR(20), -- 'MATH', 'PHYS'
    grade_levels INTEGER[], -- [9,10,11] hansi siniflərdə oxunur
    weekly_hours INTEGER DEFAULT 2,
    subject_type VARCHAR(50) DEFAULT 'core', -- 'core', 'elective', 'additional'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Schedule Management
CREATE TABLE schedules (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES institutions(id),
    class_id BIGINT REFERENCES classes(id),
    subject_id BIGINT REFERENCES subjects(id),
    teacher_id BIGINT REFERENCES school_staff(id),
    day_of_week INTEGER NOT NULL, -- 1=Monday, 7=Sunday
    time_slot INTEGER NOT NULL, -- 1-8 (dərs saatları)
    room_number VARCHAR(10),
    lesson_type VARCHAR(20) DEFAULT 'regular', -- 'regular', 'additional'
    academic_year VARCHAR(10),
    semester INTEGER DEFAULT 1, -- 1 or 2
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance Tracking
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES institutions(id),
    class_id BIGINT REFERENCES classes(id),
    attendance_date DATE NOT NULL,
    total_students_expected INTEGER NOT NULL, -- Gün əvvəli sayım
    total_students_present INTEGER NOT NULL, -- Gün sonu sayım
    excused_absences INTEGER DEFAULT 0, -- İcazəli yoxluq
    unexcused_absences INTEGER DEFAULT 0, -- İcazəsiz yoxluq
    recorded_by BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assessment Results
CREATE TABLE assessments (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES institutions(id),
    class_id BIGINT REFERENCES classes(id),
    subject_id BIGINT REFERENCES subjects(id),
    assessment_type VARCHAR(50), -- 'ksq', 'bsq', 'monitoring', 'other'
    assessment_name VARCHAR(200),
    assessment_date DATE,
    total_students INTEGER,
    average_score DECIMAL(5,2),
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    pass_rate DECIMAL(5,2), -- Uğur göstəricisi
    results_data JSONB, -- Detailed results
    recorded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 Enhanced Indexing Strategy

#### Primary Performance Indexes
```sql
-- User Management Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_institution_role ON users(institution_id, role_id);
CREATE INDEX idx_users_active ON users(is_active, last_login_at);

-- Institution Hierarchy Indexes  
CREATE INDEX idx_institutions_parent ON institutions(parent_id);
CREATE INDEX idx_institutions_type_level ON institutions(type, level);
CREATE INDEX idx_institutions_region ON institutions(region_code, is_active);

-- School Management Indexes
CREATE INDEX idx_school_staff_school_type ON school_staff(school_id, staff_type);
CREATE INDEX idx_classes_school_year ON classes(school_id, academic_year);
CREATE INDEX idx_schedules_composite ON schedules(school_id, class_id, day_of_week, time_slot);
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id, academic_year, is_active);

-- Attendance Indexes (Critical for daily operations)
CREATE INDEX idx_attendance_school_date ON attendance(school_id, attendance_date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX idx_attendance_month ON attendance(school_id, date_trunc('month', attendance_date));

-- Assessment Indexes
CREATE INDEX idx_assessments_school_type ON assessments(school_id, assessment_type);
CREATE INDEX idx_assessments_class_subject ON assessments(class_id, subject_id);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);

-- Survey System Indexes (from original design)
CREATE INDEX idx_surveys_created_by ON surveys(created_by, is_active);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id, status);
CREATE INDEX idx_survey_responses_institution ON survey_responses(institution_id, submitted_at);
```

#### Composite Indexes for Complex Queries
```sql
-- Multi-table join optimization
CREATE INDEX idx_staff_user_school ON school_staff(user_id, school_id, staff_type);
CREATE INDEX idx_schedule_full_lookup ON schedules(class_id, subject_id, day_of_week, time_slot);
CREATE INDEX idx_attendance_analytics ON attendance(school_id, attendance_date, total_students_present);
```

---

## 3. API ARCHITECTURE & PERFORMANCE

### 3.1 RESTful API Design Enhanced

**Base URL Structure:**
```
https://atis.edu.az/api/v1/
```

**Authentication**: Laravel Sanctum with role-based permissions

### 3.2 API Rate Limiting Strategy

```php
// Rate Limiting Configuration
'api' => [
    'superadmin' => null, // Unlimited for emergency operations
    'regionadmin' => '120,1', // 120 requests per minute
    'regionoperator' => '90,1', // 90 requests per minute  
    'sektoradmin' => '90,1',
    'schooladmin' => '60,1', // 60 requests per minute
    'school_staff' => '30,1', // 30 requests per minute
],

'file_upload' => [
    'concurrent_uploads' => 3, // Maximum 3 simultaneous uploads
    'daily_limit_per_user' => 20, // 20 files per day
    'monthly_storage_limit' => '100MB', // Per user storage
]
```

### 3.3 Enhanced API Endpoints

#### School Management API
```php
// Schedule Management
GET    /api/v1/schools/{id}/schedules
POST   /api/v1/schools/{id}/schedules/generate
PUT    /api/v1/schedules/{id}
GET    /api/v1/schedules/conflicts

// Attendance Management  
POST   /api/v1/schools/{id}/attendance/daily
GET    /api/v1/schools/{id}/attendance/statistics
PUT    /api/v1/attendance/{id}

// Assessment Management
POST   /api/v1/schools/{id}/assessments
GET    /api/v1/schools/{id}/assessments/analytics
GET    /api/v1/assessments/comparison

// Staff Management
GET    /api/v1/schools/{id}/staff
POST   /api/v1/schools/{id}/staff/assign
PUT    /api/v1/staff/{id}/substitution
```

---

## 4. FILE STORAGE ARCHITECTURE

### 4.1 Institution-Based Storage Structure (Variant 2)

```
/storage/
├── institutions/
│   ├── region_1_baki/
│   │   ├── sector_1_yasamal/
│   │   │   ├── school_123_mekteb1/
│   │   │   │   ├── surveys/
│   │   │   │   │   ├── 2025_01_survey_response.pdf
│   │   │   │   │   └── monthly_stats.xlsx
│   │   │   │   ├── schedules/
│   │   │   │   │   ├── 2025_spring_schedule.xlsx
│   │   │   │   │   └── teacher_assignments.pdf
│   │   │   │   ├── documents/
│   │   │   │   │   ├── strategic_plan.pdf
│   │   │   │   │   └── policies/
│   │   │   │   └── assessments/
│   │   │   │       ├── ksq_results_2025.xlsx
│   │   │   │       └── monitoring_reports/
│   │   │   └── school_124_mekteb2/
│   │   └── sector_2_nizami/
│   └── region_2_ganja/
├── shared/
│   ├── templates/
│   │   ├── survey_templates/
│   │   ├── schedule_templates/
│   │   └── document_templates/
│   └── system/
│       ├── backups/
│       └── exports/
└── temp/
    ├── uploads/ (Temporary file processing)
    └── exports/ (Generated reports before download)
```

### 4.2 File Management Specifications

**File Type Support:**
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Images**: JPG, PNG (minimal usage for institutional logos)
- **Templates**: PDF, XLSX (read-only system templates)

**Security Measures:**
- Virus scanning with ClamAV integration
- File type validation (MIME type + extension)
- Size limits enforced at API level
- Access control based on institutional hierarchy

---

## 5. BACKGROUND JOBS & QUEUE MANAGEMENT

### 5.1 Queue Job Configuration

```php
// Queue Job Types and Timeouts
'jobs' => [
    'email_notifications' => [
        'timeout' => 60, // 1 minute per batch
        'batch_size' => 10, // 10 emails parallel
        'retry_attempts' => 3,
        'retry_delay' => 300, // 5 minutes
    ],
    'excel_export' => [
        'timeout' => 900, // 15 minutes
        'memory_limit' => '512M',
        'progress_tracking' => true,
    ],
    'schedule_generation' => [
        'timeout' => 30, // 30 seconds
        'validation' => true,
        'conflict_resolution' => 'auto',
    ],
    'file_processing' => [
        'virus_scan' => true,
        'timeout' => 120, // 2 minutes
        'quarantine_suspicious' => true,
    ],
    'database_backup' => [
        'schedule' => '0 2 * * *', // Daily at 2 AM
        'retention_days' => 30,
        'compression' => true,
    ],
    'statistics_calculation' => [
        'schedule' => '0 6 * * 0', // Weekly Sunday 6 AM
        'scope' => ['attendance', 'assessments', 'performance'],
    ],
]
```

### 5.2 Queue Priority System

```php
// Job Priority Levels
'high_priority' => [
    'emergency_notifications',
    'critical_data_updates',
    'authentication_issues',
],
'medium_priority' => [
    'daily_reports',
    'schedule_updates', 
    'assessment_processing',
],
'low_priority' => [
    'statistical_analysis',
    'data_archiving',
    'routine_backups',
]
```

---

## 6. REDIS CACHE STRATEGY

### 6.1 Cache Configuration (4GB Allocation)

```php
// Cache Strategy with 4GB Redis
'cache_settings' => [
    'memory_allocation' => '4GB',
    'eviction_policy' => 'allkeys-lru', // Least Recently Used
    'max_memory_samples' => 5,
],

'cache_keys' => [
    'user_sessions' => [
        'ttl' => 28800, // 8 hours
        'estimated_size' => '500MB', // 1000+ concurrent sessions
    ],
    'institution_hierarchy' => [
        'ttl' => 3600, // 1 hour (changes infrequently)
        'estimated_size' => '50MB',
    ],
    'survey_templates' => [
        'ttl' => 86400, // 24 hours (very stable)
        'estimated_size' => '100MB',
    ],
    'active_surveys' => [
        'ttl' => 1800, // 30 minutes
        'estimated_size' => '200MB',
    ],
    'user_permissions' => [
        'ttl' => 7200, // 2 hours
        'estimated_size' => '300MB',
    ],
    'daily_attendance_stats' => [
        'ttl' => 21600, // 6 hours
        'estimated_size' => '400MB',
    ],
    'database_query_cache' => [
        'ttl' => 900, // 15 minutes
        'estimated_size' => '2GB', // Most of the allocation
    ],
]
```

### 6.2 Cache Performance Optimization

```php
// Cache Warming Strategy
'cache_warming' => [
    'morning_preparation' => [ // 8:00 AM daily
        'institution_hierarchy',
        'active_surveys',
        'user_permissions',
    ],
    'realtime_updates' => [
        'attendance_statistics',
        'survey_responses',
        'schedule_changes',
    ],
]
```

---

## 7. SECURITY & AUTHENTICATION

### 7.1 Enhanced Security Measures

```php
// Security Configuration
'security' => [
    'password_policy' => [
        'min_length' => 8,
        'require_uppercase' => true,
        'require_lowercase' => true,
        'require_numbers' => true,
        'require_symbols' => false, // Simplified for users
        'hash_rounds' => 12, // bcrypt rounds
    ],
    'account_lockout' => [
        'max_attempts' => 5,
        'lockout_duration' => 1800, // 30 minutes
        'progressive_delay' => true,
    ],
    'session_management' => [
        'lifetime' => 28800, // 8 hours
        'max_concurrent_sessions' => 3, // Per user
        'secure_cookies' => true,
        'same_site' => 'strict',
    ],
    'file_upload_security' => [
        'virus_scanning' => true,
        'mime_type_validation' => true,
        'file_size_limits' => [
            'max_file_size' => '10MB',
            'max_monthly_per_user' => '100MB',
        ],
    ],
]
```

### 7.2 Role-Based Access Control Enhancement

```php
// School Staff Permissions
'school_permissions' => [
    'muavin' => [
        'schedule.create', 'schedule.edit', 'schedule.view',
        'class.manage', 'teacher.assign',
    ],
    'ubr' => [
        'events.create', 'events.manage', 'calendar.edit',
        'activities.plan', 'reports.generate',
    ],
    'tesserrufat_mudiri' => [
        'inventory.manage', 'assets.track', 'maintenance.schedule',
        'procurement.view', 'facility.manage',
    ],
    'psixoloq' => [
        'student_support.manage', 'counseling.record',
        'psychological_reports.create', 'student_welfare.monitor',
    ],
    'muellim' => [
        'grades.input', 'attendance.mark', 'lesson_plans.create',
        'student_progress.view', 'parent_communication.send',
    ],
]
```

---

## 8. MONITORING & PERFORMANCE

### 8.1 Application Performance Monitoring

```php
// Performance Metrics
'monitoring' => [
    'response_time_targets' => [
        'api_endpoints' => '< 300ms average',
        'page_loads' => '< 2 seconds 95th percentile',
        'database_queries' => '< 100ms average',
        'file_uploads' => '< 30 seconds for 10MB',
    ],
    'concurrent_user_handling' => [
        'target_capacity' => 200, // Simultaneous users
        'peak_capacity' => 300, // During deadline periods
        'graceful_degradation' => true,
    ],
    'resource_utilization' => [
        'cpu_threshold' => '70%',
        'memory_threshold' => '80%',
        'disk_io_threshold' => '70%',
        'redis_memory_threshold' => '90%',
    ],
]
```

### 8.2 Database Performance Optimization

```sql
-- Query Performance Monitoring
-- Enable query logging for optimization
log_statement = 'all'
log_min_duration_statement = 100 -- Log queries > 100ms

-- Connection Pooling
max_connections = 200
shared_buffers = 32GB -- 25% of 128GB RAM
effective_cache_size = 96GB -- 75% of 128GB RAM
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

---

## 9. DEPLOYMENT & SCALABILITY

### 9.1 Production Deployment Configuration

```yaml
# Docker Compose for Production
version: '3.8'
services:
  app:
    image: atis-laravel:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '16'
          memory: 60G
        reservations:
          cpus: '8'
          memory: 30G
  
  database:
    image: postgres:15
    environment:
      POSTGRES_DB: atis_production
      POSTGRES_USER: atis_user
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 32G
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 4gb --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 4G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
```

### 9.2 Backup & Recovery Strategy

```bash
#!/bin/bash
# Enhanced Backup Strategy

# Database Backup (Daily)
pg_dump -h localhost -U atis_user -d atis_production \
  --verbose --format=custom \
  --file="/backups/db/atis_$(date +%Y%m%d_%H%M%S).dump"

# File System Backup (Daily)
tar -czf "/backups/files/atis_files_$(date +%Y%m%d).tar.gz" \
  /var/www/html/storage/app/institutions/

# Redis Backup (Every 6 hours)
redis-cli --rdb "/backups/redis/dump_$(date +%Y%m%d_%H%M%S).rdb"

# Cleanup old backups (Keep 30 days)
find /backups -type f -mtime +30 -delete

# Verify backup integrity
pg_restore --list "/backups/db/atis_$(date +%Y%m%d_*)*.dump" > /dev/null
echo "Backup verification completed: $(date)"
```

---

## 10. TESTING STRATEGY

### 10.1 Performance Testing Scenarios

```php
// Load Testing Configuration
'load_tests' => [
    'concurrent_users' => [
        'baseline' => 50,  // Normal operations
        'target' => 200,   // Peak capacity
        'stress' => 300,   // Stress testing
    ],
    'school_operations' => [
        'daily_attendance_entry' => '700 schools × 5 minutes',
        'schedule_generation' => '100 schools simultaneously',
        'assessment_data_entry' => '200 concurrent entries',
    ],
    'api_endpoints' => [
        'authentication' => '100 requests/second',
        'data_retrieval' => '500 requests/second',
        'file_upload' => '20 concurrent uploads',
    ],
]
```

### 10.2 Database Testing Strategy

```sql
-- Performance Test Queries
-- Attendance Analytics (Daily Operation)
EXPLAIN ANALYZE 
SELECT school_id, AVG(total_students_present) 
FROM attendance 
WHERE attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY school_id;

-- Schedule Conflict Detection
EXPLAIN ANALYZE
SELECT * FROM schedules s1
JOIN schedules s2 ON s1.teacher_id = s2.teacher_id
WHERE s1.id != s2.id 
  AND s1.day_of_week = s2.day_of_week
  AND s1.time_slot = s2.time_slot
  AND s1.academic_year = s2.academic_year;

-- Hierarchical Institution Query
EXPLAIN ANALYZE
WITH RECURSIVE institution_tree AS (
    SELECT id, name, parent_id, 1 as level
    FROM institutions WHERE parent_id IS NULL
    UNION ALL
    SELECT i.id, i.name, i.parent_id, it.level + 1
    FROM institutions i
    JOIN institution_tree it ON i.parent_id = it.id
)
SELECT * FROM institution_tree WHERE level <= 3;
```

---

## 11. MAINTENANCE & UPDATES

### 11.1 Database Maintenance Schedule

```sql
-- Weekly Maintenance Tasks
-- Vacuum and analyze for performance
VACUUM ANALYZE attendance;
VACUUM ANALYZE schedules;
VACUUM ANALYZE assessments;
VACUUM ANALYZE survey_responses;

-- Monthly maintenance
REINDEX INDEX CONCURRENTLY idx_attendance_school_date;
REINDEX INDEX CONCURRENTLY idx_schedules_composite;

-- Quarterly maintenance  
-- Partition attendance table by month
CREATE TABLE attendance_2025_q2 PARTITION OF attendance
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
```

### 11.2 Version Management Strategy

```php
// API Versioning for School Module
Route::prefix('v1')->group(function () {
    // Core education management
    Route::apiResource('surveys', SurveyController::class);
    Route::apiResource('institutions', InstitutionController::class);
});

Route::prefix('v1.1')->group(function () {
    // Enhanced with school management
    Route::apiResource('schools.schedules', ScheduleController::class);
    Route::apiResource('schools.attendance', AttendanceController::class);
    Route::apiResource('schools.assessments', AssessmentController::class);
});

// Future versioning for advanced features
Route::prefix('v2')->group(function () {
    // Advanced analytics and AI features
});
```

---

## 12. SUCCESS METRICS & KPIs

### 12.1 Technical Performance KPIs

```php
'performance_kpis' => [
    'system_availability' => '99.8%', // < 43 minutes downtime/month
    'response_times' => [
        'authentication' => '< 200ms',
        'data_queries' => '< 300ms',
        'schedule_generation' => '< 30s',
        'report_exports' => '< 15 minutes',
    ],
    'user_capacity' => [
        'concurrent_users' => 200,
        'daily_active_users' => 700,
        'peak_performance' => 300,
    ],
    'data_integrity' => [
        'backup_success_rate' => '100%',
        'data_corruption_incidents' => '0',
        'successful_recovery_time' => '< 1 hour',
    ],
]
```

### 12.2 Functional Success Metrics

```php
'functional_metrics' => [
    'school_adoption' => [
        'active_schools' => '700/700 (100%)',
        'daily_attendance_recording' => '> 95%',
        'schedule_utilization' => '> 90%',
    ],
    'user_satisfaction' => [
        'system_usability' => '> 90%',
        'training_requirements' => '< 2 hours per user',
        'error_rate' => '< 5%',
    ],
    'operational_efficiency' => [
        'data_collection_time_reduction' => '80%',
        'manual_process_automation' => '70%',
        'report_generation_speed' => '90% improvement',
    ],
]
```

---

**Document Status**: ✅ Complete - Ready for Implementation
**Next Phase**: Database Schema Creation & API Development
**Review Schedule**: Bi-weekly during development
**Technical Lead Approval**: Required before development start