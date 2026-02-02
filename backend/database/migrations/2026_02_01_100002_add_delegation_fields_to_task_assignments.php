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
            $table->boolean('has_sub_delegations')->default(false)->after('completion_data');
            $table->unsignedTinyInteger('sub_delegation_count')->default(0)->after('has_sub_delegations');
            $table->unsignedTinyInteger('completed_sub_delegations')->default(0)->after('sub_delegation_count');
            
            // Indexes for performance
            $table->index('has_sub_delegations');
            $table->index(['sub_delegation_count', 'completed_sub_delegations']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_assignments', function (Blueprint $table) {
            $table->dropIndex(['has_sub_delegations']);
            $table->dropIndex(['sub_delegation_count', 'completed_sub_delegations']);
            $table->dropColumn(['has_sub_delegations', 'sub_delegation_count', 'completed_sub_delegations']);
        });
    }
};
