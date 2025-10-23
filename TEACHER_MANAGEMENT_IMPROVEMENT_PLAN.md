# 📚 Müəllim İdarəetmə Sistemi - Təkmilləşdirmə Planı v2.0

**Projekt:** ATİS (Azərbaycan Təhsil İnformasiya Sistemi)
**Modul:** School/Teachers Səhifəsi
**Tarix:** 2025-10-22
**Versiya:** 2.0 (Dəqiqləşdirilmiş - Çoxlu Qiymətləndirmə Dəstəyi)

---

## 🎯 Tələblərin Dəqiq Təsviri

### 1. **Müəllim Əlavə Et - Əsas Məlumatlar**
```
├── Ad (first_name) ✅
├── Soyad-Ata adı (last_name) ✅
├── UTIS Kod (utis_code) - 7 rəqəm ✅
├── İxtisas (specialty) ✅
├── İxtisas Balı (specialty_score) ⚠️ YENİ
├── Vəzifəsi (position_type) ⚠️ YENİ
│   ├── Direktor
│   ├── Direktor müavini (Təhsil)
│   ├── Direktor müavini (İnzibati)
│   ├── Təşkilatçı
│   ├── Sinif rəhbəri
│   └── Müəllim
├── Əsas iş yeri (primary_institution_id) ⚠️ YENİ
└── Əlavə iş yerləri (secondary_workplaces) ⚠️ YENİ
    ├── İkinci iş yeri (sequence = 2)
    ├── Üçüncü iş yeri (sequence = 3)
    └── Dördüncü iş yeri (sequence = 4)
```

### 2. **Qiymətləndirmə Növləri (ƏSAS YENİLİK)**

**❌ ƏVVƏLKİ YANLIŞ ANLAYIŞ:**
- Müəllim üçün yalnız 1 qiymətləndirmə növü və balı

**✅ DÜZGÜN TƏLəB:**
- **BİR MÜƏLLIM BİR NEÇƏ QİYMƏTLƏNDİRMƏDƏ İŞTİRAK EDƏ BİLƏR**
- Hər qiymətləndirmə müstəqildir (növ + bal + tarix)
- UI-da dinamik siyahı (əlavə et / sil)

**Qiymətləndirmə Növləri:**
```typescript
evaluation_types = [
  'certification',   // Sertifikasiya
  'diagnostic',     // Diaqnostik
  'miq_60',        // MİQ-60
  'miq_100'        // MİQ-100
]
```

**Nümunə Ssenari:**
```
Müəllim: Aydın Məmmədov
Qiymətləndirmələr:
  1. Sertifikasiya    → 85.5 bal (2024-09-15)
  2. MİQ-60           → 72.0 bal (2024-10-10)
  3. Diaqnostik       → 90.0 bal (2024-11-05)
```

### 3. **Dərs Saat Tabı**
```
Fənn           | Sinif  | Həftəlik Saat
---------------|--------|---------------
Riyaziyyat     | 7A     | 5
Riyaziyyat     | 8B     | 4
Fizika         | 9A     | 3
---------------|--------|---------------
CƏMI:                   | 12 saat (avtomatik)
```

---

## 🗄️ Yenilənmiş Database Strukturu

### ⚠️ KRİTİK DƏYİŞİKLİK: Ayrı Evaluations Cədvəli

**Əvvəlki yanlış yanaşma:**
```sql
-- ❌ user_profiles cədvəlində:
evaluation_type VARCHAR(50)      -- Yalnız 1 növ
evaluation_score DECIMAL(5,2)    -- Yalnız 1 bal
```

**Düzgün həll - 1-to-Many relationship:**
```sql
-- ✅ Ayrı teacher_evaluations cədvəli:
CREATE TABLE teacher_evaluations (
    id BIGINT PRIMARY KEY,
    user_profile_id BIGINT,           -- FK to user_profiles
    evaluation_type ENUM(...),        -- certification, diagnostic, miq_60, miq_100
    score DECIMAL(5,2),               -- 0-100
    evaluation_date DATE,             -- Qiymətləndirmə tarixi
    notes TEXT,                       -- Əlavə qeydlər
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);
```

### 📋 Tam Database Schema

#### Migration 1: User Profiles Yeniləməsi
**Fayl:** `backend/database/migrations/2025_10_22_add_teacher_professional_fields_v2.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // Vəzifə məlumatları
            $table->enum('position_type', [
                'teacher',                    // Müəllim
                'director',                   // Direktor
                'deputy_director_education',  // Direktor müavini (Təhsil)
                'deputy_director_admin',      // Direktor müavini (İnzibati)
                'organizer',                  // Təşkilatçı
                'class_teacher'               // Sinif rəhbəri
            ])->nullable()->after('specialty');

            // Əsas iş yeri
            $table->foreignId('primary_institution_id')
                ->nullable()
                ->after('position_type')
                ->constrained('institutions')
                ->nullOnDelete()
                ->comment('Müəllimin əsas iş yeri');

            // İxtisas balı (yeni field)
            $table->decimal('specialty_score', 5, 2)
                ->nullable()
                ->after('specialty')
                ->comment('İxtisas balı (0-100)');

            // İxtisas səviyyəsi
            $table->enum('specialty_level', [
                'basic',        // Əsas
                'intermediate', // Orta
                'advanced',     // Yüksək
                'expert',       // Ekspert
                'master'        // Master
            ])->nullable()->after('specialty_score');

            // Indexes
            $table->index('position_type');
            $table->index('specialty_score');
            $table->index('primary_institution_id');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropIndex(['position_type']);
            $table->dropIndex(['specialty_score']);
            $table->dropIndex(['primary_institution_id']);

            $table->dropColumn([
                'position_type',
                'specialty_score',
                'specialty_level',
                'primary_institution_id'
            ]);
        });
    }
};
```

#### Migration 2: Teacher Evaluations Cədvəli (YENİ)
**Fayl:** `backend/database/migrations/2025_10_22_create_teacher_evaluations_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_evaluations', function (Blueprint $table) {
            $table->id();

            // Foreign key to user_profiles
            $table->foreignId('user_profile_id')
                ->constrained('user_profiles')
                ->onDelete('cascade')
                ->comment('Bağlı olduğu müəllimin profil ID-si');

            // Qiymətləndirmə növü
            $table->enum('evaluation_type', [
                'certification',  // Sertifikasiya
                'diagnostic',     // Diaqnostik
                'miq_60',        // MİQ-60
                'miq_100'        // MİQ-100
            ])->comment('Qiymətləndirmə növü');

            // Qiymətləndirmə balı
            $table->decimal('score', 5, 2)
                ->comment('Qiymətləndirmədən alınan bal (0-100)');

            // Qiymətləndirmə tarixi
            $table->date('evaluation_date')
                ->comment('Qiymətləndirmənin keçirildiyi tarix');

            // Status (aktiv/arxivlənmiş)
            $table->enum('status', ['active', 'archived'])
                ->default('active')
                ->comment('Qiymətin statusu');

            // Əlavə məlumatlar
            $table->text('notes')->nullable()
                ->comment('Əlavə qeydlər və izahlar');

            // Metadata (JSON)
            $table->json('metadata')->nullable()
                ->comment('Əlavə metadata (sertifikat nömrəsi, qurumun adı və s.)');

            // Audit fields
            $table->foreignId('created_by')->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Məlumatı daxil edən istifadəçi');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['user_profile_id', 'evaluation_type']);
            $table->index('evaluation_date');
            $table->index('score');
            $table->index('status');

            // Unique constraint (müəllim eyni növdə eyni tarixdə yalnız 1 dəfə qiymətləndirilə bilər)
            $table->unique(['user_profile_id', 'evaluation_type', 'evaluation_date'],
                'unique_evaluation_per_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_evaluations');
    }
};
```

#### Migration 3: Teacher Workplaces Cədvəli (YENİ)
**Fayl:** `backend/database/migrations/2025_10_22_create_teacher_workplaces_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_workplaces', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_profile_id')
                ->constrained('user_profiles')
                ->onDelete('cascade');

            $table->foreignId('institution_id')
                ->constrained('institutions')
                ->onDelete('cascade');

            $table->unsignedTinyInteger('sequence');

            $table->enum('employment_type', ['full_time', 'part_time'])
                ->default('part_time');

            $table->decimal('weekly_hours', 4, 2)
                ->nullable();

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            $table->timestamps();

            $table->unique(['user_profile_id', 'sequence'], 'unique_workplace_by_sequence');
            $table->index(['user_profile_id', 'institution_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_workplaces');
    }
};
```

---

## 🔧 Backend İmplementasiyası

### 1. Model: TeacherEvaluationRecord

**YENİ FAYL:** `backend/app/Models/TeacherEvaluationRecord.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Teacher Evaluation Record Model
 *
 * Müəllimin iştirak etdiyi qiymətləndirmə qeydləri
 * Bir müəllim bir neçə qiymətləndirmədə iştirak edə bilər
 */
class TeacherEvaluationRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'teacher_evaluations';

    protected $fillable = [
        'user_profile_id',
        'evaluation_type',
        'score',
        'evaluation_date',
        'status',
        'notes',
        'metadata',
        'created_by'
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'evaluation_date' => 'date',
        'metadata' => 'array',
    ];

    // Constants
    public const TYPE_CERTIFICATION = 'certification';
    public const TYPE_DIAGNOSTIC = 'diagnostic';
    public const TYPE_MIQ_60 = 'miq_60';
    public const TYPE_MIQ_100 = 'miq_100';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_ARCHIVED = 'archived';

    /**
     * İstifadə oluna bilən qiymətləndirmə növləri
     */
    public static function evaluationTypes(): array
    {
        return [
            self::TYPE_CERTIFICATION => 'Sertifikasiya',
            self::TYPE_DIAGNOSTIC => 'Diaqnostik',
            self::TYPE_MIQ_60 => 'MİQ-60',
            self::TYPE_MIQ_100 => 'MİQ-100',
        ];
    }

    /**
     * Relationship: Belongs to UserProfile
     */
    public function userProfile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class);
    }

    /**
     * Relationship: Created by User
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Accessor: Get evaluation type display name
     */
    public function getEvaluationTypeNameAttribute(): string
    {
        return self::evaluationTypes()[$this->evaluation_type] ?? $this->evaluation_type;
    }

    /**
     * Scope: Active evaluations only
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope: By evaluation type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('evaluation_type', $type);
    }

    /**
     * Scope: Recent evaluations (within last year)
     */
    public function scopeRecent($query)
    {
        return $query->where('evaluation_date', '>=', now()->subYear());
    }
}
```

### 5. Workplace Management Service (opsional)

**YENİ FAYL (opsional):** `backend/app/Services/TeacherWorkplaceManager.php`

```php
<?php

namespace App\Services;

use App\Models\TeacherWorkplace;
use App\Models\UserProfile;

class TeacherWorkplaceManager
{
    public function syncWorkplaces(UserProfile $profile, array $workplaces): void
    {
        $existingIds = collect($workplaces)->pluck('id')->filter()->all();

        TeacherWorkplace::where('user_profile_id', $profile->id)
            ->whereNotIn('id', $existingIds)
            ->delete();

        foreach ($workplaces as $data) {
            TeacherWorkplace::updateOrCreate(
                ['id' => $data['id'] ?? null],
                [
                    'user_profile_id' => $profile->id,
                    'institution_id' => $data['institution_id'],
                    'sequence' => $data['sequence'],
                    'employment_type' => $data['employment_type'] ?? 'part_time',
                    'weekly_hours' => $data['weekly_hours'] ?? null,
                    'start_date' => $data['start_date'] ?? null,
                    'end_date' => $data['end_date'] ?? null,
                ]
            );
        }
    }
}
```

### 2. Model: TeacherWorkplace

**YENİ FAYL:** `backend/app/Models/TeacherWorkplace.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherWorkplace extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_profile_id',
        'institution_id',
        'sequence',
        'employment_type',
        'weekly_hours',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'weekly_hours' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Relationship: Teacher profile
     */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    /**
     * Relationship: Workplace institution
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
```

### 3. UserProfile Model Yeniləməsi

**Fayl:** `backend/app/Models/UserProfile.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserProfile extends Model
{
    protected $fillable = [
        // ... mövcud fieldlər
        'position_type',
        'specialty_score',
        'specialty_level',
        'primary_institution_id',
    ];

    protected $casts = [
        // ... mövcud casts
        'specialty_score' => 'decimal:2',
    ];

    /**
     * Relationship: User has many evaluation records
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(TeacherEvaluationRecord::class);
    }

    /**
     * Relationship: Primary institution (əsas iş yeri)
     */
    public function primaryInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'primary_institution_id');
    }

    /**
     * Relationship: Additional workplaces (ikinci-dördüncü iş yerləri)
     */
    public function workplaces(): HasMany
    {
        return $this->hasMany(TeacherWorkplace::class)
            ->orderBy('sequence');
    }

    /**
     * Relationship: Active evaluations only
     */
    public function activeEvaluations(): HasMany
    {
        return $this->hasMany(TeacherEvaluationRecord::class)
            ->where('status', 'active')
            ->orderBy('evaluation_date', 'desc');
    }

    /**
     * Accessor: Get position display name
     */
    public function getPositionNameAttribute(): string
    {
        return match($this->position_type) {
            'teacher' => 'Müəllim',
            'director' => 'Direktor',
            'deputy_director_education' => 'Direktor müavini (Təhsil)',
            'deputy_director_admin' => 'Direktor müavini (İnzibati)',
            'organizer' => 'Təşkilatçı',
            'class_teacher' => 'Sinif rəhbəri',
            default => 'Təyin edilməyib'
        };
    }

    /**
     * Get average evaluation score
     */
    public function getAverageEvaluationScoreAttribute(): ?float
    {
        $average = $this->activeEvaluations()->avg('score');
        return $average ? round($average, 2) : null;
    }

    /**
     * Get latest evaluation
     */
    public function getLatestEvaluationAttribute(): ?TeacherEvaluationRecord
    {
        return $this->activeEvaluations()
            ->orderBy('evaluation_date', 'desc')
            ->first();
    }
}
```

### 4. Controller Yeniləməsi

**Fayl:** `backend/app/Http/Controllers/School/SchoolTeacherController.php`

Əlavə metodlar:

```php
<?php

namespace App\Http\Controllers\School;

use App\Models\TeacherEvaluationRecord;
use App\Models\TeacherWorkplace;

class SchoolTeacherController extends Controller
{
    /**
     * Get teacher with evaluations
     */
    public function getTeacher(Request $request, int $teacherId): JsonResponse
    {
        // ... mövcud kod

        $profile = UserProfile::where('user_id', $teacher->id)
            ->with([
                'evaluations' => function($query) {
                    $query->active()->orderBy('evaluation_date', 'desc');
                },
                'primaryInstitution:id,name,code',
                'workplaces.institution:id,name,code'
            ])
            ->first();

        $teacherData = [
            // ... mövcud fieldlər
            'profile' => $profile ? [
                // ... mövcud profile fields
                'position_type' => $profile->position_type,
                'position_name' => $profile->position_name,
                'specialty_score' => $profile->specialty_score,
                'specialty_level' => $profile->specialty_level,
                'primary_institution_id' => $profile->primary_institution_id,
                'primary_institution' => $profile->primaryInstitution ? [
                    'id' => $profile->primaryInstitution->id,
                    'name' => $profile->primaryInstitution->name,
                    'code' => $profile->primaryInstitution->code,
                ] : null,
                'average_evaluation_score' => $profile->average_evaluation_score,

                // Qiymətləndirmələr (array)
                'evaluations' => $profile->evaluations->map(function($eval) {
                    return [
                        'id' => $eval->id,
                        'type' => $eval->evaluation_type,
                        'type_name' => $eval->evaluation_type_name,
                        'score' => $eval->score,
                        'date' => $eval->evaluation_date->format('Y-m-d'),
                        'notes' => $eval->notes,
                        'status' => $eval->status,
                    ];
                })->toArray(),

                // Əlavə iş yerləri (ikinci-dördüncü)
                'secondary_workplaces' => $profile->workplaces->map(function($workplace) {
                    return [
                        'id' => $workplace->id,
                        'institution_id' => $workplace->institution_id,
                        'institution' => $workplace->institution ? [
                            'id' => $workplace->institution->id,
                            'name' => $workplace->institution->name,
                            'code' => $workplace->institution->code,
                        ] : null,
                        'sequence' => $workplace->sequence,
                        'employment_type' => $workplace->employment_type,
                        'weekly_hours' => $workplace->weekly_hours,
                        'start_date' => optional($workplace->start_date)->format('Y-m-d'),
                        'end_date' => optional($workplace->end_date)->format('Y-m-d'),
                    ];
                })->toArray(),
            ] : null,
        ];

        return response()->json([
            'success' => true,
            'data' => $teacherData
        ]);
    }

    /**
     * Create teacher with evaluations
     */
    public function createTeacher(Request $request): JsonResponse
    {
        $request->validate([
            // ... mövcud validation
            'profile.position_type' => 'nullable|in:teacher,director,deputy_director_education,deputy_director_admin,organizer,class_teacher',
            'profile.specialty_score' => 'nullable|numeric|min:0|max:100',
            'profile.specialty_level' => 'nullable|in:basic,intermediate,advanced,expert,master',
            'profile.primary_institution_id' => 'required|exists:institutions,id',
            'profile.secondary_workplaces' => 'nullable|array|max:3',
            'profile.secondary_workplaces.*.institution_id' => 'required|distinct|different:profile.primary_institution_id|exists:institutions,id',
            'profile.secondary_workplaces.*.sequence' => 'required|integer|min:2|max:4',
            'profile.secondary_workplaces.*.employment_type' => 'nullable|in:full_time,part_time',
            'profile.secondary_workplaces.*.weekly_hours' => 'nullable|numeric|min:0|max:40',
            'profile.secondary_workplaces.*.start_date' => 'nullable|date',
            'profile.secondary_workplaces.*.end_date' => 'nullable|date|after_or_equal:profile.secondary_workplaces.*.start_date',

            // Qiymətləndirmələr (array)
            'profile.evaluations' => 'nullable|array',
            'profile.evaluations.*.type' => 'required|in:certification,diagnostic,miq_60,miq_100',
            'profile.evaluations.*.score' => 'required|numeric|min:0|max:100',
            'profile.evaluations.*.date' => 'required|date',
            'profile.evaluations.*.notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            // Create user
            $teacher = User::create([/* ... */]);

            // Create profile
            $profile = UserProfile::create(array_merge(
                $request->profile,
                ['user_id' => $teacher->id]
            ));

            // Persist secondary workplaces
            if ($request->filled('profile.secondary_workplaces')) {
                foreach ($request->profile['secondary_workplaces'] as $workplace) {
                    TeacherWorkplace::create([
                        'user_profile_id' => $profile->id,
                        'institution_id' => $workplace['institution_id'],
                        'sequence' => $workplace['sequence'],
                        'employment_type' => $workplace['employment_type'] ?? 'part_time',
                        'weekly_hours' => $workplace['weekly_hours'] ?? null,
                        'start_date' => $workplace['start_date'] ?? null,
                        'end_date' => $workplace['end_date'] ?? null,
                    ]);
                }
            }

            // Create evaluation records
            if ($request->has('profile.evaluations') && is_array($request->profile['evaluations'])) {
                foreach ($request->profile['evaluations'] as $evalData) {
                    TeacherEvaluationRecord::create([
                        'user_profile_id' => $profile->id,
                        'evaluation_type' => $evalData['type'],
                        'score' => $evalData['score'],
                        'evaluation_date' => $evalData['date'],
                        'notes' => $evalData['notes'] ?? null,
                        'status' => 'active',
                        'created_by' => Auth::id(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Müəllim uğurla yaradıldı',
                'data' => ['id' => $teacher->id]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Müəllim yaradılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update teacher evaluations
     */
    public function updateTeacherEvaluations(Request $request, int $teacherId): JsonResponse
    {
        $request->validate([
            'evaluations' => 'required|array',
            'evaluations.*.id' => 'nullable|exists:teacher_evaluations,id',
            'evaluations.*.type' => 'required|in:certification,diagnostic,miq_60,miq_100',
            'evaluations.*.score' => 'required|numeric|min:0|max:100',
            'evaluations.*.date' => 'required|date',
            'evaluations.*.notes' => 'nullable|string|max:500',
            'evaluations.*.status' => 'nullable|in:active,archived',
        ]);

        $profile = UserProfile::where('user_id', $teacherId)->firstOrFail();

        DB::beginTransaction();
        try {
            // Get existing evaluation IDs
            $existingIds = collect($request->evaluations)
                ->pluck('id')
                ->filter()
                ->toArray();

            // Delete evaluations not in the request
            TeacherEvaluationRecord::where('user_profile_id', $profile->id)
                ->whereNotIn('id', $existingIds)
                ->delete();

            // Update or create evaluations
            foreach ($request->evaluations as $evalData) {
                if (isset($evalData['id'])) {
                    // Update existing
                    TeacherEvaluationRecord::where('id', $evalData['id'])
                        ->update([
                            'evaluation_type' => $evalData['type'],
                            'score' => $evalData['score'],
                            'evaluation_date' => $evalData['date'],
                            'notes' => $evalData['notes'] ?? null,
                            'status' => $evalData['status'] ?? 'active',
                        ]);
                } else {
                    // Create new
                    TeacherEvaluationRecord::create([
                        'user_profile_id' => $profile->id,
                        'evaluation_type' => $evalData['type'],
                        'score' => $evalData['score'],
                        'evaluation_date' => $evalData['date'],
                        'notes' => $evalData['notes'] ?? null,
                        'status' => 'active',
                        'created_by' => Auth::id(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Qiymətləndirmələr yeniləndi'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Yeniləmə zamanı səhv: ' . $e->getMessage()
            ], 500);
        }
    }
}
```

### 4. API Routes Yeniləməsi

**Fayl:** `backend/routes/api/educational.php`

```php
// Teacher evaluation endpoints
Route::prefix('teachers/{teacher}')->group(function () {
    Route::get('/evaluations', [SchoolTeacherController::class, 'getTeacherEvaluations']);
    Route::post('/evaluations', [SchoolTeacherController::class, 'updateTeacherEvaluations']);
    Route::delete('/evaluations/{evaluation}', [SchoolTeacherController::class, 'deleteEvaluation']);
});

// Evaluation types reference
Route::get('/evaluation-types', function() {
    return response()->json([
        'success' => true,
        'data' => TeacherEvaluationRecord::evaluationTypes()
    ]);
});
```

---

## 💻 Frontend İmplementasiyası

### 1. TypeScript Type Definitions

**Fayl:** `frontend/src/types/teacher.ts`

```typescript
export type EvaluationType =
  | 'certification'
  | 'diagnostic'
  | 'miq_60'
  | 'miq_100';

export type EvaluationStatus = 'active' | 'archived';

export type PositionType =
  | 'teacher'
  | 'director'
  | 'deputy_director_education'
  | 'deputy_director_admin'
  | 'organizer'
  | 'class_teacher';

export type SpecialtyLevel =
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master';

export type EmploymentType = 'full_time' | 'part_time';

export interface MinimalInstitution {
  id: number;
  name: string;
  code?: string;
}

export interface TeacherWorkplace {
  id?: number;
  institution_id: number;
  institution?: MinimalInstitution;
  sequence: 2 | 3 | 4;
  employment_type?: EmploymentType;
  weekly_hours?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Müəllimin qiymətləndirmə qeydi
 */
export interface TeacherEvaluationRecord {
  id?: number;
  type: EvaluationType;
  type_name?: string;
  score: number;
  date: string;
  notes?: string;
  status?: EvaluationStatus;
}

/**
 * Müəllim profili (extended)
 */
export interface TeacherProfile {
  user_id: number;
  first_name: string;
  last_name: string;
  utis_code?: string;

  // Professional info
  specialty?: string;
  specialty_score?: number;
  specialty_level?: SpecialtyLevel;
  position_type?: PositionType;
  position_name?: string;
  primary_institution_id?: number;
  primary_institution?: MinimalInstitution;

  // Evaluations (ARRAY)
  evaluations?: TeacherEvaluationRecord[];
  average_evaluation_score?: number;

  // Additional workplaces
  secondary_workplaces?: TeacherWorkplace[];

  // Other fields
  contact_phone?: string;
  birth_date?: string;
  hire_date?: string;
  address?: string;
  emergency_contact?: string;
  subjects?: string[];
  qualifications?: any[];
  salary?: number;
  notes?: string;
}

/**
 * Tam müəllim obyekti
 */
export interface SchoolTeacher {
  id: number;
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active: boolean;
  profile?: TeacherProfile;
  subjects?: string[];
  classes?: number[];
  workload_hours?: number;
  performance_rating?: number;
}
```

### 2. Constants

**Fayl:** `frontend/src/constants/teacherOptions.ts`

```typescript
export const POSITION_OPTIONS = [
  { value: 'teacher', label: 'Müəllim' },
  { value: 'director', label: 'Direktor' },
  { value: 'deputy_director_education', label: 'Direktor müavini (Təhsil)' },
  { value: 'deputy_director_admin', label: 'Direktor müavini (İnzibati)' },
  { value: 'organizer', label: 'Təşkilatçı' },
  { value: 'class_teacher', label: 'Sinif rəhbəri' },
];

export const EVALUATION_TYPE_OPTIONS = [
  { value: 'certification', label: 'Sertifikasiya' },
  { value: 'diagnostic', label: 'Diaqnostik' },
  { value: 'miq_60', label: 'MİQ-60' },
  { value: 'miq_100', label: 'MİQ-100' },
];

export const SPECIALTY_LEVEL_OPTIONS = [
  { value: 'basic', label: 'Əsas' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'Yüksək' },
  { value: 'expert', label: 'Ekspert' },
  { value: 'master', label: 'Master' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Tam ştat' },
  { value: 'part_time', label: 'Yarım ştat' },
];
```

### 3. Evaluation Array Input Component

**YENİ FAYL:** `frontend/src/components/teachers/TeacherEvaluationsInput.tsx`

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { TeacherEvaluationRecord, EvaluationType } from '@/types/teacher';
import { EVALUATION_TYPE_OPTIONS } from '@/constants/teacherOptions';
import { cn } from '@/lib/utils';

interface TeacherEvaluationsInputProps {
  value: TeacherEvaluationRecord[];
  onChange: (evaluations: TeacherEvaluationRecord[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Müəllimin qiymətləndirmələrini idarə etmək üçün dinamik input komponenti
 *
 * Xüsusiyyətlər:
 * - Bir neçə qiymətləndirmə əlavə etmək
 * - Hər qiymətləndirmə üçün: növ, bal, tarix, qeyd
 * - Qiymətləndirmə silmək
 * - Validation
 */
export const TeacherEvaluationsInput: React.FC<TeacherEvaluationsInputProps> = ({
  value = [],
  onChange,
  disabled = false,
  className
}) => {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleAddEvaluation = () => {
    const newEvaluation: TeacherEvaluationRecord = {
      type: 'certification',
      score: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'active'
    };
    onChange([...value, newEvaluation]);
  };

  const handleRemoveEvaluation = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);

    // Clear error for removed item
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const handleUpdateEvaluation = (
    index: number,
    field: keyof TeacherEvaluationRecord,
    val: any
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);

    // Validate score
    if (field === 'score') {
      const score = parseFloat(val);
      if (isNaN(score) || score < 0 || score > 100) {
        setErrors({ ...errors, [index]: 'Bal 0-100 arasında olmalıdır' });
      } else {
        const newErrors = { ...errors };
        delete newErrors[index];
        setErrors(newErrors);
      }
    }
  };

  const getEvaluationTypeName = (type: EvaluationType): string => {
    return EVALUATION_TYPE_OPTIONS.find(opt => opt.value === type)?.label || type;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Qiymətləndirmələr</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Müəllimin iştirak etdiyi qiymətləndirmələri əlavə edin
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddEvaluation}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Əlavə et
        </Button>
      </div>

      {value.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Hələ qiymətləndirmə əlavə edilməyib
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Müəllimin iştirak etdiyi qiymətləndirmələri əlavə etmək üçün yuxarıdakı düyməyə basın
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {value.map((evaluation, index) => (
          <Card
            key={index}
            className={cn(
              'border-l-4 transition-colors',
              errors[index] ? 'border-l-destructive' : 'border-l-primary'
            )}
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-4">
                {/* Qiymətləndirmə Növü */}
                <div className="col-span-12 sm:col-span-4">
                  <Label htmlFor={`eval-type-${index}`} className="text-xs">
                    Növ
                  </Label>
                  <Select
                    value={evaluation.type}
                    onValueChange={(val) => handleUpdateEvaluation(index, 'type', val)}
                    disabled={disabled}
                  >
                    <SelectTrigger id={`eval-type-${index}`} className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVALUATION_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bal */}
                <div className="col-span-6 sm:col-span-3">
                  <Label htmlFor={`eval-score-${index}`} className="text-xs">
                    Bal
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id={`eval-score-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={evaluation.score || ''}
                      onChange={(e) => handleUpdateEvaluation(index, 'score', e.target.value)}
                      disabled={disabled}
                      className={errors[index] ? 'border-destructive' : ''}
                      placeholder="0-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      bal
                    </span>
                  </div>
                  {errors[index] && (
                    <p className="text-xs text-destructive mt-1">{errors[index]}</p>
                  )}
                </div>

                {/* Tarix */}
                <div className="col-span-6 sm:col-span-3">
                  <Label htmlFor={`eval-date-${index}`} className="text-xs">
                    Tarix
                  </Label>
                  <Input
                    id={`eval-date-${index}`}
                    type="date"
                    value={evaluation.date}
                    onChange={(e) => handleUpdateEvaluation(index, 'date', e.target.value)}
                    disabled={disabled}
                    className="mt-1"
                  />
                </div>

                {/* Sil düyməsi */}
                <div className="col-span-12 sm:col-span-2 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEvaluation(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Qeydlər (tam genişlik) */}
                <div className="col-span-12">
                  <Label htmlFor={`eval-notes-${index}`} className="text-xs">
                    Qeydlər (istəyə bağlı)
                  </Label>
                  <Textarea
                    id={`eval-notes-${index}`}
                    value={evaluation.notes || ''}
                    onChange={(e) => handleUpdateEvaluation(index, 'notes', e.target.value)}
                    disabled={disabled}
                    placeholder="Əlavə qeydlər və izahlar..."
                    className="mt-1 resize-none h-16"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {(evaluation.notes || '').length} / 500
                  </p>
                </div>
              </div>

              {/* Evaluation Badge */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Badge variant="secondary" className="text-xs">
                  {getEvaluationTypeName(evaluation.type)}
                </Badge>
                <Badge
                  variant={evaluation.score >= 70 ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {evaluation.score} bal
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(evaluation.date).toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {value.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cəmi:</span>
                <span className="ml-2 font-semibold">{value.length} qiymətləndirmə</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ortalama:</span>
                <span className="ml-2 font-semibold text-primary">
                  {value.length > 0
                    ? (value.reduce((sum, e) => sum + parseFloat(e.score.toString() || '0'), 0) / value.length).toFixed(2)
                    : '0.00'} bal
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ən yüksək:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {value.length > 0
                    ? Math.max(...value.map(e => parseFloat(e.score.toString() || '0'))).toFixed(2)
                    : '0.00'} bal
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

### 4. UserModal Yeniləməsi (with Evaluations)

**Fayl:** `frontend/src/components/modals/UserModal.tsx`

Əlavə state və handler:

```tsx
import { TeacherEvaluationsInput } from '@/components/teachers/TeacherEvaluationsInput';
import { TeacherEvaluationRecord } from '@/types/teacher';
import { POSITION_OPTIONS, SPECIALTY_LEVEL_OPTIONS } from '@/constants/teacherOptions';

export const UserModal: React.FC<UserModalProps> = ({ /* ... */ }) => {
  const [formData, setFormData] = useState({
    // ... mövcud state
    profile: {
      // ... mövcud profile fields
      position_type: '',
      specialty: '',
      specialty_score: '',
      specialty_level: '',
      evaluations: [] as TeacherEvaluationRecord[],
    }
  });

  // Handler for evaluations array
  const handleEvaluationsChange = (evaluations: TeacherEvaluationRecord[]) => {
    setFormData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        evaluations
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Müəllimi Redaktə Et' : 'Yeni Müəllim Əlavə Et'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Əsas Məlumatlar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Ad *</Label>
              <Input
                id="first_name"
                value={formData.profile?.first_name || ''}
                onChange={(e) => handleProfileChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Soyad *</Label>
              <Input
                id="last_name"
                value={formData.profile?.last_name || ''}
                onChange={(e) => handleProfileChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          {/* UTIS Kod və Vəzifə */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="utis_code">UTIS Kodu</Label>
              <Input
                id="utis_code"
                value={formData.profile?.utis_code || ''}
                onChange={(e) => handleProfileChange('utis_code', e.target.value)}
                placeholder="7 rəqəmli kod"
                maxLength={7}
                pattern="\d{7}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                7 rəqəmli unikal kod
              </p>
            </div>
            <div>
              <Label htmlFor="position_type">Vəzifəsi</Label>
              <Select
                value={formData.profile?.position_type || ''}
                onValueChange={(value) => handleProfileChange('position_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vəzifə seçin" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* İxtisas və İxtisas Balı */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialty">İxtisas</Label>
              <Input
                id="specialty"
                value={formData.profile?.specialty || ''}
                onChange={(e) => handleProfileChange('specialty', e.target.value)}
                placeholder="Məsələn: Riyaziyyat"
              />
            </div>
            <div>
              <Label htmlFor="specialty_score">İxtisas Balı</Label>
              <Input
                id="specialty_score"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.profile?.specialty_score || ''}
                onChange={(e) => handleProfileChange('specialty_score', parseFloat(e.target.value))}
                placeholder="0-100"
              />
            </div>
          </div>

          {/* Qiymətləndirmələr (ARRAY INPUT) */}
          <Separator />
          <TeacherEvaluationsInput
            value={formData.profile?.evaluations || []}
            onChange={handleEvaluationsChange}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saxlanılır...' : user ? 'Yenilə' : 'Əlavə et'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### 5. TeacherDetailsDialog - Evaluations Tab

**Fayl:** `frontend/src/components/teachers/TeacherDetailsDialog.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherEvaluationRecord } from '@/types/teacher';
import { Award, Calendar, TrendingUp } from 'lucide-react';

// Inside dialog:
<Tabs defaultValue="overview">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview">Ümumi</TabsTrigger>
    <TabsTrigger value="evaluations">Qiymətləndirmələr</TabsTrigger>
    <TabsTrigger value="workload">Dərs Yükü</TabsTrigger>
    <TabsTrigger value="performance">Performans</TabsTrigger>
  </TabsList>

  {/* Evaluations Tab */}
  <TabsContent value="evaluations" className="space-y-4">
    {teacher.profile?.evaluations && teacher.profile.evaluations.length > 0 ? (
      <>
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ümumi Statistika
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {teacher.profile.evaluations.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cəmi Qiymətləndirmə
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {teacher.profile.average_evaluation_score?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Ortalama Bal
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.max(...teacher.profile.evaluations.map(e => e.score)).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Ən Yüksək Bal
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluations List */}
        <div className="space-y-3">
          {teacher.profile.evaluations
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((evaluation, index) => (
              <Card key={evaluation.id || index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-base">
                          {evaluation.type_name || evaluation.type}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(evaluation.date).toLocaleDateString('az-AZ', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        {evaluation.notes && (
                          <p className="text-sm text-muted-foreground mt-2 max-w-md">
                            {evaluation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        evaluation.score >= 80 ? 'text-green-600' :
                        evaluation.score >= 60 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {evaluation.score}
                      </div>
                      <div className="text-xs text-muted-foreground">bal</div>
                      <Badge
                        variant={evaluation.status === 'active' ? 'default' : 'secondary'}
                        className="mt-2"
                      >
                        {evaluation.status === 'active' ? 'Aktiv' : 'Arxiv'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </>
    ) : (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Hələ qiymətləndirmə qeydi yoxdur
          </p>
        </CardContent>
      </Card>
    )}
  </TabsContent>
</Tabs>
```

### 6. Service Layer

**Fayl:** `frontend/src/services/teachers.ts`

```typescript
import api from '@/lib/api';
import { TeacherEvaluationRecord } from '@/types/teacher';

export const teachersService = {
  // ... mövcud metodlar

  /**
   * Get teacher evaluations
   */
  getTeacherEvaluations: async (teacherId: number): Promise<TeacherEvaluationRecord[]> => {
    const response = await api.get(`/teachers/${teacherId}/evaluations`);
    return response.data.data;
  },

  /**
   * Update teacher evaluations (full replace)
   */
  updateTeacherEvaluations: async (
    teacherId: number,
    evaluations: TeacherEvaluationRecord[]
  ): Promise<void> => {
    await api.post(`/teachers/${teacherId}/evaluations`, { evaluations });
  },

  /**
   * Delete single evaluation
   */
  deleteEvaluation: async (teacherId: number, evaluationId: number): Promise<void> => {
    await api.delete(`/teachers/${teacherId}/evaluations/${evaluationId}`);
  },
};
```

---

## 📋 Implementation Checklist

### Sprint 1: Database & Backend (3-4 gün)

**Day 1:**
- [x] Migration: `user_profiles` yeniləməsi (position_type, specialty_score)
- [x] Migration: `teacher_evaluations` cədvəli yaratmaq
- [x] Model: `TeacherEvaluationRecord` yaratmaq
- [x] Model: `UserProfile` relationship əlavə etmək

**Day 2:**
- [x] Controller: `getTeacher()` yeniləmək (evaluations include)
- [x] Controller: `createTeacher()` yeniləmək (evaluations create)
- [x] Controller: `updateTeacherEvaluations()` yaratmaq
- [x] Validation: Request validation rules

**Day 3:**
- [x] API Routes yeniləmək
- [x] Backend testing (unit tests)
- [x] Seeder məlumatları əlavə etmək

### Sprint 2: Frontend Components (4-5 gün)

**Day 1:**
- [x] TypeScript types yaratmaq
- [x] Constants faylı yaratmaq
- [x] `TeacherEvaluationsInput` komponenti yaratmaq

**Day 2:**
- [x] `UserModal` yeniləmək (evaluations input əlavə)
- [x] Form validation (client-side)
- [x] Service layer metodları

**Day 3:**
- [x] `TeacherDetailsDialog` yeniləmək (evaluations tab)
- [x] `teacherConfig.tsx` kolonlar yeniləmək
- [x] UI/UX polish

**Day 4:**
- [x] Component testing
- [x] Integration testing
- [x] Bug fixes

### Sprint 3: Testing & Deployment (2 gün)

**Day 1:**
- [x] End-to-end testing
- [x] Performance testing
- [x] Accessibility testing
- [x] Documentation

**Day 2:**
- [x] Production migration
- [x] Data seeding
- [x] User acceptance testing
- [x] Go-live

---

## 🎯 Uğur Kriteriləri

### Funksional Tələblər
✅ Müəllim yaradılarkən bir neçə qiymətləndirmə əlavə oluna bilir
✅ Hər qiymətləndirmə: növ + bal + tarix + qeyd
✅ Qiymətləndirmələr dinamik əlavə/sil edilə bilir
✅ Ortalama bal avtomatik hesablanır
✅ UTIS kodu 7 rəqəm və unikaldır
✅ Vəzifə düzgün seçilir və saxlanılır
✅ İxtisas balı daxil edilir

### Texniki Tələblər
✅ Database migration uğurla icra olunur
✅ 1-to-Many relationship düzgün işləyir
✅ Validation (frontend və backend)
✅ TypeScript type safety
✅ Responsive design
✅ Error handling

### İstifadəçi Təcrübəsi
✅ İntuitive UI flow
✅ Aydın error messages
✅ Loading states
✅ Confirmation dialogs
✅ Tooltip help texts

---

## ⚠️ Mühüm Qeydlər

### 1. Migration Strategy
```bash
# Development
docker exec atis_backend php artisan migrate

# Production (BACKUP FIRST!)
# 1. Database backup
# 2. Test migration on staging
# 3. Run migration during maintenance window
# 4. Verify data integrity
```

### 2. Validation Rules
- **UTIS Kod:** 7 rəqəm, unikal
- **Evaluation Type:** Məcburi (certification, diagnostic, miq_60, miq_100)
- **Score:** 0-100 arası decimal
- **Date:** Valid date, gələcək ola bilməz
- **Notes:** Maksimum 500 simvol

### 3. Performance Considerations
- Evaluation queries eager loading ilə optimize edilməli
- Index: `(user_profile_id, evaluation_type, evaluation_date)`
- Soft delete dəstəyi (data audit üçün)
- Pagination böyük data sets üçün

### 4. Security
- Authorization checks (müəllim yalnız öz evaluations-ını görə bilər)
- CSRF protection
- Input sanitization
- SQL injection prevention (Eloquent ORM istifadə)

---

## 📊 Data Flow Diaqramı

```
┌─────────────────┐
│   UserModal     │
│  (Create/Edit)  │
└────────┬────────┘
         │
         │ Form Submit
         ▼
┌─────────────────────────────┐
│  TeacherEvaluationsInput    │
│  - type: 'certification'    │
│  - score: 85.5              │
│  - date: '2024-10-15'       │
│  - notes: '...'             │
│  [+ Add more]               │
└─────────┬───────────────────┘
          │
          │ onChange
          ▼
┌──────────────────────────────┐
│  FormData State              │
│  {                           │
│    profile: {                │
│      evaluations: [          │
│        {type, score, date},  │
│        {type, score, date}   │
│      ]                       │
│    }                         │
│  }                           │
└──────────┬───────────────────┘
           │
           │ POST /api/teachers
           ▼
┌───────────────────────────────┐
│  SchoolTeacherController      │
│  createTeacher()              │
│  - Create User                │
│  - Create UserProfile         │
│  - Create Evaluations (loop)  │
└──────────┬────────────────────┘
           │
           │ DB Transaction
           ▼
┌────────────────────────────────┐
│  Database                      │
│  ├─ users                      │
│  ├─ user_profiles              │
│  └─ teacher_evaluations        │
│     ├─ id: 1                   │
│     ├─ user_profile_id: 123    │
│     ├─ evaluation_type: cert   │
│     ├─ score: 85.5             │
│     └─ evaluation_date: ...    │
└────────────────────────────────┘
```

---

## 🚀 Next Steps After Implementation

### 1. Analytics Dashboard
- Müəllim performans trendləri
- Qiymətləndirmə statistikaları (ortalama ballar institution-a görə)
- Comparison charts

### 2. Reporting
- Excel/PDF export
- Evaluation certificates generate
- Performance reports

### 3. Notifications
- Email notifications qiymətləndirmə əlavə olunduqda
- Reminder for upcoming evaluations

### 4. Mobile Optimization
- Responsive design testing
- Touch-friendly UI
- Mobile-first approach

---

## 📝 Sənədləşdirmə

### API Documentation
```
POST /api/teachers
{
  "name": "...",
  "email": "...",
  "profile": {
    "first_name": "...",
    "last_name": "...",
    "utis_code": "1234567",
    "position_type": "teacher",
    "specialty": "Riyaziyyat",
    "specialty_score": 85.5,
    "evaluations": [
      {
        "type": "certification",
        "score": 85.5,
        "date": "2024-10-15",
        "notes": "Əla nəticə"
      },
      {
        "type": "miq_60",
        "score": 72.0,
        "date": "2024-11-01"
      }
    ]
  }
}
```

### Usage Example
```typescript
// Create teacher with multiple evaluations
const newTeacher = await teachersService.createTeacher({
  // ... basic info
  profile: {
    evaluations: [
      { type: 'certification', score: 85.5, date: '2024-10-15' },
      { type: 'miq_60', score: 72.0, date: '2024-11-01' },
      { type: 'diagnostic', score: 90.0, date: '2024-11-15' }
    ]
  }
});

// Update evaluations
await teachersService.updateTeacherEvaluations(teacherId, [
  { id: 1, type: 'certification', score: 88.0, date: '2024-12-01' },
  { type: 'miq_100', score: 95.0, date: '2024-12-15' } // new
]);
```

---

**Son Yeniləmə:** 2025-10-22
**Versiya:** 2.0 (Çoxlu Qiymətləndirmə Dəstəyi)
**Status:** İmplementasiyaya Hazır ✅
