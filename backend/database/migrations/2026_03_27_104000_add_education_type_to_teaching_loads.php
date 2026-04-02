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
        Schema::table('teaching_loads', function (Blueprint $table) {
            // Add education_type if it doesn't exist
            if (!Schema::hasColumn('teaching_loads', 'education_type')) {
                $table->string('education_type', 50)->nullable()->after('subject_id');
            }

            // Drop old unique index if it exists
            // The name is typically [table]_[columns]_unique
            $table->dropUnique(['teacher_id', 'class_id', 'subject_id', 'academic_year_id']);

            // Create new unique index including education_type
            $table->unique(['teacher_id', 'class_id', 'subject_id', 'academic_year_id', 'education_type'], 'teaching_loads_full_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teaching_loads', function (Blueprint $table) {
            $table->dropUnique('teaching_loads_full_unique');
            
            $table->unique(['teacher_id', 'class_id', 'subject_id', 'academic_year_id']);

            if (Schema::hasColumn('teaching_loads', 'education_type')) {
                $table->dropColumn('education_type');
            }
        });
    }
};
