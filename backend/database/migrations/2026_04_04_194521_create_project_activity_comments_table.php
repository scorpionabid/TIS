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
        Schema::create('project_activity_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_activity_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained();
            $table->text('comment');
            $table->string('type')->default('comment'); // comment, status_change, etc.
            $table->json('attachments')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_activity_comments');
    }
};
