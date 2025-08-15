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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('room_number', 20)->nullable();
            $table->foreignId('institution_id')->constrained('institutions');
            $table->string('building', 50)->nullable();
            $table->integer('floor')->nullable();
            $table->string('room_type', 50)->nullable(); // 'classroom', 'lab', 'gym', 'library', etc.
            $table->integer('capacity')->nullable();
            $table->json('facilities')->default('[]'); // ['projector', 'whiteboard', 'computers']
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['room_number', 'institution_id']);
            $table->index('institution_id');
            $table->index('room_type');
            $table->index('is_active');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};