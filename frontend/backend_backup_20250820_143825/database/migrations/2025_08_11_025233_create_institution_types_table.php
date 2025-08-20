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
        Schema::create('institution_types', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique()->comment('Unique identifier for the institution type');
            $table->string('label', 100)->comment('Display label in Azerbaijani');
            $table->string('label_az', 100)->comment('Azerbaijani label');
            $table->string('label_en', 100)->comment('English label');
            $table->integer('default_level')->nullable()->comment('Default hierarchy level (1-4)');
            $table->json('allowed_parent_types')->default('[]')->comment('Array of parent type keys that this type can have');
            $table->string('icon', 50)->default('School')->comment('Lucide icon name for UI');
            $table->string('color', 20)->default('#3b82f6')->comment('Hex color for UI theming');
            $table->boolean('is_active')->default(true)->comment('Whether this type is available for selection');
            $table->boolean('is_system')->default(false)->comment('System types cannot be deleted');
            $table->json('metadata')->default('{}')->comment('Custom properties and configuration for this type');
            $table->text('description')->nullable()->comment('Description of this institution type');
            $table->timestamps();
            $table->softDeletes();
            
            // Add indexes for performance
            $table->index('key');
            $table->index('is_active');
            $table->index('default_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('institution_types');
    }
};