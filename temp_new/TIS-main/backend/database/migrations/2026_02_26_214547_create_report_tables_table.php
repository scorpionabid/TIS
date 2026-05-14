<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_tables', function (Blueprint $table) {
            $table->id();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->foreignId('creator_id')->constrained('users');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            // [{key: 'col_1', label: 'Ad', type: 'text|number|date'}, ...]
            $table->json('columns');
            $table->unsignedInteger('max_rows')->default(50);
            // Hədəf müəssisə ID-ləri: [1, 2, 3, ...]
            $table->json('target_institutions')->nullable();
            $table->timestamp('deadline')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index('creator_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_tables');
    }
};
