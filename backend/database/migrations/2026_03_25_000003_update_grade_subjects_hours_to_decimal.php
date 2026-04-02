<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('grade_subjects', function (Blueprint $table) {
            $table->decimal('weekly_hours', 5, 2)->default(1)->change();
            $table->decimal('calculated_hours', 5, 2)->default(1)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grade_subjects', function (Blueprint $table) {
            $table->integer('weekly_hours')->default(1)->change();
            $table->integer('calculated_hours')->default(1)->change();
        });
    }
};
