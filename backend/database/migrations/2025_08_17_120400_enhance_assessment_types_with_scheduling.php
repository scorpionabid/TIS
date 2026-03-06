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
        Schema::table('assessment_types', function (Blueprint $table) {
            $table->date('due_date')->nullable()->after('subjects');
            $table->boolean('is_recurring')->default(false)->after('due_date');
            $table->enum('recurring_frequency', ['weekly', 'monthly', 'quarterly', 'yearly'])->nullable()->after('is_recurring');
            $table->json('notification_settings')->nullable()->after('recurring_frequency');
            $table->boolean('allows_bulk_entry')->default(true)->after('notification_settings');
            $table->boolean('allows_excel_import')->default(true)->after('allows_bulk_entry');
            $table->json('validation_rules')->nullable()->after('allows_excel_import');
            $table->decimal('minimum_score', 5, 2)->default(0)->after('validation_rules');
            $table->enum('approval_required', ['none', 'teacher', 'admin', 'region'])->default('none')->after('minimum_score');

            // Indexes
            $table->index('due_date');
            $table->index(['is_recurring', 'recurring_frequency']);
            $table->index(['allows_bulk_entry', 'allows_excel_import']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment_types', function (Blueprint $table) {
            $table->dropIndex(['due_date']);
            $table->dropIndex(['is_recurring', 'recurring_frequency']);
            $table->dropIndex(['allows_bulk_entry', 'allows_excel_import']);

            $table->dropColumn([
                'due_date',
                'is_recurring',
                'recurring_frequency',
                'notification_settings',
                'allows_bulk_entry',
                'allows_excel_import',
                'validation_rules',
                'minimum_score',
                'approval_required',
            ]);
        });
    }
};
