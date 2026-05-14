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
            if (! Schema::hasColumn('teaching_loads', 'class_id')) {
                $table->unsignedBigInteger('class_id')->after('subject_id');
                $table->foreign('class_id')->references('id')->on('school_classes')->onDelete('cascade');
            }

            if (! Schema::hasColumn('teaching_loads', 'schedule_generation_status')) {
                $table->enum('schedule_generation_status', [
                    'pending',     // Not yet processed for scheduling
                    'ready',       // Ready for schedule generation
                    'scheduled',   // Successfully scheduled
                    'conflict',    // Has scheduling conflicts
                    'excluded',     // Excluded from automatic scheduling
                ])->default('pending');
            }

            if (! Schema::hasColumn('teaching_loads', 'distribution_pattern')) {
                $table->json('distribution_pattern')->nullable()->comment('How weekly hours should be distributed');
            }

            if (! Schema::hasColumn('teaching_loads', 'priority_level')) {
                $table->integer('priority_level')->default(5)->comment('1=Highest priority, 10=Lowest');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teaching_loads', function (Blueprint $table) {
            if (Schema::hasColumn('teaching_loads', 'class_id')) {
                $table->dropForeign(['class_id']);
                $table->dropColumn('class_id');
            }

            if (Schema::hasColumn('teaching_loads', 'schedule_generation_status')) {
                $table->dropColumn('schedule_generation_status');
            }

            if (Schema::hasColumn('teaching_loads', 'distribution_pattern')) {
                $table->dropColumn('distribution_pattern');
            }

            if (Schema::hasColumn('teaching_loads', 'priority_level')) {
                $table->dropColumn('priority_level');
            }
        });
    }
};
