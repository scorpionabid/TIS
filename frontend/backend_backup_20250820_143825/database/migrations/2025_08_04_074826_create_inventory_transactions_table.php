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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('assigned_from')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Transaction details
            $table->enum('transaction_type', ['purchase', 'assignment', 'return', 'disposal', 'transfer', 'maintenance', 'donation', 'sale', 'adjustment_increase', 'adjustment_decrease', 'lost', 'damaged']);
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->decimal('total_amount', 10, 2)->nullable();
            
            // Quantity tracking
            $table->integer('previous_quantity')->nullable();
            $table->integer('new_quantity')->nullable();
            
            // Transaction metadata
            $table->date('transaction_date');
            $table->string('reference_number')->nullable();
            $table->string('supplier')->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('location_from')->nullable();
            $table->string('location_to')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            
            // Approval workflow
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed', 'cancelled'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            
            // Additional data
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['item_id', 'transaction_date']);
            $table->index(['user_id', 'transaction_date']);
            $table->index(['transaction_type', 'status']);
            $table->index('transaction_date');
            $table->index('status');
            $table->index('approved_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};