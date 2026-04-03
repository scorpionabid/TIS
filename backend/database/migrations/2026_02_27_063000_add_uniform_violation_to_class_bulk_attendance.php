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
        Schema::table('class_bulk_attendance', function (Blueprint $table) {
            // Add uniform violation column - tracks students without proper uniform
            // Applies to present students (those who attended but not in uniform)
            $table->integer('uniform_violation')->default(0)->nullable()->comment('Students attending without proper uniform')->after('evening_unexcused');

            // Add index for performance when filtering by uniform violations
            $table->index('uniform_violation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_bulk_attendance', function (Blueprint $table) {
            $table->dropIndex(['uniform_violation']);
            $table->dropColumn('uniform_violation');
        });
    }
};
