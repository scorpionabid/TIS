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
        Schema::table('surveys', function (Blueprint $table) {
            // Add missing fields from Survey model
            if (! Schema::hasColumn('surveys', 'max_questions')) {
                $table->integer('max_questions')->default(10)->after('completion_threshold');
            }

            if (! Schema::hasColumn('surveys', 'current_questions_count')) {
                $table->integer('current_questions_count')->default(0)->after('max_questions');
            }

            if (! Schema::hasColumn('surveys', 'is_template')) {
                $table->boolean('is_template')->default(false)->after('current_questions_count');
            }

            if (! Schema::hasColumn('surveys', 'frequency')) {
                $table->enum('frequency', ['monthly', 'quarterly', 'yearly', 'daily', 'once'])->default('once')->after('survey_type');
            }

            if (! Schema::hasColumn('surveys', 'category')) {
                $table->enum('category', ['statistics', 'finance', 'strategic', 'urgent', 'general'])->default('general')->after('frequency');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('surveys', function (Blueprint $table) {
            $columnsToRemove = ['max_questions', 'current_questions_count', 'is_template', 'frequency', 'category'];

            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('surveys', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
