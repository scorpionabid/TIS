<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Şagirdlər üçün grade_id tutarsızlığını düzəlt.
     *
     * 2026_03_15 miqrasiyası grade_id-ni sətir uyğunluğu ilə doldurmağa çalışdı.
     * Bu migration uğursuz qalmış halları student_enrollments cədvəlindən düzəldir.
     */
    public function up(): void
    {
        // grade_id olmayan amma class_name olan şagirdləri tap
        $unmatched = DB::table('students')
            ->whereNull('grade_id')
            ->whereNotNull('class_name')
            ->select('id', 'institution_id', 'class_name')
            ->get();

        if ($unmatched->isEmpty()) {
            Log::info('verify_grade_id_consistency: Bütün şagirdlərin grade_id-si mövcuddur.');
            return;
        }

        Log::warning("verify_grade_id_consistency: {$unmatched->count()} şagirdin grade_id-si yoxdur, düzəldilir...");

        $fixed = 0;
        $notFixed = 0;

        foreach ($unmatched as $student) {
            // Aktiv enrollment-dan grade_id tap
            $enrollment = DB::table('student_enrollments')
                ->where('student_id', $student->id)
                ->whereNull('withdrawal_date')
                ->orderByDesc('enrollment_date')
                ->first();

            if ($enrollment && $enrollment->grade_id) {
                DB::table('students')
                    ->where('id', $student->id)
                    ->update(['grade_id' => $enrollment->grade_id]);
                $fixed++;
            } else {
                // Enrollment yoxdursa grades cədvəlindən class_name ilə axtar
                $grade = DB::table('grades')
                    ->where('institution_id', $student->institution_id)
                    ->where('name', $student->class_name)
                    ->first();

                if ($grade) {
                    DB::table('students')
                        ->where('id', $student->id)
                        ->update(['grade_id' => $grade->id]);
                    $fixed++;
                } else {
                    $notFixed++;
                    Log::warning("verify_grade_id_consistency: Şagird #{$student->id} ({$student->class_name}) üçün sinif tapılmadı.");
                }
            }
        }

        Log::info("verify_grade_id_consistency: {$fixed} düzəldildi, {$notFixed} tapılmadı.");
    }

    public function down(): void
    {
        // Bu migration yalnız data repair edir, rollback lazım deyil
    }
};
