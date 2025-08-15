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
        Schema::create('psychology_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('psychology_sessions')->onDelete('cascade');
            $table->foreignId('psychologist_id')->constrained('users')->onDelete('cascade');
            
            // Note details
            $table->enum('note_type', ['observation', 'intervention', 'assessment', 'progress', 'concern', 'recommendation', 'follow_up', 'summary']);
            $table->string('title');
            $table->text('content');
            
            // Additional note content
            $table->json('observations')->nullable();
            $table->json('interventions_used')->nullable();
            $table->text('student_response')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('follow_up_actions')->nullable();
            
            // Sharing and confidentiality
            $table->enum('confidentiality_level', ['standard', 'high', 'restricted', 'confidential'])->default('standard');
            $table->boolean('is_shared_with_parents')->default(false);
            $table->boolean('is_shared_with_teachers')->default(false);
            
            // Organization
            $table->json('tags')->nullable();
            $table->json('attachments')->nullable();
            $table->boolean('created_during_session')->default(false);
            
            // Metadata
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['session_id', 'created_at']);
            $table->index(['psychologist_id', 'created_at']);
            $table->index('note_type');
            $table->index('confidentiality_level');
            $table->index(['is_shared_with_parents', 'is_shared_with_teachers']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('psychology_notes');
    }
};