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
        Schema::create('folder_institutions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('folder_id');
            $table->unsignedBigInteger('institution_id');
            $table->boolean('can_upload')->default(true);
            $table->timestamps();

            // Foreign keys
            $table->foreign('folder_id')
                ->references('id')
                ->on('document_collections')
                ->onDelete('cascade');

            $table->foreign('institution_id')
                ->references('id')
                ->on('institutions')
                ->onDelete('cascade');

            // Unique constraint - prevent duplicate entries
            $table->unique(['folder_id', 'institution_id']);

            // Index for faster lookups
            $table->index('institution_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('folder_institutions');
    }
};
