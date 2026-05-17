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
        Schema::table('maintenance_records', function (Blueprint $table) {
            if (! Schema::hasColumn('maintenance_records', 'assigned_to')) {
                $table->foreignId('assigned_to')->nullable()->after('scheduled_by')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('maintenance_records', 'maintenance_category')) {
                $table->string('maintenance_category', 100)->nullable()->after('maintenance_type');
            }
            if (! Schema::hasColumn('maintenance_records', 'estimated_duration')) {
                $table->unsignedSmallInteger('estimated_duration')->nullable()->after('scheduled_date');
            }
            if (! Schema::hasColumn('maintenance_records', 'estimated_cost')) {
                $table->decimal('estimated_cost', 10, 2)->nullable()->after('estimated_duration');
            }
            if (! Schema::hasColumn('maintenance_records', 'parts_needed')) {
                $table->json('parts_needed')->nullable()->after('parts_used');
            }
            if (! Schema::hasColumn('maintenance_records', 'external_service')) {
                $table->boolean('external_service')->default(false)->after('parts_needed');
            }
            if (! Schema::hasColumn('maintenance_records', 'service_provider')) {
                $table->string('service_provider')->nullable()->after('external_service');
            }
            if (! Schema::hasColumn('maintenance_records', 'recurring')) {
                $table->boolean('recurring')->default(false)->after('service_provider');
            }
            if (! Schema::hasColumn('maintenance_records', 'recurring_interval')) {
                $table->string('recurring_interval', 50)->nullable()->after('recurring');
            }
            if (! Schema::hasColumn('maintenance_records', 'parent_maintenance_id')) {
                $table->foreignId('parent_maintenance_id')->nullable()->after('recurring_interval')->constrained('maintenance_records')->nullOnDelete();
            }
            if (! Schema::hasColumn('maintenance_records', 'work_order_number')) {
                $table->string('work_order_number', 40)->nullable()->unique()->after('parent_maintenance_id');
            }
            if (! Schema::hasColumn('maintenance_records', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('scheduled_date');
            }
            if (! Schema::hasColumn('maintenance_records', 'started_by')) {
                $table->foreignId('started_by')->nullable()->after('started_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('maintenance_records', 'actual_start_date')) {
                $table->dateTime('actual_start_date')->nullable()->after('started_by');
            }
            if (! Schema::hasColumn('maintenance_records', 'technician_notes')) {
                $table->text('technician_notes')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('maintenance_records', 'completion_notes')) {
                $table->text('completion_notes')->nullable()->after('work_performed');
            }
            if (! Schema::hasColumn('maintenance_records', 'actual_cost')) {
                $table->decimal('actual_cost', 10, 2)->nullable()->after('cost');
            }
            if (! Schema::hasColumn('maintenance_records', 'actual_duration')) {
                $table->unsignedSmallInteger('actual_duration')->nullable()->after('labor_hours');
            }
            if (! Schema::hasColumn('maintenance_records', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('completion_date');
            }
            if (! Schema::hasColumn('maintenance_records', 'actual_completion_date')) {
                $table->dateTime('actual_completion_date')->nullable()->after('completed_at');
            }
            if (! Schema::hasColumn('maintenance_records', 'completed_by')) {
                $table->foreignId('completed_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('maintenance_records', 'warranty_period')) {
                $table->unsignedSmallInteger('warranty_period')->nullable()->after('warranty_extension_date');
            }
            if (! Schema::hasColumn('maintenance_records', 'quality_check_passed')) {
                $table->boolean('quality_check_passed')->default(true)->after('warranty_period');
            }
            if (! Schema::hasColumn('maintenance_records', 'recommendations')) {
                $table->text('recommendations')->nullable()->after('issues_found');
            }
            if (! Schema::hasColumn('maintenance_records', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('maintenance_records', 'cancelled_by')) {
                $table->foreignId('cancelled_by')->nullable()->after('cancelled_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('maintenance_records', 'cancellation_reason')) {
                $table->string('cancellation_reason')->nullable()->after('cancelled_by');
            }
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_transactions', 'maintenance_record_id')) {
                $table->foreignId('maintenance_record_id')->nullable()->after('item_id')->constrained('maintenance_records')->nullOnDelete();
            }
            if (! Schema::hasColumn('inventory_transactions', 'condition_on_return')) {
                $table->string('condition_on_return')->nullable()->after('transaction_type');
            }
            if (Schema::hasColumn('inventory_transactions', 'transaction_type') && ! Schema::hasColumn('inventory_transactions', 'type')) {
                // No action required, but ensures compatibility with service expectations
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_transactions', 'maintenance_record_id')) {
                $table->dropForeign(['maintenance_record_id']);
                $table->dropColumn('maintenance_record_id');
            }
            if (Schema::hasColumn('inventory_transactions', 'condition_on_return')) {
                $table->dropColumn('condition_on_return');
            }
        });

        Schema::table('maintenance_records', function (Blueprint $table) {
            $dropForeigns = [
                'assigned_to',
                'parent_maintenance_id',
                'started_by',
                'completed_by',
                'cancelled_by',
            ];

            foreach ($dropForeigns as $column) {
                if (Schema::hasColumn('maintenance_records', $column)) {
                    $table->dropForeign([$column]);
                }
            }

            $columns = [
                'assigned_to',
                'maintenance_category',
                'estimated_duration',
                'estimated_cost',
                'parts_needed',
                'external_service',
                'service_provider',
                'recurring',
                'recurring_interval',
                'parent_maintenance_id',
                'work_order_number',
                'started_at',
                'started_by',
                'actual_start_date',
                'technician_notes',
                'completion_notes',
                'actual_cost',
                'actual_duration',
                'completed_at',
                'actual_completion_date',
                'completed_by',
                'warranty_period',
                'quality_check_passed',
                'recommendations',
                'cancelled_at',
                'cancelled_by',
                'cancellation_reason',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('maintenance_records', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
