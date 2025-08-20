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
        Schema::table('departments', function (Blueprint $table) {
            // Add department type field
            $table->string('department_type', 50)->default('general')->after('short_name');
            
            // Add metadata JSONB field for department-specific information
            $table->json('metadata')->nullable()->after('description');
            
            // Add capacity field for department size/personnel count
            $table->integer('capacity')->nullable()->after('metadata');
            
            // Add budget allocation field  
            $table->decimal('budget_allocation', 15, 2)->nullable()->after('capacity');
            
            // Add functional scope field for department responsibilities
            $table->text('functional_scope')->nullable()->after('budget_allocation');
            
            // Add indexes for performance
            $table->index('department_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropIndex(['department_type']);
            $table->dropIndex(['is_active']);
            $table->dropColumn([
                'department_type',
                'metadata', 
                'capacity',
                'budget_allocation',
                'functional_scope'
            ]);
        });
    }
};
