<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * teaching_loads cədvəlindəki NULL education_type dəyərlərini 'umumi' ilə əvəz edir.
     * Bu sahə artıq məcburi olduğundan keçmiş NULL qeydlər düzəldilməlidir.
     */
    public function up(): void
    {
        $affected = DB::table('teaching_loads')
            ->whereNull('education_type')
            ->update(['education_type' => 'umumi']);

        \Illuminate\Support\Facades\Log::info(
            "fix_null_education_type migration: {$affected} teaching_load record(s) updated to 'umumi'."
        );
    }

    /**
     * NULL-a qayıtmaq texniki cəhətdən mümkündür, lakin məntiqsizdir.
     * Vacans hesabı yenidən pozular. Rollback-də heç nə edilmir.
     */
    public function down(): void
    {
        // Intentionally empty — reverting to NULL would re-introduce the data inconsistency.
    }
};
