<?php

namespace App\Services;

use App\Constants\SubjectConstants;
use App\Models\CurriculumPlan;
use App\Models\CurriculumPlanApproval;
use App\Models\Grade;
use App\Models\Region;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CurriculumPlanService
{
    /** Request ərzindəki approval sorğularını cache-ləyir: "{institutionId}_{yearId}" → CurriculumPlanApproval */
    private array $approvalCache = [];

    /**
     * Müəssisə və il üzrə tədris planını assigned saatlarla birlikdə gətirir.
     */
    public function getPlansWithAssignedHours(int $institutionId, int $yearId): array
    {
        $plans = CurriculumPlan::with('subject:id,name')
            ->where('institution_id', $institutionId)
            ->where('academic_year_id', $yearId)
            ->get();

        $assignedHours = DB::table('teaching_loads')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('classes.institution_id', $institutionId)
            ->where('classes.academic_year_id', $yearId)
            ->whereNull('teaching_loads.deleted_at')
            ->groupBy('teaching_loads.subject_id', DB::raw("COALESCE(NULLIF(LOWER(teaching_loads.education_type), 'ümumi'), 'umumi')"))
            ->select(
                'teaching_loads.subject_id',
                DB::raw("COALESCE(NULLIF(LOWER(teaching_loads.education_type), 'ümumi'), 'umumi') as education_type"),
                DB::raw('SUM(teaching_loads.weekly_hours) as total_assigned')
            )
            ->get();

        $settings = $this->getRegionSettings($institutionId);

        return [
            'items' => $plans,
            'assigned_hours' => $assignedHours,
            'approval' => $this->getApprovalStatus($institutionId, $yearId),
            'deadline' => $settings['deadline'],
            'is_locked' => $settings['is_locked'],
        ];
    }

    /**
     * Tədris planı elementlərini toplu şəkildə əlavə edir və ya yeniləyir.
     */
    public function bulkUpsertPlanItems(int $institutionId, int $yearId, array $items, User $user): void
    {
        if (! $this->isEditable($institutionId, $yearId, $user)) {
            throw new \Exception('Bu tədris planı hazırda redaktə üçün bağlıdır.');
        }

        foreach ($items as $item) {
            CurriculumPlan::updateOrCreate(
                [
                    'institution_id' => $institutionId,
                    'academic_year_id' => $yearId,
                    'class_level' => $item['class_level'],
                    'subject_id' => $item['subject_id'],
                    'education_type' => $item['education_type'],
                    'is_extra' => $item['is_extra'] ?? false,
                ],
                [
                    'hours' => $item['hours'],
                ]
            );
        }
    }

    /**
     * Müəyyən bir fənni müəyyən bir təhsil növü üçün tamamilə silir.
     */
    public function deleteSubjectFromPlan(int $institutionId, int $yearId, int $subjectId, string $eduType, User $user): void
    {
        if (! $this->isEditable($institutionId, $yearId, $user)) {
            throw new \Exception('Bu tədris planı hazırda redaktə üçün bağlıdır.');
        }

        CurriculumPlan::where('institution_id', $institutionId)
            ->where('academic_year_id', $yearId)
            ->where('subject_id', $subjectId)
            ->where('education_type', $eduType)
            ->delete();
    }

    /**
     * Təsdiqləmə statusunu gətirir (eyni request ərzindəki təkrarlı DB sorğuları cache-lənir).
     */
    public function getApprovalStatus(int $institutionId, int $yearId): CurriculumPlanApproval
    {
        $key = "{$institutionId}_{$yearId}";

        if (! isset($this->approvalCache[$key])) {
            $this->approvalCache[$key] = CurriculumPlanApproval::firstOrCreate(
                ['institution_id' => $institutionId, 'academic_year_id' => $yearId],
                ['status' => 'draft']
            );
        }

        return $this->approvalCache[$key];
    }

    /**
     * Status dəyişdikdə cache-i təmizlə.
     */
    private function clearApprovalCache(int $institutionId, int $yearId): void
    {
        unset($this->approvalCache["{$institutionId}_{$yearId}"]);
    }

    /**
     * Planı təsdiqə göndərir.
     */
    public function submitForApproval(int $institutionId, int $yearId, int $userId): void
    {
        $approval = $this->getApprovalStatus($institutionId, $yearId);

        if ($approval->status !== 'draft' && $approval->status !== 'returned') {
            throw new \Exception('Plan artıq göndərilib və ya təsdiqlənib.');
        }

        $approval->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'updated_by_id' => $userId,
        ]);
        $this->clearApprovalCache($institutionId, $yearId);

        Log::info("Curriculum plan submitted for institution {$institutionId}");
    }

    /**
     * Planı təsdiqləyir (Sektor Admin).
     */
    public function approvePlan(int $institutionId, int $yearId, int $userId): void
    {
        $approval = $this->getApprovalStatus($institutionId, $yearId);

        if ($approval->status !== 'submitted') {
            throw new \Exception('Təsdiqləmək üçün plan əvvəlcə göndərilməlidir.');
        }

        $approval->update([
            'status' => 'approved',
            'approved_at' => now(),
            'updated_by_id' => $userId,
        ]);
        $this->clearApprovalCache($institutionId, $yearId);
    }

    /**
     * Planı geri qaytarır (Sektor Admin).
     */
    public function returnPlan(int $institutionId, int $yearId, int $userId, string $comment): void
    {
        $approval = $this->getApprovalStatus($institutionId, $yearId);

        if ($approval->status !== 'submitted') {
            throw new \Exception('Yalnız göndərilmiş planı geri qaytarmaq olar.');
        }

        $approval->update([
            'status' => 'returned',
            'returned_at' => now(),
            'return_comment' => $comment,
            'updated_by_id' => $userId,
        ]);
        $this->clearApprovalCache($institutionId, $yearId);
    }

    /**
     * Planı sıfırlayır (Region Admin / Reset).
     */
    public function resetPlan(int $institutionId, int $yearId, int $userId): void
    {
        $approval = $this->getApprovalStatus($institutionId, $yearId);

        $approval->update([
            'status' => 'draft',
            'updated_by_id' => $userId,
        ]);
        $this->clearApprovalCache($institutionId, $yearId);
    }

    /**
     * Planın redaktə edilə biləcəyini yoxlayır.
     */
    public function isEditable(int $institutionId, int $yearId, User $user): bool
    {
        // 1. Müəssisənin aid olduğu Region tənzimləmələrini yoxlayırıq
        $settings = $this->getRegionSettings($institutionId);

        if ($settings['is_locked']) {
            return false;
        }

        // Əgər Deadline keçibsə
        if ($settings['deadline'] && now()->greaterThan($settings['deadline'])) {
            // Deadline yalnız məktəb adminlərinə təsir etməlidir.
            if (! $user->hasRole(['sektoradmin', 'regionadmin', 'superadmin'])) {
                return false;
            }
        }

        // 2. Rol əsaslı əlavə məhdudiyyətlər (Region Admin tərəfindən qoyulan)
        // DİQQƏT: Bu yoxlama hasAnyRole-dan əvvəl gəlməlidir ki, bypass olmasın.
        if ($user->hasRole('sektoradmin') && ! ($settings['can_sektor_edit'] ?? true)) {
            return false;
        }
        if ($user->hasRole('regionoperator') && ! ($settings['can_operator_edit'] ?? true)) {
            return false;
        }

        // 3. Təsdiqləmə statusu yoxlanışı
        $approval = $this->getApprovalStatus($institutionId, $yearId);

        // Superadmin və Regionadmin hər zaman redaktə edə bilir (kilid yoxdursa)
        if ($user->hasAnyRole(['regionadmin', 'superadmin'])) {
            return true;
        }

        // Sektoradmin və Operator üçün: əgər bura çatıbsa, deməli yuxarıdakı can_edit yoxlamalarından keçib
        if ($user->hasAnyRole(['sektoradmin', 'regionoperator'])) {
            return true;
        }

        // Məktəb admini üçün status yoxlanışı
        return $approval->isEditableBySchool();
    }

    /**
     * Finds the region associated with the given institution and returns its settings.
     * Uses recursive ancestors search for maximum reliability.
     */
    public function getRegionSettings(int $institutionId): array
    {
        $institution = \App\Models\Institution::find($institutionId);

        $regionDeadline = null;
        $isLocked = false;
        $canSektorEdit = true;
        $canOperatorEdit = true;

        if ($institution) {
            $regionInstitutionId = null;

            if ($institution->type === 'regional_education_department') {
                $regionInstitutionId = $institution->id;
            } else {
                // Recursive ancestors search through the hierarchy
                $ancestors = $institution->getAncestors();
                $region = $ancestors->where('type', 'regional_education_department')->first();
                if ($region) {
                    $regionInstitutionId = $region->id;
                }
            }

            if ($regionInstitutionId) {
                $regionRecord = \App\Models\Region::where('institution_id', $regionInstitutionId)->first();
                if ($regionRecord) {
                    $regionDeadline = $regionRecord->curriculum_deadline;
                    $isLocked = $regionRecord->is_curriculum_locked;
                    $canSektorEdit = (bool) ($regionRecord->can_sektor_edit ?? true);
                    $canOperatorEdit = (bool) ($regionRecord->can_operator_edit ?? true);
                }
            }
        }

        return [
            'deadline' => $regionDeadline,
            'is_locked' => $isLocked,
            'can_sektor_edit' => $canSektorEdit,
            'can_operator_edit' => $canOperatorEdit,
        ];
    }

    /**
     * Təsirlənən sinif səviyyələri üçün grades saatlarını curriculum_plans-dan hesablayıb yenilə.
     * Yenilənən sütunlar: curriculum_hours (umumi), individual_hours (ferdi),
     *                     home_hours (evde), special_hours (xususi).
     *
     * @param array<int>|null $classLevels
     */
    public function recalculateGradeCurriculumHours(int $institutionId, int $yearId, ?array $classLevels = null): void
    {
        // Əgər spesifik səviyyələr verilməyibsə, 0-11 arası bütün səviyyələri yeniləyirik.
        $levelsToUpdate = $classLevels ?? range(0, 11);

        foreach ($levelsToUpdate as $level) {
            $base = CurriculumPlan::where('institution_id', $institutionId)
                ->where('academic_year_id', $yearId)
                ->where('class_level', $level);

            $umumi = (clone $base)->where('education_type', 'umumi')->whereNotIn('subject_id', [SubjectConstants::EXTRACURRICULAR_SUBJECT_ID, SubjectConstants::CLUB_SUBJECT_ID])->sum('hours');
            $extra = (clone $base)->where('subject_id', SubjectConstants::EXTRACURRICULAR_SUBJECT_ID)->sum('hours');
            $club = (clone $base)->where('subject_id', SubjectConstants::CLUB_SUBJECT_ID)->sum('hours');
            $ferdi = (clone $base)->where('education_type', 'ferdi')->sum('hours');
            $evde = (clone $base)->where('education_type', 'evde')->sum('hours');
            $xususi = (clone $base)->where('education_type', 'xususi')->sum('hours');

            Grade::where('institution_id', $institutionId)
                ->where('class_level', $level)
                ->update([
                    'curriculum_hours' => $umumi,
                    'extra_hours' => $extra,
                    'club_hours' => $club,
                    'individual_hours' => $ferdi,
                    'home_hours' => $evde,
                    'special_hours' => $xususi,
                ]);
        }
    }
}
