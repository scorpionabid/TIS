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
        // Add indexes to grade_book_sessions table
        Schema::table('grade_book_sessions', function (Blueprint $table) {
            $table->index(['institution_id', 'academic_year_id'], 'gb_sessions_inst_year_idx');
            $table->index(['grade_id', 'subject_id'], 'gb_sessions_grade_subj_idx');
            $table->index(['status', 'created_at'], 'gb_sessions_status_created_idx');
        });

        // Add indexes to grade_book_columns table
        Schema::table('grade_book_columns', function (Blueprint $table) {
            $table->index(['grade_book_session_id', 'semester'], 'gb_columns_session_sem_idx');
            $table->index(['grade_book_session_id', 'column_type', 'display_order'], 'gb_columns_session_type_order_idx');
            $table->index(['assessment_type_id'], 'gb_columns_assess_type_idx');
            $table->index(['column_label'], 'gb_columns_label_idx');
        });

        // Add indexes to grade_book_cells table
        Schema::table('grade_book_cells', function (Blueprint $table) {
            $table->index(['grade_book_column_id', 'student_id'], 'gb_cells_col_student_idx');
            $table->index(['student_id', 'recorded_by'], 'gb_cells_student_recorder_idx');
            $table->index(['score'], 'gb_cells_score_idx');
            $table->index(['recorded_at'], 'gb_cells_recorded_at_idx');
        });

        // Add indexes to grade_book_teachers table
        Schema::table('grade_book_teachers', function (Blueprint $table) {
            $table->index(['grade_book_session_id', 'teacher_id'], 'gb_teachers_session_teacher_idx');
            $table->index(['teacher_id', 'is_primary'], 'gb_teachers_teacher_primary_idx');
        });

        // Add composite unique constraint to prevent duplicate cells
        Schema::table('grade_book_cells', function (Blueprint $table) {
            $table->unique(['grade_book_column_id', 'student_id'], 'gb_cells_col_student_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove indexes from grade_book_sessions
        Schema::table('grade_book_sessions', function (Blueprint $table) {
            $table->dropIndex('gb_sessions_inst_year_idx');
            $table->dropIndex('gb_sessions_grade_subj_idx');
            $table->dropIndex('gb_sessions_status_created_idx');
        });

        // Remove indexes from grade_book_columns
        Schema::table('grade_book_columns', function (Blueprint $table) {
            $table->dropIndex('gb_columns_session_sem_idx');
            $table->dropIndex('gb_columns_session_type_order_idx');
            $table->dropIndex('gb_columns_assess_type_idx');
            $table->dropIndex('gb_columns_label_idx');
        });

        // Remove indexes from grade_book_cells
        Schema::table('grade_book_cells', function (Blueprint $table) {
            $table->dropIndex('gb_cells_col_student_idx');
            $table->dropIndex('gb_cells_student_recorder_idx');
            $table->dropIndex('gb_cells_score_idx');
            $table->dropIndex('gb_cells_recorded_at_idx');
            $table->dropUnique('gb_cells_col_student_unique');
        });

        // Remove indexes from grade_book_teachers
        Schema::table('grade_book_teachers', function (Blueprint $table) {
            $table->dropIndex('gb_teachers_session_teacher_idx');
            $table->dropIndex('gb_teachers_teacher_primary_idx');
        });
    }
};
