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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null'); 
            $table->foreignId('room_id')->nullable()->constrained('rooms')->onDelete('set null');
            
            // Item identification
            $table->enum('category', ['electronics', 'furniture', 'books', 'equipment', 'supplies', 'vehicles', 'sports', 'laboratory', 'medical', 'safety', 'cleaning', 'stationery', 'tools', 'software', 'other']);
            $table->string('subcategory', 100)->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('asset_tag', 50)->unique()->nullable();
            
            // Purchase information
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->string('vendor')->nullable();
            $table->date('warranty_expiry')->nullable();
            
            // Current status
            $table->enum('condition', ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'])->default('good');
            $table->enum('status', ['available', 'in_use', 'maintenance', 'repair', 'retired', 'lost', 'damaged', 'reserved'])->default('available');
            $table->string('location')->nullable();
            
            // Technical specifications
            $table->json('specifications')->nullable();
            $table->json('accessories')->nullable();
            
            // Maintenance information
            $table->json('maintenance_schedule')->nullable();
            $table->date('last_maintenance_date')->nullable();
            $table->date('next_maintenance_date')->nullable();
            
            // Financial information
            $table->decimal('depreciation_rate', 3, 2)->nullable();
            $table->decimal('current_value', 10, 2)->nullable();
            
            // Stock management (for consumables)
            $table->boolean('is_consumable')->default(false);
            $table->integer('stock_quantity')->default(0);
            $table->integer('min_stock_level')->default(0);
            $table->integer('max_stock_level')->default(0);
            $table->string('unit_of_measure', 50)->nullable();
            
            // Tracking codes
            $table->string('barcode', 100)->nullable();
            $table->string('qr_code')->nullable();
            
            // Additional information
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['institution_id', 'category']);
            $table->index(['status', 'condition']);
            $table->index(['assigned_to', 'status']);
            $table->index('category');
            $table->index('asset_tag');
            $table->index('serial_number');
            $table->index(['is_consumable', 'stock_quantity']);
            $table->index('next_maintenance_date');
            $table->index('warranty_expiry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};