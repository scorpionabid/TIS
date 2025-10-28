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
        Schema::table('task_assignments', function (Blueprint $table) {
            if (!Schema::hasColumn('task_assignments', 'priority')) {
                $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->after('assigned_role');
            }

            if (!Schema::hasColumn('task_assignments', 'progress')) {
                $table->unsignedTinyInteger('progress')->default(0)->after('priority');
            }

            if (!Schema::hasColumn('task_assignments', 'due_date')) {
                $table->timestamp('due_date')->nullable()->after('progress');
            }

            if (!Schema::hasColumn('task_assignments', 'completion_notes')) {
                $table->text('completion_notes')->nullable()->after('completed_at');
            }

            if (!Schema::hasColumn('task_assignments', 'assignment_metadata')) {
                $table->json('assignment_metadata')->nullable()->after('completion_notes');
            }

            if (!Schema::hasColumn('task_assignments', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('assignment_metadata')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('task_assignments', 'updated_by')) {
                $table->dropConstrainedForeignId('updated_by');
            }

            if (Schema::hasColumn('task_assignments', 'assignment_metadata')) {
                $table->dropColumn('assignment_metadata');
            }

            if (Schema::hasColumn('task_assignments', 'completion_notes')) {
                $table->dropColumn('completion_notes');
            }

            if (Schema::hasColumn('task_assignments', 'due_date')) {
                $table->dropColumn('due_date');
            }

            if (Schema::hasColumn('task_assignments', 'progress')) {
                $table->dropColumn('progress');
            }

            if (Schema::hasColumn('task_assignments', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};
