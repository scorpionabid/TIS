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
            // Check and add missing columns for enhanced survey features
            
            if (!Schema::hasColumn('surveys', 'template_name')) {
                $table->string('template_name')->nullable();
            }
            
            if (!Schema::hasColumn('surveys', 'auto_archive')) {
                $table->boolean('auto_archive')->default(true);
            }
            
            if (!Schema::hasColumn('surveys', 'archive_reason')) {
                $table->string('archive_reason')->nullable();
            }
            
            // 3-level approval workflow
            if (!Schema::hasColumn('surveys', 'approval_status')) {
                $table->enum('approval_status', [
                    'pending',           // Gözləyir
                    'school_approved',   // SchoolAdmin təsdiqi
                    'sector_approved',   // SektorAdmin təsdiqi
                    'region_approved',   // RegionAdmin təsdiqi (final)
                    'rejected'           // Rədd edilib
                ])->default('pending');
            }
            
            if (!Schema::hasColumn('surveys', 'school_approved_by')) {
                $table->foreignId('school_approved_by')->nullable()->constrained('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('surveys', 'school_approved_at')) {
                $table->timestamp('school_approved_at')->nullable();
            }
            
            if (!Schema::hasColumn('surveys', 'sector_approved_by')) {
                $table->foreignId('sector_approved_by')->nullable()->constrained('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('surveys', 'sector_approved_at')) {
                $table->timestamp('sector_approved_at')->nullable();
            }
            
            if (!Schema::hasColumn('surveys', 'region_approved_by')) {
                $table->foreignId('region_approved_by')->nullable()->constrained('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('surveys', 'region_approved_at')) {
                $table->timestamp('region_approved_at')->nullable();
            }
            
            if (!Schema::hasColumn('surveys', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }
            
            // Enhanced metadata
            if (!Schema::hasColumn('surveys', 'targeting_summary')) {
                $table->json('targeting_summary')->nullable()->comment('Summary of targeting (estimated recipients)');
            }
            
            if (!Schema::hasColumn('surveys', 'estimated_recipients')) {
                $table->integer('estimated_recipients')->default(0);
            }
            
            if (!Schema::hasColumn('surveys', 'actual_responses')) {
                $table->integer('actual_responses')->default(0);
            }
            
            // Fix creator_id column name if it exists as 'created_by'
            if (Schema::hasColumn('surveys', 'created_by') && !Schema::hasColumn('surveys', 'creator_id')) {
                $table->renameColumn('created_by', 'creator_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('surveys', function (Blueprint $table) {
            $columnsToCheck = [
                'template_name', 'auto_archive', 'archive_reason', 'approval_status',
                'school_approved_by', 'school_approved_at', 'sector_approved_by', 
                'sector_approved_at', 'region_approved_by', 'region_approved_at',
                'rejection_reason', 'targeting_summary', 'estimated_recipients', 'actual_responses'
            ];
            
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('surveys', $column)) {
                    if (str_contains($column, '_by')) {
                        $table->dropForeign(['surveys_' . $column . '_foreign']);
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }
};