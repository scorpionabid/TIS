# 🎯 STAFF RATING SYSTEM - COMPREHENSIVE IMPLEMENTATION PLAN

**📅 Plan Tarixi:** 2025-12-28
**🏗️ Status:** Ready for Implementation
**🎯 Məqsəd:** Təhsil müəssisəsi rəhbərləri və regional işçilər üçün universal reytinq sistemi
**📋 Əhatə:** SchoolAdmin (Direktorlar), SektorAdmin, RegionOperator
**🔄 İnteqrasiya:** ATİS-ə yeni modul (Teacher Rating sistemindən fərqli)

---

## 📊 SİSTEM XÜLASƏSİ

### **Əsas Fərqlər Teacher Rating-dən:**

| Xüsusiyyət | Teacher Rating | Staff Rating (YENİ) |
|-----------|----------------|---------------------|
| **Məqsəd** | Müəllimlər üçün akademik reytinq | Rəhbərlik üçün performans reytinqi |
| **Qiymətləndirilənlər** | Müəllimlər | SchoolAdmin, SektorAdmin, RegionOperator |
| **Mənbələr** | Excel import, akademik nəticələr | Avtomatik (Tasks/Surveys/Documents/Links) + Manual |
| **Konfigurasiya** | 6 komponent (akademik, olimpiada, etc.) | 4 komponent (task, survey, document, link) |
| **Qiymətləndirənlər** | RegionAdmin (config only) | RegionAdmin, RegionOperator, SektorAdmin (qarşılıqlı) |
| **Hierarchy** | Yoxdur | VAR (aşağıya qiymət verir, yuxarıdan qiymət alır) |

---

## 🏗️ SİSTEM ARXİTEKTURA

### **1. Qiymətləndirmə Strukturu**

```
┌─────────────────────────────────────────────────────────┐
│                    RATING HIERARCHY                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SuperAdmin                                             │
│      ↓ (rates + configures)                            │
│  RegionAdmin                                            │
│      ↓ (rates)                    ↑ (rated by)         │
│  RegionOperator ←────────────────┘                     │
│      ↓ (rates)                    ↑ (rated by)         │
│  SektorAdmin    ←────────────────┘                     │
│      ↓ (rates)                    ↑ (rated by)         │
│  SchoolAdmin    ←────────────────┘                     │
│   (Director)                                            │
│                                                          │
│  📊 QIYMƏT MƏNBƏLƏRI:                                  │
│  - Manual: Yuxarıdan verilən subyektiv qiymət         │
│  - Auto: Tasks/Surveys/Docs/Links performansı         │
└─────────────────────────────────────────────────────────┘
```

### **2. Reytinq Komponenti**

#### **AVTOMATIK HESABLAMA (4 Komponent):**

```javascript
// Rating Formula (Konfiqurasiya edilə bilən)
AutoRating = {
  task_performance: {
    weight: 0.40,  // 40% (RegionAdmin dəyişə bilər)
    calculation: (onTimeCount / totalCount) * 100,
    details: {
      total: 45,
      onTime: 38,
      late: 5,
      incomplete: 2
    }
  },

  survey_performance: {
    weight: 0.30,  // 30%
    calculation: (completedCount / totalCount) * 100,
    details: {
      total: 12,
      completed: 10,
      late: 2
    }
  },

  document_activity: {
    weight: 0.20,  // 20%
    calculation: (uploadCount + shareCount) / expectedActivity * 100,
    details: {
      uploads: 25,
      shares: 15,
      downloads: 80,
      score: 85
    }
  },

  link_management: {
    weight: 0.10,  // 10%
    calculation: (activeLinks / totalLinks) * shareMetrics,
    details: {
      total: 20,
      active: 18,
      expired: 2,
      access_count: 150
    }
  }
};

// Final Score (0-5 scale)
FinalScore = (
  task_performance.score * task_performance.weight +
  survey_performance.score * survey_performance.weight +
  document_activity.score * document_activity.weight +
  link_management.score * link_management.weight
) / 20; // normalize to 0-5
```

#### **MANUAL QİYMƏTLƏNDİRMƏ:**
- Subyektiv: Liderlik, komanda işi, kommunikasiya
- Kateqoriyalar: leadership, teamwork, communication, initiative
- Scale: 0-5 (0.5 interval)

---

## 🗄️ DATABASE SCHEMA (PRODUCTION-SAFE)

### **Migration Strategy:**
✅ **Yeni cədvəllər** (mövcud data-ya toxunmur)
✅ **institutions.metadata** istifadə (yeni sütun YOX)
✅ **rating_configuration** re-use (Teacher Rating ilə paylaşılır)

### **Schema:**

```sql
-- ═══════════════════════════════════════════════════════════
-- 1. STAFF_RATINGS (Əsas reytinq cədvəli)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE staff_ratings (
    id BIGSERIAL PRIMARY KEY,

    -- Target (qiymətləndirilən)
    staff_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    staff_role VARCHAR(50) NOT NULL, -- 'schooladmin', 'sektoradmin', 'regionoperator'
    institution_id BIGINT NULL REFERENCES institutions(id) ON DELETE SET NULL,

    -- Rater (qiymətləndirən)
    rater_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    rater_role VARCHAR(50) NULL, -- 'regionadmin', 'regionoperator', 'sektoradmin'

    -- Rating Details
    rating_type VARCHAR(20) NOT NULL CHECK (rating_type IN ('manual', 'automatic')),
    category VARCHAR(50) NOT NULL,
    -- Manual: 'leadership', 'teamwork', 'communication', 'initiative', 'overall'
    -- Auto: 'task_performance', 'survey_performance', 'document_activity', 'link_management', 'overall'

    score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 5),
    period VARCHAR(20) NOT NULL, -- '2024-12', '2024-Q4', '2024'

    -- Metadata
    notes TEXT NULL,
    auto_calculated_data JSON NULL, -- Breakdown detalları
    is_latest BOOLEAN DEFAULT false, -- Bu period üçün ən son qiymətdir

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_staff_ratings_user_period (staff_user_id, period, rating_type),
    INDEX idx_staff_ratings_role_period (staff_role, period),
    INDEX idx_staff_ratings_institution (institution_id, period),
    INDEX idx_staff_ratings_latest (is_latest, period),

    -- Unique: Hər dövrdə hər kateqoriya üçün 1 reytinq
    UNIQUE (staff_user_id, rating_type, category, period, rater_user_id)
);

-- Auto-calculated data JSON structure example:
/*
{
  "task_performance": {
    "total": 45,
    "onTime": 38,
    "late": 5,
    "incomplete": 2,
    "onTimeRate": 84.4,
    "componentScore": 4.2,
    "weight": 0.40,
    "weightedScore": 1.68
  },
  "survey_performance": { ... },
  "document_activity": { ... },
  "link_management": { ... },
  "final_score": 4.15,
  "calculated_at": "2024-12-28T10:30:00Z"
}
*/

-- ═══════════════════════════════════════════════════════════
-- 2. STAFF_RATING_CONFIGURATIONS (Konfigurasiya)
-- ═══════════════════════════════════════════════════════════
-- QEYD: rating_configuration cədvəli artıq mövcuddur (Teacher Rating)
-- Yeni component_name-lər əlavə ediləcək:
-- - 'staff_task_performance'
-- - 'staff_survey_performance'
-- - 'staff_document_activity'
-- - 'staff_link_management'

-- Seeder update olacaq:
INSERT INTO rating_configuration (component_name, weight, year_weights, growth_bonus_rules) VALUES
('staff_task_performance', 0.40, NULL, NULL),
('staff_survey_performance', 0.30, NULL, NULL),
('staff_document_activity', 0.20, NULL, NULL),
('staff_link_management', 0.10, NULL, NULL);

-- ═══════════════════════════════════════════════════════════
-- 3. STAFF_RATING_AUDIT_LOGS (Audit Trail)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE staff_rating_audit_logs (
    id BIGSERIAL PRIMARY KEY,

    rating_id BIGINT NULL REFERENCES staff_ratings(id) ON DELETE SET NULL,
    staff_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted', 'auto_calculated', 'config_changed'
    actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NULL,

    old_score DECIMAL(3,2) NULL,
    new_score DECIMAL(3,2) NULL,
    old_data JSON NULL,
    new_data JSON NULL,
    change_reason TEXT NULL,

    -- Request metadata
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_rating_audit_staff (staff_user_id, created_at DESC),
    INDEX idx_rating_audit_actor (actor_user_id, created_at DESC),
    INDEX idx_rating_audit_action (action, created_at DESC)
);

-- ═══════════════════════════════════════════════════════════
-- 4. INSTITUTIONS.METADATA Update (Director Info)
-- ═══════════════════════════════════════════════════════════
-- Yeni migration YOX, existing metadata field istifadə olunur
-- JSON structure:
/*
{
  "director": {
    "user_id": 123,
    "name": "Əli Məmmədov",
    "appointment_date": "2023-01-15",
    "status": "active",
    "notes": "2023-cü ildən director"
  },
  // digər metadata...
}
*/

-- ═══════════════════════════════════════════════════════════
-- 5. REGION_OPERATOR_PERMISSIONS Update (Reytinq icazəsi)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE region_operator_permissions
ADD COLUMN can_rate_staff BOOLEAN DEFAULT false,
ADD COLUMN can_view_ratings BOOLEAN DEFAULT false;

-- Existing RegionOperators-a icazə vermək
UPDATE region_operator_permissions
SET can_rate_staff = true, can_view_ratings = true
WHERE can_manage_tasks = true OR can_manage_surveys = true;
```

---

## 🔧 BACKEND ARXİTEKTURA

### **Directory Structure:**

```
backend/
├── app/
│   ├── Models/
│   │   ├── StaffRating.php               # NEW
│   │   ├── StaffRatingAuditLog.php       # NEW
│   │   ├── RatingConfiguration.php       # EXISTS (update)
│   │   └── Institution.php               # EXISTS (metadata helper methods)
│   │
│   ├── Services/StaffRating/
│   │   ├── StaffRatingService.php                    # Core service
│   │   ├── AutomaticRatingCalculator.php             # Auto calc engine
│   │   ├── ManualRatingService.php                   # Manual rating
│   │   ├── RatingConfigurationService.php            # Config management
│   │   ├── RatingAuditService.php                    # Audit logging
│   │   ├── DirectorManagementService.php             # Director CRUD
│   │   ├── TaskPerformanceCalculator.php             # Task metrics
│   │   ├── SurveyPerformanceCalculator.php           # Survey metrics
│   │   ├── DocumentActivityCalculator.php            # Document metrics
│   │   └── LinkManagementCalculator.php              # Link metrics
│   │
│   ├── Http/Controllers/StaffRating/
│   │   ├── DirectorManagementController.php          # Director CRUD
│   │   ├── StaffRatingController.php                 # Rating CRUD
│   │   ├── RatingConfigurationController.php         # Config (RegionAdmin only)
│   │   ├── RatingDashboardController.php             # Statistics & analytics
│   │   ├── MyRatingController.php                    # Personal rating view
│   │   └── RatingAuditController.php                 # Audit log viewer
│   │
│   ├── Http/Requests/StaffRating/
│   │   ├── StoreDirectorRequest.php
│   │   ├── UpdateDirectorRequest.php
│   │   ├── StoreRatingRequest.php
│   │   ├── UpdateRatingRequest.php
│   │   └── UpdateConfigurationRequest.php
│   │
│   └── Console/Commands/
│       └── CalculateStaffRatings.php                 # CRON job (daily/monthly)
│
├── database/
│   ├── migrations/
│   │   ├── 2025_12_29_100000_create_staff_ratings_table.php
│   │   ├── 2025_12_29_100001_create_staff_rating_audit_logs_table.php
│   │   ├── 2025_12_29_100002_add_staff_rating_permissions.php
│   │   └── 2025_12_29_100003_seed_staff_rating_configurations.php
│   │
│   └── seeders/
│       ├── StaffRatingConfigurationSeeder.php
│       └── StaffRatingPermissionSeeder.php
│
└── routes/
    └── api/staff-rating.php                          # NEW
```

### **API Endpoints:**

```php
// routes/api/staff-rating.php

Route::middleware(['auth:sanctum'])->prefix('staff-rating')->group(function () {

    // ═══════════════════════════════════════════════════════
    // DIRECTOR MANAGEMENT (RegionAdmin, RegionOperator, SektorAdmin)
    // ═══════════════════════════════════════════════════════
    Route::middleware(['role:regionadmin|regionoperator|sektoradmin'])->group(function () {
        Route::get('/directors', [DirectorManagementController::class, 'index']);
        Route::post('/directors', [DirectorManagementController::class, 'store']);
        Route::get('/directors/{user}', [DirectorManagementController::class, 'show']);
        Route::put('/directors/{user}', [DirectorManagementController::class, 'update']);
        Route::delete('/directors/{user}', [DirectorManagementController::class, 'destroy']);
        Route::post('/directors/bulk-assign', [DirectorManagementController::class, 'bulkAssign']);
    });

    // ═══════════════════════════════════════════════════════
    // RATING MANAGEMENT (Qarşılıqlı)
    // ═══════════════════════════════════════════════════════
    Route::middleware(['role:regionadmin|regionoperator|sektoradmin'])->group(function () {
        // Get all ratings for a staff member
        Route::get('/users/{user}/ratings', [StaffRatingController::class, 'getUserRatings']);

        // Create rating
        Route::post('/users/{user}/rating', [StaffRatingController::class, 'store']);

        // Update rating
        Route::put('/ratings/{rating}', [StaffRatingController::class, 'update']);

        // Delete rating
        Route::delete('/ratings/{rating}', [StaffRatingController::class, 'destroy']);

        // Get rating breakdown (auto-calculated details)
        Route::get('/ratings/{rating}/breakdown', [StaffRatingController::class, 'breakdown']);
    });

    // ═══════════════════════════════════════════════════════
    // RATING CONFIGURATION (RegionAdmin + SuperAdmin only)
    // ═══════════════════════════════════════════════════════
    Route::middleware(['role:regionadmin|superadmin'])->group(function () {
        Route::get('/configuration', [RatingConfigurationController::class, 'index']);
        Route::put('/configuration', [RatingConfigurationController::class, 'update']);
        Route::post('/configuration/reset', [RatingConfigurationController::class, 'reset']);
    });

    // ═══════════════════════════════════════════════════════
    // DASHBOARD & ANALYTICS
    // ═══════════════════════════════════════════════════════
    Route::get('/dashboard/overview', [RatingDashboardController::class, 'overview']);
    Route::get('/dashboard/top-performers', [RatingDashboardController::class, 'topPerformers']);
    Route::get('/dashboard/sector-comparison', [RatingDashboardController::class, 'sectorComparison']);
    Route::get('/dashboard/trends', [RatingDashboardController::class, 'trends']);

    // ═══════════════════════════════════════════════════════
    // MY RATING (Hər kəs öz reytinqini görür)
    // ═══════════════════════════════════════════════════════
    Route::get('/my-rating', [MyRatingController::class, 'show']);
    Route::get('/my-rating/history', [MyRatingController::class, 'history']);
    Route::get('/my-rating/breakdown', [MyRatingController::class, 'breakdown']);

    // ═══════════════════════════════════════════════════════
    // AUDIT LOGS (Transparency)
    // ═══════════════════════════════════════════════════════
    Route::get('/audit-logs', [RatingAuditController::class, 'index']);
    Route::get('/audit-logs/{user}', [RatingAuditController::class, 'userAuditLog']);
});
```

---

## 🎨 FRONTEND ARXİTEKTURA

### **Directory Structure:**

```
frontend/src/
├── pages/regionadmin/
│   ├── DirectorManagement.tsx                # Əsas səhifə (List + CRUD)
│   ├── StaffRatingDashboard.tsx              # Dashboard & Analytics
│   ├── RatingConfiguration.tsx               # Config (RegionAdmin only)
│   └── MyStaffRating.tsx                     # Personal rating page
│
├── components/staff-rating/
│   ├── DirectorTable.tsx                     # Directors cədvəli
│   ├── DirectorCard.tsx                      # Mobile card view
│   ├── DirectorModal.tsx                     # Director assign/edit modal
│   ├── RatingModal.tsx                       # Reytinq vermə modal
│   ├── RatingBreakdownCard.tsx               # Auto-calc breakdown
│   ├── RatingHistoryChart.tsx                # Tarixçə qrafiki (Line chart)
│   ├── RatingFilters.tsx                     # Filters (role, period, etc.)
│   ├── TopPerformersCard.tsx                 # Top 10 siyahısı
│   ├── SectorComparisonChart.tsx             # Sektor müqayisəsi
│   ├── ConfigurationForm.tsx                 # Weight configuration form
│   └── AuditLogTable.tsx                     # Audit log viewer
│
└── services/
    └── staffRating/
        ├── directorManagementService.ts      # Director CRUD
        ├── staffRatingService.ts             # Rating CRUD
        ├── ratingConfigService.ts            # Configuration
        ├── ratingDashboardService.ts         # Analytics
        └── myRatingService.ts                # Personal rating
```

### **Component Hierarchy:**

```
DirectorManagement.tsx
├── PageHeader (title, actions)
├── RatingFilters (search, role, period, sector)
├── DirectorTable
│   ├── DirectorCard (mobile)
│   └── Table Rows
│       ├── Rating Display (⭐4.5)
│       ├── Action Buttons
│       │   ├── View Details
│       │   ├── Give Rating
│       │   └── Edit Director Info
│       └── Quick Stats
└── DirectorModal (assign/edit)
    ├── User Selection (UTIS search)
    ├── Institution Assignment
    ├── Appointment Date
    └── Status Toggle

RatingModal.tsx
├── Target Info (name, role, institution)
├── Period Selection (month/quarter/year)
├── Category Selection
│   ├── Manual Categories
│   │   ├── Leadership
│   │   ├── Teamwork
│   │   ├── Communication
│   │   └── Initiative
│   └── Auto Categories (read-only display)
│       ├── Task Performance
│       ├── Survey Performance
│       ├── Document Activity
│       └── Link Management
├── Rating Input (0-5 stars, 0.5 step)
├── Notes (textarea)
├── Auto-Calculated Breakdown (if auto)
│   └── RatingBreakdownCard
└── Action Buttons (Save/Cancel)

StaffRatingDashboard.tsx
├── Summary Stats (Total Staff, Avg Rating, etc.)
├── TopPerformersCard
│   ├── Top 10 SchoolAdmins
│   ├── Top 10 SektorAdmins
│   └── Top 10 RegionOperators
├── SectorComparisonChart (Bar chart)
├── RatingTrendsChart (Line chart - monthly)
└── Recent Activity (Latest ratings)

MyStaffRating.tsx
├── Personal Rating Summary
│   ├── Current Score (large display)
│   ├── Rank within role
│   └── Comparison to average
├── Rating Breakdown
│   ├── Auto Components (detailed)
│   │   ├── Task Performance (graph)
│   │   ├── Survey Performance (graph)
│   │   ├── Document Activity (graph)
│   │   └── Link Management (graph)
│   └── Manual Components
│       ├── Leadership
│       ├── Teamwork
│       ├── Communication
│       └── Initiative
├── RatingHistoryChart (last 6 months)
└── Improvement Suggestions (AI-generated?)

RatingConfiguration.tsx (RegionAdmin Only)
├── Component Weights Configuration
│   ├── Task Performance Weight (slider 0-100%)
│   ├── Survey Performance Weight (slider)
│   ├── Document Activity Weight (slider)
│   └── Link Management Weight (slider)
│   └── Total: 100% validation
├── Calculation Period Settings
│   ├── Auto-calc Frequency (daily/weekly/monthly)
│   ├── Historical Period (how many months back)
│   └── Score Rounding Rules
├── Threshold Settings
│   ├── Minimum Tasks for Rating (e.g., 5 tasks)
│   ├── Minimum Surveys for Rating (e.g., 3 surveys)
│   └── Activity Requirements
└── Preview & Test
    └── Calculate Test Rating (sample user)
```

---

## ⚙️ AVTOMATİK HESABLAMA LOGİKASI (Detallı)

### **Service: AutomaticRatingCalculator.php**

```php
<?php

namespace App\Services\StaffRating;

use App\Models\User;
use App\Models\Task;
use App\Models\Survey;
use App\Models\Document;
use App\Models\LinkShare;
use App\Models\RatingConfiguration;
use Carbon\Carbon;

class AutomaticRatingCalculator
{
    protected $config;

    public function __construct()
    {
        // Load configurations
        $this->config = RatingConfiguration::whereIn('component_name', [
            'staff_task_performance',
            'staff_survey_performance',
            'staff_document_activity',
            'staff_link_management'
        ])->pluck('weight', 'component_name')->toArray();
    }

    /**
     * Calculate overall automatic rating for a user
     */
    public function calculateOverallRating(User $user, string $period): array
    {
        [$startDate, $endDate] = $this->parsePeriod($period);

        $taskScore = $this->calculateTaskPerformance($user, $startDate, $endDate);
        $surveyScore = $this->calculateSurveyPerformance($user, $startDate, $endDate);
        $documentScore = $this->calculateDocumentActivity($user, $startDate, $endDate);
        $linkScore = $this->calculateLinkManagement($user, $startDate, $endDate);

        // Weighted average
        $finalScore = (
            $taskScore['weighted_score'] +
            $surveyScore['weighted_score'] +
            $documentScore['weighted_score'] +
            $linkScore['weighted_score']
        );

        return [
            'final_score' => round($finalScore, 2),
            'task_performance' => $taskScore,
            'survey_performance' => $surveyScore,
            'document_activity' => $documentScore,
            'link_management' => $linkScore,
            'period' => $period,
            'calculated_at' => now()->toIso8601String()
        ];
    }

    /**
     * Calculate Task Performance Component
     */
    protected function calculateTaskPerformance(User $user, $start, $end): array
    {
        // Get tasks assigned to user in period
        $tasks = Task::where('assigned_to', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $total = $tasks->count();

        if ($total === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_task_performance'] ?? 0.40,
                'weighted_score' => 0,
                'message' => 'No tasks in this period'
            ];
        }

        $onTime = $tasks->filter(function($task) {
            return $task->status === 'completed' &&
                   $task->completed_at <= $task->deadline;
        })->count();

        $late = $tasks->filter(function($task) {
            return $task->status === 'completed' &&
                   $task->completed_at > $task->deadline;
        })->count();

        $incomplete = $tasks->whereIn('status', ['pending', 'in_progress'])->count();

        // Score formula: (onTime * 1.0 + late * 0.5 + incomplete * 0.0) / total * 5
        $rawScore = (($onTime * 1.0 + $late * 0.5) / $total) * 5;

        $weight = $this->config['staff_task_performance'] ?? 0.40;

        return [
            'total' => $total,
            'onTime' => $onTime,
            'late' => $late,
            'incomplete' => $incomplete,
            'onTimeRate' => round(($onTime / $total) * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2)
        ];
    }

    /**
     * Calculate Survey Performance Component
     */
    protected function calculateSurveyPerformance(User $user, $start, $end): array
    {
        // Get surveys targeted to user's role/institution in period
        $surveys = Survey::where(function($q) use ($user) {
            $q->whereJsonContains('target_roles', [$user->getRoleNames()->first()])
              ->orWhereJsonContains('target_institutions', [$user->institution_id]);
        })
        ->whereBetween('created_at', [$start, $end])
        ->where('status', 'published')
        ->get();

        $total = $surveys->count();

        if ($total === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_survey_performance'] ?? 0.30,
                'weighted_score' => 0,
                'message' => 'No surveys in this period'
            ];
        }

        $completed = $surveys->filter(function($survey) use ($user) {
            return $survey->responses()
                ->where('respondent_id', $user->id)
                ->where('status', 'completed')
                ->exists();
        })->count();

        $onTime = $surveys->filter(function($survey) use ($user) {
            $response = $survey->responses()
                ->where('respondent_id', $user->id)
                ->where('status', 'completed')
                ->first();

            return $response && $response->completed_at <= $survey->end_date;
        })->count();

        // Score: (completed/total * 0.7 + onTime/total * 0.3) * 5
        $rawScore = (($completed / $total) * 0.7 + ($onTime / $total) * 0.3) * 5;

        $weight = $this->config['staff_survey_performance'] ?? 0.30;

        return [
            'total' => $total,
            'completed' => $completed,
            'onTime' => $onTime,
            'completionRate' => round(($completed / $total) * 100, 1),
            'onTimeRate' => round(($onTime / $total) * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2)
        ];
    }

    /**
     * Calculate Document Activity Component
     */
    protected function calculateDocumentActivity(User $user, $start, $end): array
    {
        $uploads = Document::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $shares = Document::where('created_by', $user->id)
            ->has('shares')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $downloads = DocumentDownload::whereHas('document', function($q) use ($user) {
            $q->where('created_by', $user->id);
        })
        ->whereBetween('downloaded_at', [$start, $end])
        ->count();

        // Expected activity (configurable, default: 10 uploads, 5 shares per month)
        $expectedUploads = 10;
        $expectedShares = 5;

        // Score: (actual / expected) * 5, capped at 5
        $uploadScore = min(($uploads / $expectedUploads) * 5, 5);
        $shareScore = min(($shares / $expectedShares) * 5, 5);

        $rawScore = ($uploadScore * 0.6 + $shareScore * 0.4);

        $weight = $this->config['staff_document_activity'] ?? 0.20;

        return [
            'uploads' => $uploads,
            'shares' => $shares,
            'downloads' => $downloads,
            'uploadScore' => round($uploadScore, 2),
            'shareScore' => round($shareScore, 2),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2)
        ];
    }

    /**
     * Calculate Link Management Component
     */
    protected function calculateLinkManagement(User $user, $start, $end): array
    {
        $totalLinks = LinkShare::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        if ($totalLinks === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_link_management'] ?? 0.10,
                'weighted_score' => 0,
                'message' => 'No links in this period'
            ];
        }

        $activeLinks = LinkShare::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->where('is_active', true)
            ->whereNull('expires_at')
            ->orWhere('expires_at', '>', now())
            ->count();

        $accessCount = LinkAccessLog::whereHas('linkShare', function($q) use ($user) {
            $q->where('created_by', $user->id);
        })
        ->whereBetween('accessed_at', [$start, $end])
        ->count();

        // Score: (active/total * 0.6 + accessRate * 0.4) * 5
        $activeRate = $activeLinks / $totalLinks;
        $accessRate = min($accessCount / ($totalLinks * 5), 1); // Expected 5 access per link

        $rawScore = ($activeRate * 0.6 + $accessRate * 0.4) * 5;

        $weight = $this->config['staff_link_management'] ?? 0.10;

        return [
            'total' => $totalLinks,
            'active' => $activeLinks,
            'expired' => $totalLinks - $activeLinks,
            'access_count' => $accessCount,
            'activeRate' => round($activeRate * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2)
        ];
    }

    /**
     * Parse period string to date range
     */
    protected function parsePeriod(string $period): array
    {
        // Period formats:
        // - '2024-12' (month)
        // - '2024-Q4' (quarter)
        // - '2024' (year)

        if (preg_match('/^(\d{4})-(\d{2})$/', $period, $matches)) {
            // Monthly
            $year = $matches[1];
            $month = $matches[2];
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
        } elseif (preg_match('/^(\d{4})-Q([1-4])$/', $period, $matches)) {
            // Quarterly
            $year = $matches[1];
            $quarter = $matches[2];
            $month = ($quarter - 1) * 3 + 1;
            $start = Carbon::create($year, $month, 1)->startOfQuarter();
            $end = $start->copy()->endOfQuarter();
        } elseif (preg_match('/^(\d{4})$/', $period)) {
            // Yearly
            $year = $period;
            $start = Carbon::create($year, 1, 1)->startOfYear();
            $end = $start->copy()->endOfYear();
        } else {
            throw new \InvalidArgumentException("Invalid period format: {$period}");
        }

        return [$start, $end];
    }
}
```

---

## 📊 İMPLEMENTASİYA TİMELİNE (13-18 GÜN)

### **FAZA 1: Database & Migrations (2-3 gün)**
**Status:** ⏳ Pending
**Təsvir:** Production-safe migrations

#### Tasks:
1. ✅ Create `staff_ratings` migration
2. ✅ Create `staff_rating_audit_logs` migration
3. ✅ Update `region_operator_permissions` (add rating columns)
4. ✅ Seed `rating_configuration` (staff components)
5. ✅ Test migrations (rollback/migrate)
6. ✅ Create permission seeder (rating permissions)

**Deliverables:**
- 3 migration files
- 2 seeder files
- Migration test script

---

### **FAZA 2: Backend Models & Core Services (3-4 gün)**
**Status:** ⏳ Pending
**Təsvir:** Əsas backend məntiqi

#### Tasks:
1. ✅ Create `StaffRating` model + relationships
2. ✅ Create `StaffRatingAuditLog` model
3. ✅ Update `Institution` model (director metadata helpers)
4. ✅ Create `AutomaticRatingCalculator` service
   - Task performance logic
   - Survey performance logic
   - Document activity logic
   - Link management logic
5. ✅ Create `ManualRatingService`
6. ✅ Create `RatingAuditService`
7. ✅ Create `DirectorManagementService`

**Deliverables:**
- 2 models
- 7 service classes
- Unit tests (50+ tests)

---

### **FAZA 3: Backend API Controllers (2-3 gün)**
**Status:** ⏳ Pending
**Təsvir:** API endpoint-lər

#### Tasks:
1. ✅ `DirectorManagementController` (CRUD)
2. ✅ `StaffRatingController` (rating CRUD)
3. ✅ `RatingConfigurationController` (config)
4. ✅ `RatingDashboardController` (analytics)
5. ✅ `MyRatingController` (personal view)
6. ✅ `RatingAuditController` (audit logs)
7. ✅ Create request validation classes (5 files)
8. ✅ Setup routes (`api/staff-rating.php`)

**Deliverables:**
- 6 controllers
- 5 request validation classes
- 1 route file
- API tests (30+ tests)

---

### **FAZA 4: CRON Job & Auto-Calc (1-2 gün)**
**Status:** ⏳ Pending
**Təsvir:** Avtomatik hesablama

#### Tasks:
1. ✅ Create `CalculateStaffRatings` command
2. ✅ Schedule in `Kernel.php` (daily at 02:00)
3. ✅ Add notification system (rating calculated)
4. ✅ Test CRON manually

**Deliverables:**
- 1 console command
- Kernel schedule configuration
- Test script

---

### **FAZA 5: Frontend Core Pages (3-4 gün)**
**Status:** ⏳ Pending
**Təsvir:** Əsas səhifələr

#### Tasks:
1. ✅ `DirectorManagement.tsx` (list + CRUD)
2. ✅ `StaffRatingDashboard.tsx` (analytics)
3. ✅ `RatingConfiguration.tsx` (config page)
4. ✅ `MyStaffRating.tsx` (personal rating)
5. ✅ Create service layer (4 services)
6. ✅ Add navigation links

**Deliverables:**
- 4 pages
- 4 services
- Navigation updates

---

### **FAZA 6: Frontend Components (2-3 gün)**
**Status:** ⏳ Pending
**Təsvir:** Reusable components

#### Tasks:
1. ✅ `DirectorTable` + `DirectorCard`
2. ✅ `DirectorModal` (assign/edit)
3. ✅ `RatingModal` (give rating)
4. ✅ `RatingBreakdownCard` (auto details)
5. ✅ `RatingHistoryChart` (recharts)
6. ✅ `TopPerformersCard`
7. ✅ `SectorComparisonChart`
8. ✅ `ConfigurationForm`
9. ✅ `AuditLogTable`
10. ✅ `RatingFilters`

**Deliverables:**
- 10 components
- TypeScript interfaces
- Component tests

---

### **FAZA 7: Testing & Quality Assurance (2-3 gün)**
**Status:** ⏳ Pending
**Təsvir:** Comprehensive testing

#### Tasks:
1. ✅ Backend unit tests (80+ tests)
2. ✅ Backend integration tests (20+ tests)
3. ✅ Frontend component tests (30+ tests)
4. ✅ E2E workflow testing
   - Director assignment flow
   - Manual rating flow
   - Auto-calc verification
   - Config update flow
   - My rating view flow
5. ✅ Permission testing (all roles)
6. ✅ Performance testing (100+ users)

**Deliverables:**
- 130+ tests
- Test coverage report (>80%)
- Performance benchmarks

---

### **FAZA 8: Documentation & Deployment (1-2 gün)**
**Status:** ⏳ Pending
**Təsvir:** Final touches

#### Tasks:
1. ✅ API documentation (Swagger/Postman)
2. ✅ User guide (Azerbaijani)
3. ✅ Developer documentation
4. ✅ Create demo data seeder
5. ✅ Production deployment checklist
6. ✅ Backup plan
7. ✅ Deploy to production

**Deliverables:**
- API docs
- 2 user guides (RegionAdmin, Staff)
- Developer guide
- Deployment script

---

## 🔐 PRODUCTION TƏHLÜKƏSİZLİK & PERFORMANS

### **Təhlükəsizlik:**

1. **Authorization Matrix:**
```typescript
const canRateUser = (rater: User, target: User): boolean => {
  // SuperAdmin can rate anyone
  if (rater.role === 'superadmin') return true;

  // RegionAdmin can rate within their region
  if (rater.role === 'regionadmin') {
    return target.institution.region_id === rater.institution.region_id;
  }

  // RegionOperator can rate assigned sectors
  if (rater.role === 'regionoperator') {
    const assignedSectors = rater.region_operator_permissions.assigned_sectors;
    return assignedSectors.includes(target.institution.sector_id);
  }

  // SektorAdmin can rate within their sector
  if (rater.role === 'sektoradmin') {
    return target.institution.sector_id === rater.institution.sector_id;
  }

  return false;
};
```

2. **Data Protection:**
- ✅ SQL Injection: Eloquent ORM + Prepared Statements
- ✅ XSS: React auto-escaping + DOMPurify
- ✅ CSRF: Laravel Sanctum tokens
- ✅ Rate Limiting: 100 req/min per user
- ✅ Audit Logging: 100% CRUD operations

3. **Privacy:**
- ✅ Users can only see own full rating details
- ✅ Others see summary only (no breakdown)
- ✅ Rater identity visible (transparency)

### **Performans:**

1. **Database Optimization:**
```sql
-- Critical indexes
CREATE INDEX idx_staff_ratings_lookup ON staff_ratings(staff_user_id, period, is_latest);
CREATE INDEX idx_staff_ratings_leaderboard ON staff_ratings(period, score DESC, rating_type);
CREATE INDEX idx_audit_recent ON staff_rating_audit_logs(created_at DESC, staff_user_id);
```

2. **Caching Strategy:**
```php
// Redis caching (5 min TTL)
$cacheKey = "staff_rating:{$userId}:{$period}:overall";
$rating = Cache::remember($cacheKey, 300, function() use ($userId, $period) {
    return StaffRating::where('staff_user_id', $userId)
        ->where('period', $period)
        ->where('rating_type', 'automatic')
        ->where('category', 'overall')
        ->first();
});
```

3. **Query Optimization:**
- ✅ Eager loading: `with(['user', 'institution', 'rater'])`
- ✅ Pagination: 20/50/100 per page
- ✅ Select specific columns: avoid `SELECT *`

4. **Frontend Performance:**
- ✅ Virtual scrolling (large lists)
- ✅ Debounced search (300ms)
- ✅ Lazy loading (modals, charts)
- ✅ Memoization (React.memo, useMemo)

---

## 📝 DEVELOPMENT NOTES

### **Technical Decisions:**

1. **Metadata vs Separate Table:**
   - ✅ **QƏRAR:** institutions.metadata (JSON)
   - **Səbəb:** Production-safe, no migration risk, flexible

2. **Rating Configuration:**
   - ✅ **Re-use:** Teacher Rating-dən `rating_configuration`
   - **Səbəb:** Centralized config, consistent UX

3. **Auto-Calc Frequency:**
   - ✅ **QƏRAR:** Daily CRON (02:00 AM)
   - **Səbəb:** Fresh data, low server load time

4. **Manual Rating Categories:**
   - ✅ **Fixed:** leadership, teamwork, communication, initiative
   - **Səbəb:** Standardization, easier comparison

5. **Period Formats:**
   - ✅ **Support:** 2024-12 (month), 2024-Q4 (quarter), 2024 (year)
   - **Səbəb:** Flexibility for different analysis needs

---

## ✅ ACCEPTANCE CRİTERİA

### **Backend:**
- [ ] All migrations run successfully (up/down)
- [ ] Models have proper relationships
- [ ] Auto-calc produces correct scores (tested)
- [ ] API endpoints return expected responses
- [ ] Permission checks work correctly
- [ ] CRON job runs without errors
- [ ] Audit logs capture all changes
- [ ] 80%+ test coverage

### **Frontend:**
- [ ] Director assignment works
- [ ] Rating submission works (manual)
- [ ] Auto-calc breakdown displays correctly
- [ ] Dashboard shows accurate stats
- [ ] My Rating page loads
- [ ] Config page updates weights
- [ ] Filters work correctly
- [ ] Mobile responsive

### **Integration:**
- [ ] RegionAdmin can configure
- [ ] RegionOperator can rate assigned staff
- [ ] SektorAdmin can rate directors
- [ ] Directors see own rating
- [ ] Auto-calc matches manual test
- [ ] Audit log records all actions

---

## 🚀 DEPLOYMENT PLANİ

### **Pre-Deployment:**
1. Backup production database
2. Test migrations on staging
3. Verify CRON job timing
4. Review permission assignments
5. Prepare rollback script

### **Deployment Steps:**
```bash
# 1. Maintenance mode
php artisan down --message="System upgrade - Staff Rating module"

# 2. Backup
pg_dump atis_prod > backup_pre_staff_rating_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull code
git pull origin feature/staff-rating-system

# 4. Dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 5. Migrations
php artisan migrate --force

# 6. Seed configurations
php artisan db:seed --class=StaffRatingConfigurationSeeder --force
php artisan db:seed --class=StaffRatingPermissionSeeder --force

# 7. Cache clear
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 8. Cache warmup
php artisan config:cache
php artisan route:cache

# 9. Test CRON
php artisan staff:calculate-ratings --test

# 10. Exit maintenance
php artisan up

# 11. Monitor logs
tail -f storage/logs/laravel.log
```

### **Post-Deployment:**
1. Verify all pages load
2. Test rating submission
3. Check auto-calc results
4. Monitor performance
5. Collect user feedback
6. Address any issues

---

## 🆘 TROUBLESHOOTING

### **Common Issues:**

1. **Auto-calc returns 0:**
   - Check date range parsing
   - Verify configuration weights
   - Ensure tasks/surveys exist in period

2. **Permission denied:**
   - Verify role assignment
   - Check permission seeder ran
   - Clear permission cache

3. **CRON not running:**
   - Check schedule in Kernel.php
   - Verify cron daemon is running
   - Check logs for errors

4. **Slow dashboard:**
   - Enable Redis caching
   - Add missing indexes
   - Optimize queries with eager loading

---

## 📞 SUPPORT & FEEDBACK

### **Developer Contact:**
- Claude Code (AI Assistant)
- Documentation: `/docs/staff-rating-system.md`

### **User Support:**
- RegionAdmin guide: `/docs/user-guides/staff-rating-regionadmin.pdf`
- Staff guide: `/docs/user-guides/staff-rating-staff.pdf`

---

**🎯 PLAN HAZIRLAYAN:** Claude Code
**📅 TARİX:** 2025-12-28
**📌 VERSİYA:** 2.0 (Final - Mövcud sistemə əsaslanan)
**✅ STATUS:** Implementation Ready

---

**QEYD:** Bu plan mövcud ATİS arxitekturasına tam uyğunlaşdırılmışdır və production-safe yanaşma tətbiq edilmişdir.
