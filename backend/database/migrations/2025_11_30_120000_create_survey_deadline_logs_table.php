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
        Schema::create('survey_deadline_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained()->onDelete('cascade');
            $table->string('event_type', 50);
            $table->string('notification_type', 100)->nullable();
            $table->integer('days_reference')->nullable();
            $table->unsignedInteger('recipient_count')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['survey_id', 'event_type', 'created_at'], 'survey_deadline_logs_event_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_deadline_logs');
    }
};
