<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Təkrar məktəblərin (dublikatların) birləşdirilməsi.
     * Mənbə: Original (ID < 1000) və Dublikat (ID 1000+)
     */
    protected $mapping = [
        1000 => 361, // Şəki Lisey
        1001 => 363, // Şəki Yeni Çələbixan
        1005 => 362, // Zaqatala Below Tala...
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function () {
            foreach ($this->mapping as $duplicateId => $originalId) {
                $this->mergeInstitution($duplicateId, $originalId);
            }
        });
    }

    /**
     * Məktəbləri birləşdirən əsas məntiq.
     */
    private function mergeInstitution($duplicateId, $originalId)
    {
        // 1. Dublikatın məlumatlarını götürürük
        $duplicate = DB::table('institutions')->where('id', $duplicateId)->first();
        if (!$duplicate) return;

        // 2. Orijinalın UTİS kodunu dublikatdan götürüb yeniləyirik
        // ƏVVƏLCƏ dublikatdakı kodu null edirik ki, unique constraint xətası verməsin
        if (!empty($duplicate->utis_code)) {
            DB::table('institutions')->where('id', $duplicateId)->update(['utis_code' => null]);
            DB::table('institutions')->where('id', $originalId)->update(['utis_code' => $duplicate->utis_code]);
        }

        // 3. Bütün əlaqəli cədvəllərin yenilənməsi
        $tables = $this->getRelatedTables();

        foreach ($tables as $table => $column) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
                try {
                    DB::table($table)
                        ->where($column, $duplicateId)
                        ->update([$column => $originalId]);
                } catch (\Exception $e) {
                    Log::error("Failed to update table {$table}: " . $e->getMessage());
                    // Bəzi cədvəllərdə (məs: audit) unique key xətası ola bilər, davam edirik
                }
            }
        }

        // 3. Dublikatın arxivlənməsi (Soft Delete)
        DB::table('institutions')
            ->where('id', $duplicateId)
            ->update([
                'deleted_at' => now(),
                'name' => $duplicate->name . ' (DUPLICATE - MERGED)',
                'is_active' => false
            ]);

        Log::info("Institution Merge: ID {$duplicateId} merged into ID {$originalId}");
    }

    /**
     * Məktəb ID-sinə istinad edən cədvəllərin siyahısı.
     */
    private function getRelatedTables()
    {
        return [
            'academic_assessments' => 'institution_id',
            'academic_calendars' => 'institution_id',
            'access_tracking' => 'institution_id',
            'activity_logs' => 'institution_id',
            'approval_analytics' => 'institution_id',
            'approval_delegates' => 'institution_id',
            'assessment_analytics' => 'institution_id',
            'assessment_entries' => 'institution_id',
            'assessment_excel_imports' => 'institution_id',
            'assessment_notifications' => 'institution_id',
            'assessment_participants' => 'institution_id',
            'assessment_targets' => 'institution_id',
            'assessment_type_institutions' => 'institution_id',
            'assessment_types' => 'institution_id',
            'attendance_reports' => 'institution_id',
            'audit_logs' => 'institution_id',
            'bsq_results' => 'institution_id',
            'bulk_assessment_sessions' => 'institution_id',
            'class_bulk_attendance' => 'institution_id',
            'classes' => 'institution_id',
            'compliance_monitoring' => 'institution_id',
            'curriculum_plan_approvals' => 'institution_id',
            'curriculum_plans' => 'institution_id',
            'data_approval_requests' => 'institution_id',
            'data_visibility' => 'institution_id',
            'departments' => 'institution_id',
            'document_collections' => 'institution_id',
            'document_collections' => 'owner_institution_id',
            'documents' => 'creator_institution_id',
            'documents' => 'institution_id',
            'education_sectors' => 'region_id',
            'grade_book_sessions' => 'institution_id',
            'grades' => 'institution_id',
            'indicator_values' => 'institution_id',
            'institution_audit_logs' => 'institution_id',
            'inventory_items' => 'institution_id',
            'ksq_results' => 'institution_id',
            'link_shares' => 'institution_id',
            'monitoring_dashboards' => 'institution_id',
            'performance_trends' => 'institution_id',
            'preschool_attendance' => 'institution_id',
            'preschool_attendance_photos' => 'institution_id',
            'psychology_sessions' => 'institution_id',
            'rating_configs' => 'institution_id',
            'ratings' => 'institution_id',
            'region_performance_cache' => 'region_id',
            'regions' => 'institution_id',
            'report_table_responses' => 'institution_id',
            'reports' => 'institution_id',
            'rooms' => 'institution_id',
            'schedule_generation_settings' => 'institution_id',
            'schedule_template_usages' => 'institution_id',
            'schedule_templates' => 'institution_id',
            'schedules' => 'institution_id',
            'school_assessments' => 'institution_id',
            'school_attendance' => 'school_id',
            'school_staff' => 'school_id',
            'sectors' => 'institution_id',
            'security_events' => 'institution_id',
            'statistics' => 'institution_id',
            'students' => 'institution_id',
            'subjects' => 'institution_id',
            'survey_responses' => 'institution_id',
            'task_assignments' => 'institution_id',
            'task_reports' => 'institution_id',
            'task_sub_delegations' => 'delegated_to_institution_id',
            'tasks' => 'assigned_to_institution_id',
            'teacher_evaluations' => 'institution_id',
            'teacher_professional_developments' => 'institution_id',
            'teacher_profiles' => 'institution_id',
            'teacher_workplaces' => 'institution_id',
            'teaching_loads' => 'institution_id',
            'time_slots' => 'institution_id',
            'user_profiles' => 'primary_institution_id',
            'users' => 'institution_id',
        ];
    }

    /**
     * Reverse the migrations (Geri qaytarmaq - çox tövsiyə olunmur).
     */
    public function down(): void
    {
        // Data merge olduğu üçün geri qaytarmaq məntiqsizdir (destructive action).
    }
};
