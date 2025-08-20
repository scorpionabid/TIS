<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('uploads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('entity_type', 50)->nullable(); // 'survey_response', 'task', 'document', etc.
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('original_filename', 255);
            $table->string('stored_filename', 255);
            $table->string('file_path', 255);
            $table->string('file_type', 100);
            $table->integer('file_size'); // bytes
            $table->string('mime_type', 100);
            $table->boolean('is_public')->default(false);
            $table->json('metadata')->default('{}');
            $table->timestamp('created_at')->useCurrent();
            
            $table->index('user_id');
            $table->index(['entity_type', 'entity_id']);
            $table->index('file_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('uploads');
    }
};