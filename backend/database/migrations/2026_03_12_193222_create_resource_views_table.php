<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('resource_id');
            $table->enum('resource_type', ['link', 'document']);
            $table->timestamp('first_viewed_at');
            $table->timestamp('last_viewed_at');
            $table->unsignedInteger('view_count')->default(1);
            $table->timestamps();

            $table->unique(['user_id', 'resource_id', 'resource_type']);
            $table->index(['resource_id', 'resource_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_views');
    }
};
