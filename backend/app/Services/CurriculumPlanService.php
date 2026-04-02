<?php

namespace App\Services;

use App\Models\CurriculumPlan;
use App\Models\CurriculumPlanApproval;
use App\Models\Grade;
use App\Models\Region;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CurriculumPlanService
{
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
            ->groupBy('teaching_loads.subject_id', DB::raw("COALESCE(teaching_loads.education_type, 'umumi')"))
            ->select(
                'teaching_loads.subject_id',
                DB::raw("COALESCE(teaching_loads.education_type, 'umumi') as education_type"),
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
        if (!$this->isEditable($institutionId, $yearId, $user)) {
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
        if (!$this->isEditable($institutionId, $yearId, $user)) {
            throw new \Exception('Bu tədris planı hazırda redaktə üçün bağlıdır.');
        }

        CurriculumPlan::where('institution_id', $institutionId)
            ->where('academic_year_id', $yearId)
            ->where('subject_id', $subjectId)
            ->where('education_type', $eduType)
            ->delete();
    }

    /**
     * Təsdiqləmə statusunu gətirir.
     */
    public function getApprovalStatus(int $institutionId, int $yearId): CurriculumPlanApproval
    {
        return CurriculumPlanApproval::firstOrCreate(
            ['institution_id' => $institutionId, 'academic_year_id' => $yearId],
            ['status' => 'draft']
        );
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
    }

    /**
     * Planın redaktə edilə biləcəyini yoxlayır.
     */
    public function isEditable(int $institutionId, int $yearId, User $user): bool
    {
        // 1. Müəssisənin aid olduğu Region tənzimləmələrini yoxlayırıq
        $settings = $this->getRegionSettings($institutionId);

        if ($settings['is_locked']) return false;

        // Əgər Deadline keçibsə
        if ($settings['deadline'] && now()->greaterThan($settings['deadline'])) {
            // Deadline yalnız məktəb adminlərinə təsir etməlidir.
            if (!$user->hasRole(['sektoradmin', 'regionadmin', 'superadmin'])) {
                return false;
            }
        }

        // 2. Rol əsaslı əlavə məhdudiyyətlər (Region Admin tərəfindən qoyulan)
        if ($user->hasRole('sektoradmin') && !($settings['can_sektor_edit'] ?? true)) {
            return false;
        }
        if ($user->hasRole('regionoperator') && !($settings['can_operator_edit'] ?? true)) {
            return false;
        }

        // 3. Təsdiqləmə statusu yoxlanışı
        $approval = $this->getApprovalStatus($institutionId, $yearId);
        
        // Sektor, Region adminləri və Operatorlar redaktə edə bilir (əgər region qlobal kilidləməyibsə və ya icazə verilibsə)
        if ($user->hasAnyRole(['sektoradmin', 'regionadmin', 'superadmin', 'regionoperator'])) {
            return true;
        }

        // Məktəb admini üçün status yoxlanışı
        return $approval->isEditableBySchool();
    }

    /**
     * Finds the region associated with the given institution and returns its settings.
     */
    public function getRegionSettings(int $institutionId): array
    {
        $institution = \App\Models\Institution::with('parent.parent')->find($institutionId);
        
        $regionDeadline = null;
        $isLocked = false;

        if ($institution) {
            $regionInstitutionId = null;

            if ($institution->type === 'regional_education_department') {
                $regionInstitutionId = $institution->id;
            } elseif ($institution->type === 'sector_education_office') {
                $regionInstitutionId = $institution->parent_id;
            } else {
                // Məktəb səviyyəsindədirsə, parent-parent (Sector -> Region)
                $sector = $institution->parent;
                if ($sector) {
                    $regionInstitutionId = $sector->parent_id;
                }
            }

            if ($regionInstitutionId) {
                $regionRecord = Region::where('institution_id', $regionInstitutionId)->first();
                if ($regionRecord) {
                    $regionDeadline = $regionRecord->curriculum_deadline;
                    $isLocked = $regionRecord->is_curriculum_locked;
                    $canSektorEdit = $regionRecord->can_sektor_edit;
                    $canOperatorEdit = $regionRecord->can_operator_edit;
                }
            }
        }

        return [
            'deadline' => $regionDeadline,
            'is_locked' => $isLocked,
            'can_sektor_edit' => $canSektorEdit ?? true,
            'can_operator_edit' => $canOperatorEdit ?? true,
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

            $umumi   = (clone $base)->where('education_type', 'umumi')->whereNotIn('subject_id', [56, 57])->sum('hours');
            $extra   = (clone $base)->where('subject_id', 56)->sum('hours');
            $club    = (clone $base)->where('subject_id', 57)->sum('hours');
            $ferdi   = (clone $base)->where('education_type', 'ferdi')->sum('hours');
            $evde    = (clone $base)->where('education_type', 'evde')->sum('hours');
            $xususi  = (clone $base)->where('education_type', 'xususi')->sum('hours');

            Grade::where('institution_id', $institutionId)
                ->where('class_level', $level)
                ->update([
                    'curriculum_hours'  => $umumi,
                    'extra_hours'       => $extra,
                    'club_hours'        => $club,
                    'individual_hours'  => $ferdi,
                    'home_hours'        => $evde,
                    'special_hours'     => $xususi,
                ]);
        }
    }
}
