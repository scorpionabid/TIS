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
            // Add education_type column
            $table->string('education_type')->default('umumi')->after('subject_id');

            // Drop old unique constraint
            $table->dropUnique('grade_subject_unique');

            // Add new unique constraint including education_type
            $table->unique(['grade_id', 'subject_id', 'education_type'], 'grade_subject_education_unique');

            // Add index for education_type
            $table->index('education_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grade_subjects', function (Blueprint $table) {
            $table->dropUnique('grade_subject_education_unique');
            $table->unique(['grade_id', 'subject_id'], 'grade_subject_unique');
            $table->dropColumn('education_type');
        });
    }
};
