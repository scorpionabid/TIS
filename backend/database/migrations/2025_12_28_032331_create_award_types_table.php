<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Award Types - Əməkdar müəllim, Medal, Fəxri fərman, etc.
     */
    public function up(): void
    {
        Schema::create('award_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique()->comment('Award type: Əməkdar müəllim, Medal, etc.');
            $table->decimal('score_weight', 5, 2)->default(0)->comment('Score weight for this award type (0-100)');
            $table->text('description')->nullable()->comment('Award type description');
            $table->boolean('is_active')->default(true)->comment('Active status');
            $table->timestamps();

            // Indexes
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('award_types');
    }
};
