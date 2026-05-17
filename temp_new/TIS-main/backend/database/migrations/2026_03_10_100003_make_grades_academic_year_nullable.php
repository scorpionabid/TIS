<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Preschool qrupları akademik il anlayışından istifadə etmir.
 * academic_year_id-ni nullable edib FK-ni nullable FK-ə çeviririk.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->foreignId('academic_year_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Only safe to reverse if no NULLs exist
        Schema::table('grades', function (Blueprint $table) {
            $table->foreignId('academic_year_id')->nullable(false)->change();
        });
    }
};
