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
        Schema::create('approval_workflow_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('category', ['events', 'tasks', 'surveys', 'documents', 'general'])->default('general');
            $table->json('approval_levels'); // Array of approval level configs
            $table->json('auto_approval_rules')->nullable(); // Conditions for auto-approval
            $table->json('escalation_rules')->nullable(); // Timeout and escalation rules  
            $table->json('notification_settings')->nullable(); // Email/SMS notification settings
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system_template')->default(false); // System vs custom templates
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index(['category', 'is_active']);
            $table->index(['created_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_workflow_templates');
    }
};