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
        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->foreignId('technician_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('scheduled_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Maintenance details
            $table->enum('maintenance_type', ['preventive', 'corrective', 'emergency', 'inspection', 'calibration', 'cleaning', 'replacement', 'upgrade', 'repair', 'overhaul']);
            $table->date('maintenance_date')->nullable();
            $table->date('scheduled_date');
            $table->date('completion_date')->nullable();
            $table->text('description');
            $table->text('work_performed')->nullable();
            
            // Parts and materials
            $table->json('parts_used')->nullable();
            $table->decimal('labor_hours', 5, 2)->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->decimal('parts_cost', 10, 2)->nullable();
            $table->decimal('labor_cost', 10, 2)->nullable();
            
            // Vendor information
            $table->string('vendor')->nullable();
            $table->string('invoice_number')->nullable();
            
            // Warranty information
            $table->boolean('warranty_extended')->default(false);
            $table->date('warranty_extension_date')->nullable();
            
            // Condition tracking
            $table->enum('condition_before', ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'])->nullable();
            $table->enum('condition_after', ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'])->nullable();
            
            // Findings and recommendations
            $table->json('issues_found')->nullable();
            $table->json('recommendations')->nullable();
            $table->date('next_maintenance_date')->nullable();
            
            // Status and priority
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'on_hold'])->default('scheduled');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent', 'critical'])->default('medium');
            
            // Additional information
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['item_id', 'scheduled_date']);
            $table->index(['item_id', 'maintenance_date']);
            $table->index(['technician_id', 'scheduled_date']);
            $table->index(['scheduled_by', 'scheduled_date']);
            $table->index(['maintenance_type', 'status']);
            $table->index(['status', 'priority']);
            $table->index('scheduled_date');
            $table->index('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_records');
    }
};