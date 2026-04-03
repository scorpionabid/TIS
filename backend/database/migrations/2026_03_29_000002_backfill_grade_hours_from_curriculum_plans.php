<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Mövcud curriculum_plans məlumatlarından grades cədvəlinin
     * individual_hours, home_hours, special_hours sahələrini doldurur.
     * curriculum_hours artıq recalculate ilə doldurulurdu, lakin
     * ferdi/evde/xususi sahələri heç vaxt yazılmamışdı.
     */
    public function up(): void
    {
        // Her müəssisə + il + sinif səviyyəsi üçün education_type üzrə cəmləri hesabla
        $rows = DB::table('curriculum_plans')
            ->selectRaw('institution_id, academic_year_id, class_level, education_type, SUM(hours) as total')
            ->whereIn('education_type', ['ferdi', 'evde', 'xususi'])
            ->groupBy('institution_id', 'academic_year_id', 'class_level', 'education_type')
            ->get();

        $typeToColumn = [
            'ferdi' => 'individual_hours',
            'evde' => 'home_hours',
            'xususi' => 'special_hours',
        ];

        $updated = 0;
        foreach ($rows as $row) {
            $column = $typeToColumn[$row->education_type] ?? null;
            if (! $column) {
                continue;
            }

            $affected = DB::table('grades')
                ->where('institution_id', $row->institution_id)
                ->where('academic_year_id', $row->academic_year_id)
                ->where('class_level', $row->class_level)
                ->update([$column => $row->total]);

            $updated += $affected;
        }

        \Illuminate\Support\Facades\Log::info(
            "backfill_grade_hours migration: {$updated} grade row(s) updated with ferdi/evde/xususi hours."
        );
    }

    public function down(): void
    {
        // Köhnə dəyərlər bilinmədiyindən NULL-a sıfırlamaq da yanlış olar.
        // Rollback saxlanılmır.
    }
};
