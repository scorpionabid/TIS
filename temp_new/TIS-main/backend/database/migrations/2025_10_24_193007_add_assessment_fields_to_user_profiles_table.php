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
        Schema::table('user_profiles', function (Blueprint $table) {
            // Assessment type: sertifikasiya, miq_100, miq_60, diaqnostik
            $table->string('assessment_type', 50)->nullable()->after('certification_score');

            // Assessment score: 0-100 range
            $table->decimal('assessment_score', 5, 2)->nullable()->after('assessment_type');

            // Add indexes for filtering and performance
            $table->index('assessment_type');
            $table->index('assessment_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['assessment_type']);
            $table->dropIndex(['assessment_score']);

            // Drop columns
            $table->dropColumn(['assessment_type', 'assessment_score']);
        });
    }
};
