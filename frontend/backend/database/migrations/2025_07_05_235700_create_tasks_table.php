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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->enum('category', [
                'hesabat', 
                'temir', 
                'tedbir', 
                'audit', 
                'telimat'
            ])->comment('Task categories: Reports, Maintenance, Events, Audit, Instructions');
            $table->enum('priority', [
                'asagi', 
                'orta', 
                'yuksek', 
                'tecili'
            ])->default('orta')->comment('Priority levels: Low, Medium, High, Critical');
            $table->enum('status', [
                'pending', 
                'in_progress', 
                'review', 
                'completed', 
                'cancelled'
            ])->default('pending');
            $table->integer('progress')->default(0)->comment('Progress percentage 0-100');
            $table->timestamp('deadline')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            // Task assignment
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_institution_id')->nullable()->constrained('institutions')->onDelete('cascade');
            
            // Hierarchical targeting
            $table->json('target_institutions')->nullable()->comment('JSON array of target institution IDs');
            $table->enum('target_scope', [
                'specific', 
                'regional', 
                'sectoral', 
                'all'
            ])->default('specific');
            
            // Additional fields
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable()->comment('JSON array of file paths');
            $table->boolean('requires_approval')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['status', 'priority']);
            $table->index(['assigned_to', 'status']);
            $table->index(['created_by', 'created_at']);
            $table->index(['deadline']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};