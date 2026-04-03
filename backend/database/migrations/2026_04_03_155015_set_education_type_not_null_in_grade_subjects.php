<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Mövcud NULL dəyərləri 'umumi' ilə doldur
        DB::table('grade_subjects')
            ->whereNull('education_type')
            ->update(['education_type' => 'umumi']);

        // 2. Sütunu NOT NULL + default 'umumi' olaraq dəyişdir
        Schema::table('grade_subjects', function (Blueprint $table) {
            $table->string('education_type')->default('umumi')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('grade_subjects', function (Blueprint $table) {
            $table->string('education_type')->nullable()->default(null)->change();
        });
    }
};
