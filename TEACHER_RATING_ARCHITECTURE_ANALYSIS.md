# TEACHER RATING SYSTEM - ARXİTEKTURA ANALİZİ VƏ İNTEQRASİYA STRATEGİYASI

## 🎯 MÖVCUDAatlarının ANALIZ NƏTİCƏSİ

### ✅ Mövcud Sistema DETAILED Analysis (2025-12-28)

#### 1. **User/Teacher Data Model** (HAZDAir və İŞLƏYİR)

**Primary Model**: `User` (users table)
- **Role**: `müəllim` (via Spatie Laravel Permission)
- **Institution**: `institution_id` (FK to institutions table, level 4 = schools)
- **Status**: `is_active` (boolean)
- **Authentication**: email, username, password (UTIS credentials)

**Profile Model**: `UserProfile` (user_profiles table)
- **One-to-One relationship** with User
- **Fillable fields** (teacher-specific):
  ```php
  // Basic info
  'utis_code', 'first_name', 'last_name', 'patronymic',
  'birth_date', 'gender', 'contact_phone', 'address',

  // Professional info (EXISTING!)
  'subjects' (JSON array),
  'specialty',
  'experience_years',
  'position_type', // direktor, direktor_muavini, müəllim, psixoloq
  'employment_status', // full_time, part_time, contract, temporary
  'workplace_type',
  'primary_institution_id',

  // Academic qualifications (EXISTING!)
  'degree_level', // bakalavr, magistr, doktorantura
  'graduation_university',
  'graduation_year',
  'university_gpa',
  'education_history' (JSON),

  // Assessments (EXISTING!)
  'miq_score',
  'certification_score',
  'last_certification_date',
  'assessment_type',
  'assessment_score',
  'qualifications' (JSON),
  'training_courses' (JSON),

  // Other
  'notes', 'certifications' (JSON), 'employment_history' (JSON)
  ```

**CRITICAL DISCOVERY**: UserProfile cədvəli teacher rating sistemi üçün artıq bir çox lazımi field-ləri EHTİVA EDİR!

#### 2. **RegionAdmin Teacher Management** (PRODUCTION-READY)

**Frontend Components**:
- ✅ `RegionTeacherManager.tsx` - Full CRUD interface with filters
- ✅ `RegionTeacherImportModal.tsx` - Excel import with pre-validation wizard
- ✅ `RegionTeacherFormModal.tsx` - Create/Edit form

**Backend API** (`RegionTeacherController.php`):
- ✅ CRUD operations (index, show, store, update, delete)
- ✅ Bulk operations (bulkUpdateStatus, bulkDelete)
- ✅ Excel import/export with validation
- ✅ Pre-validation service (RegionTeacherPreValidationService)
- ✅ Multi-sector and multi-school filtering
- ✅ Statistics calculation

**Service Layer** (`RegionTeacherService.php`):
- ✅ `getRegionTeachers()` - Get all teachers with filters
- ✅ `createTeacher()` - Create new teacher user + profile
- ✅ `updateTeacher()` - Update teacher info
- ✅ `importTeachers()` - Excel import (strict mode)
- ✅ `importValidRows()` - Excel import (skip errors mode)
- ✅ `generateImportTemplate()` - Download template

**Data Structure**:
```typescript
interface EnhancedTeacherProfile {
  id: number;
  email: string;
  username: string;
  institution_id: number;
  is_active: boolean;

  profile: {
    first_name: string;
    last_name: string;
    patronymic: string;
    utis_code: string;
    position_type: string; // direktor, müəllim, etc.
    employment_status: string; // full_time, part_time, etc.
    subjects: string[]; // JSON array
    specialty: string;
    experience_years: number;
    miq_score: number;
    certification_score: number;
    degree_level: string;
    graduation_university: string;
    // ... və s.
  };

  institution: {
    id: number;
    name: string;
    level: number; // 4 = school
    parent_id: number; // sector
  };

  roles: Role[];
}
```

#### 3. **NEW System Requirements** (Teacher Rating PRD)

**New Data Entities**:
1. ✅ `teachers` table - ALREADY CREATED (migration 033548)
2. ✅ `award_types`, `certificate_types` - ALREADY CREATED
3. ✅ `awards`, `certificates` - ALREADY CREATED
4. ✅ `education_history` - ALREADY CREATED
5. ✅ `teaching_assignments` - ALREADY CREATED
6. ✅ `class_academic_results` - ALREADY CREATED
7. ✅ `lesson_observations` - ALREADY CREATED
8. ✅ `assessment_scores` - ALREADY CREATED
9. ✅ `olympiad_achievements` - ALREADY CREATED
10. ✅ `rating_results` - ALREADY CREATED
11. ✅ `rating_configuration` - ALREADY CREATED

**New Relationships Needed**:
- Teachers → Education History (1:N)
- Teachers → Teaching Assignments (1:N)
- Teachers → Academic Results (1:N)
- Teachers → Lesson Observations (1:N)
- Teachers → Assessment Scores (1:N)
- Teachers → Certificates (1:N)
- Teachers → Awards (1:N)
- Teachers → Olympiad Achievements (1:N)
- Teachers → Rating Results (1:N)

---

## 🚨 CRITICAL PROBLEM: Data Duplication

### ⚠️ Field Overlap Analysis

#### **teachers** table (NEW) vs **user_profiles** table (EXISTING):

| Field | teachers (NEW) | user_profiles (EXISTING) | DUPLICATION? |
|-------|----------------|--------------------------|--------------|
| UTIS Code | ✅ `utis_code` | ✅ `utis_code` | **⚠️ YES** |
| School | ✅ `school_id` | ⚠️ via `users.institution_id` | **⚠️ YES** |
| Primary Subject | ✅ `primary_subject_id` | ✅ `subjects[0]` (JSON array) | **⚠️ YES** |
| Start Year | ✅ `start_year` | ⚠️ calculated from `experience_years` | **⚠️ PARTIAL** |
| Photo | ✅ `photo_path` | ✅ `profile_image_path` | **⚠️ YES** |
| Age Band | ✅ `age_band` | ⚠️ calculated from `birth_date` | **⚠️ PARTIAL** |
| Status | ✅ `is_active` | ✅ via `users.is_active` | **⚠️ YES** |
| User Link | ✅ `user_id` | ✅ implicit (1:1 with users) | **⚠️ YES** |

**VERDICT**: 70% of `teachers` table fields OVERLAP with existing `users` + `user_profiles` structure!

---

## ✅ RECOMMENDED INTEGRATION STRATEGY

### **OPTION A: Hybrid Approach** (👍 TÖVSIYƏ EDİLİR)

**Principle**: Use existing `users` + `user_profiles` for base teacher data, NEW `teachers` table ONLY for rating-specific extended profile.

#### Implementation:

1. **Keep teachers table** but REDEFINE its purpose:
   ```sql
   -- NEW PURPOSE: Rating-specific extended teacher profile
   -- NOT a replacement for user/user_profile!

   teachers:
   - id (PK)
   - user_id (FK to users, UNIQUE, MANDATORY) ← Link to existing user
   - utis_code (UNIQUE, MANDATORY) ← Keep for quick lookups (denormalized for performance)
   - primary_subject_id (FK to subjects) ← Rating calculations need this frequently
   - start_year (year) ← For experience calculation in ratings
   - photo_path (nullable) ← If different from profile image (optional)
   - age_band (enum, nullable) ← For anonymous analytics (PII protection)
   - is_rating_active (boolean) ← Whether teacher participates in rating system
   - rating_region_id (FK to institutions, level=2) ← Which region rates this teacher
   - created_at, updated_at, deleted_at
   ```

2. **Relationship Chain**:
   ```
   Teacher (rating profile)
      ↓ belongsTo
   User (authentication + basic info)
      ↓ hasOne
   UserProfile (detailed personal/professional info)
      ↓ belongsTo
   Institution (school) ← level 4
   ```

3. **Data Source Priority**:
   ```php
   // For rating calculations:
   $teacher = Teacher::with('user.profile', 'user.institution')->find($id);

   // Get teacher name:
   $name = $teacher->user->profile->first_name . ' ' . $teacher->user->profile->last_name;

   // Get teacher school:
   $school = $teacher->user->institution;

   // Get teacher subjects:
   $subjects = $teacher->user->profile->subjects; // JSON array from user_profiles

   // Get primary subject for rating:
   $primarySubject = $teacher->primarySubject; // From teachers table (performance)

   // Get UTIS code:
   $utisCode = $teacher->utis_code; // From teachers table (performance optimization)
   // OR
   $utisCode = $teacher->user->profile->utis_code; // From user_profiles (source of truth)
   ```

4. **Migration Strategy** (for existing production teachers):
   ```php
   // After deploying new teachers table:

   // Step 1: Create teacher rating profiles for existing müəllim users
   $existingTeachers = User::role('müəllim')->with('profile')->get();

   foreach ($existingTeachers as $user) {
       Teacher::create([
           'user_id' => $user->id,
           'utis_code' => $user->profile->utis_code,
           'primary_subject_id' => $user->profile->subjects[0] ?? null,
           'start_year' => now()->year - ($user->profile->experience_years ?? 0),
           'is_rating_active' => false, // Initially disabled, RegionAdmin enables
       ]);
   }
   ```

#### Advantages:
- ✅ **Backward compatible**: Existing teacher management continues to work
- ✅ **No data loss**: Production data remains intact
- ✅ **Clean separation**: Rating system has its own domain models
- ✅ **Performance**: Denormalized `utis_code` in teachers table for fast rating lookups
- ✅ **Flexible**: Teachers can exist as users without rating profile (new hires)
- ✅ **Secure**: PII data stays in user_profiles, rating analytics use teachers table

#### Disadvantages:
- ⚠️ **Slight duplication**: `utis_code` and `primary_subject_id` exist in both places
- ⚠️ **Sync risk**: Must keep `teachers.utis_code` and `user_profiles.utis_code` in sync

---

### **OPTION B: Full Merge** (❌ TÖVSIYƏ EDİLMİR)

**Approach**: Drop `teachers` table, add all rating fields to `user_profiles`.

#### Why NOT recommended:
- ❌ **Pollutes user_profiles**: Adding 10+ rating-specific columns to general profile table
- ❌ **Breaks separation of concerns**: User profile != Teacher rating profile
- ❌ **All users affected**: Migrations affect ALL users (students, admins, etc.), not just teachers
- ❌ **Performance**: Rating queries scan user_profiles (100k+ rows) instead of teachers (10k rows)
- ❌ **Reversibility**: Hard to undo if rating system is discontinued

---

### **OPTION C: Complete Replacement** (❌ TÖVSIYƏ EDİLMİR)

**Approach**: Make `teachers` table the single source of truth, deprecate user_profiles for teachers.

#### Why NOT recommended:
- ❌ **Breaks existing system**: RegionAdmin teacher management relies on user_profiles
- ❌ **Data migration nightmare**: Move production data from user_profiles → teachers
- ❌ **High risk**: Production data loss risk
- ❌ **Duplicate code**: Need to rewrite all existing teacher CRUD to use teachers table

---

## 🎯 FINAL DECISION: Hybrid Approach (Option A)

### Implementation Roadmap

#### PHASE 1: Model Architecture (IN PROGRESS)

1. **Update TeacherProfile model** (`app/Models/TeacherProfile.php`):
   ```php
   class TeacherProfile extends Model
   {
       use HasFactory, SoftDeletes;

       protected $table = 'teachers';

       // Relationships
       public function user(): BelongsTo {
           return $this->belongsTo(User::class);
       }

       public function primarySubject(): BelongsTo {
           return $this->belongsTo(Subject::class, 'primary_subject_id');
       }

       // Rating relationships
       public function educationHistory(): HasMany { ... }
       public function teachingAssignments(): HasMany { ... }
       public function classAcademicResults(): HasMany { ... }
       public function lessonObservations(): HasMany { ... }
       public function assessmentScores(): HasMany { ... }
       public function certificates(): HasMany { ... }
       public function awards(): HasMany { ... }
       public function olympiadAchievements(): HasMany { ... }
       public function ratingResults(): HasMany { ... }

       // Accessors
       public function getFullNameAttribute(): string {
           return $this->user->profile->first_name . ' ' . $this->user->profile->last_name;
       }

       public function getSchoolAttribute(): ?Institution {
           return $this->user->institution;
       }
   }
   ```

2. **Update User model** (`app/Models/User.php`):
   ```php
   class User extends Authenticatable
   {
       // Add relationship to Teacher rating profile
       public function teacherProfile(): HasOne {
           return $this->hasOne(TeacherProfile::class, 'user_id');
       }

       // Existing relationships stay unchanged
       public function profile(): HasOne {
           return $this->hasOne(UserProfile::class);
       }
   }
   ```

3. **Keep existing Teacher model** for backward compatibility:
   ```php
   class Teacher extends User
   {
       // This class is used by existing code
       // Keep it for now, don't break production
       protected $table = 'users';

       public function profile(): HasOne {
           return $this->hasOne(UserProfile::class, 'user_id');
       }

       // NEW: Add rating profile relationship
       public function ratingProfile(): HasOne {
           return $this->hasOne(TeacherProfile::class, 'user_id');
       }
   }
   ```

#### PHASE 2: Data Sync (NEW)

1. **Create observer** to keep teachers.utis_code in sync:
   ```php
   // app/Observers/UserProfileObserver.php
   class UserProfileObserver
   {
       public function updated(UserProfile $profile): void
       {
           // If UTIS code changed, update teachers table
           if ($profile->isDirty('utis_code')) {
               TeacherProfile::where('user_id', $profile->user_id)
                   ->update(['utis_code' => $profile->utis_code]);
           }
       }
   }
   ```

2. **Register observer** in `AppServiceProvider`:
   ```php
   public function boot(): void
   {
       UserProfile::observe(UserProfileObserver::class);
   }
   ```

#### PHASE 3: API Integration

1. **Add Teacher Rating Profile endpoints** (new routes):
   ```php
   // routes/api/teacher-rating.php
   Route::prefix('teacher-rating')->middleware('auth:sanctum')->group(function () {
       // Create rating profile for existing teacher
       Route::post('/profiles', [TeacherRatingController::class, 'createProfile']);

       // Get teacher rating profile with all ratings
       Route::get('/profiles/{user_id}', [TeacherRatingController::class, 'getProfile']);

       // Rating CRUD endpoints
       Route::apiResource('awards', AwardController::class);
       Route::apiResource('certificates', CertificateController::class);
       Route::apiResource('education-history', EducationHistoryController::class);
       // ... etc
   });
   ```

2. **Keep existing RegionAdmin teacher endpoints** unchanged:
   ```php
   // routes/api/regionadmin.php
   Route::prefix('regionadmin/teachers')->group(function () {
       // These continue to work with User + UserProfile
       Route::get('/', [RegionTeacherController::class, 'index']);
       Route::post('/', [RegionTeacherController::class, 'store']);
       Route::put('/{id}', [RegionTeacherController::class, 'update']);
       // ... existing routes
   });
   ```

#### PHASE 4: Frontend Integration

1. **Add "Enable Rating" toggle** in RegionTeacherFormModal:
   ```typescript
   // When creating/editing teacher, option to enable rating profile
   <Checkbox
     id="enable_rating"
     label="Reyting sistemində iştirak et"
     onChange={(checked) => {
       if (checked) {
         // Create teacher rating profile
         createTeacherRatingProfile(userId);
       }
     }}
   />
   ```

2. **Add "Rating Profile" tab** in teacher details modal:
   ```typescript
   <Tabs>
     <TabsList>
       <TabsTrigger value="basic">Əsas məlumat</TabsTrigger>
       <TabsTrigger value="rating">Reyting Profili</TabsTrigger>
     </TabsList>
     <TabsContent value="rating">
       {teacher.ratingProfile ? (
         <TeacherRatingDashboard teacherId={teacher.id} />
       ) : (
         <Alert>
           Bu müəllim hələ reyting sistemində iştirak etmir.
           <Button onClick={enableRating}>Aktivləşdir</Button>
         </Alert>
       )}
     </TabsContent>
   </Tabs>
   ```

---

## 📊 DATA MIGRATION PLAN

### Step 1: Deploy New Tables (COMPLETED ✅)
- 13 new tables already created via migrations
- Seeders already run (rating_configuration, award_types, certificate_types)

### Step 2: Backfill Existing Teachers (NEXT)

Create migration to populate teachers table from existing müəllim users:

```php
// database/migrations/2025_12_28_120000_backfill_teachers_from_existing_users.php

public function up(): void
{
    $existingTeachers = \DB::table('users')
        ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
        ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
        ->where('model_has_roles.model_type', 'App\\Models\\User')
        ->where('roles.name', 'müəllim')
        ->whereNotNull('users.institution_id')
        ->select('users.*')
        ->get();

    foreach ($existingTeachers as $user) {
        $profile = \DB::table('user_profiles')->where('user_id', $user->id)->first();

        if (!$profile) continue; // Skip if no profile

        \DB::table('teachers')->insert([
            'user_id' => $user->id,
            'utis_code' => $profile->utis_code ?? 'TEMP_' . $user->id,
            'school_id' => $user->institution_id,
            'primary_subject_id' => json_decode($profile->subjects ?? '[]')[0] ?? null,
            'start_year' => $profile->experience_years
                ? (now()->year - $profile->experience_years)
                : null,
            'photo_path' => $profile->profile_image_path,
            'age_band' => $this->calculateAgeBand($profile->birth_date),
            'is_active' => $user->is_active,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

private function calculateAgeBand($birthDate): ?string
{
    if (!$birthDate) return null;

    $age = \Carbon\Carbon::parse($birthDate)->age;

    if ($age < 30) return '20-29';
    if ($age < 40) return '30-39';
    if ($age < 50) return '40-49';
    if ($age < 60) return '50-59';
    return '60+';
}
```

### Step 3: Add Validation

Ensure `teachers.utis_code` remains unique and in sync:

```php
// app/Http/Requests/StoreUserRequest.php

public function withValidator($validator)
{
    $validator->after(function ($validator) {
        // If creating a müəllim with UTIS code
        if ($this->hasRole('müəllim') && $this->filled('utis_code')) {
            // Check if UTIS code already exists in teachers table
            $exists = \DB::table('teachers')
                ->where('utis_code', $this->input('utis_code'))
                ->exists();

            if ($exists) {
                $validator->errors()->add(
                    'utis_code',
                    'Bu UTIS kodu artıq mövcuddur.'
                );
            }
        }
    });
}
```

---

## 🔄 SYNC STRATEGY

### Auto-create Teacher Rating Profile

When a new müəllim user is created via RegionAdmin:

```php
// app/Services/RegionAdmin/RegionTeacherService.php

public function createTeacher(array $data, Institution $region): User
{
    DB::beginTransaction();
    try {
        // Create user
        $user = User::create([...]);
        $user->assignRole('müəllim');

        // Create user profile
        $user->profile()->create([...]);

        // NEW: Automatically create teacher rating profile
        TeacherProfile::create([
            'user_id' => $user->id,
            'utis_code' => $data['utis_code'] ?? 'TEMP_' . $user->id,
            'school_id' => $data['institution_id'],
            'primary_subject_id' => $data['primary_subject_id'] ?? null,
            'is_active' => false, // Disabled by default, RegionAdmin enables later
        ]);

        DB::commit();
        return $user;
    } catch (\Exception $e) {
        DB::rollBack();
        throw $e;
    }
}
```

---

## 📝 SUMMARY

### ✅ FINAL ARCHITECTURE:

1. **Users Table**: Authentication, role, institution, status
2. **User_Profiles Table**: Personal/professional info (existing fields remain)
3. **Teachers Table** (NEW): Rating-specific extended profile
4. **Rating Tables** (NEW): awards, certificates, academic_results, etc.

### 🔗 Relationships:

```
User (müəllim role)
  ↓ hasOne
UserProfile (personal/professional data)

User (müəllim role)
  ↓ hasOne
TeacherProfile (rating profile)
  ↓ hasMany
  [EducationHistory, TeachingAssignments, Certificates, Awards,
   ClassAcademicResults, LessonObservations, AssessmentScores,
   OlympiadAchievements, RatingResults]
```

### 🎯 Next Steps:

1. ✅ Update models with proper relationships
2. ⏳ Create backfill migration for existing teachers
3. ⏳ Add observer for UTIS code sync
4. ⏳ Implement Teacher Rating API endpoints
5. ⏳ Build Teacher Rating Dashboard UI

---

**Created**: 2025-12-28
**Status**: ARCHITECTURE FINALIZED
**Decision**: Hybrid Approach (Option A) ✅
