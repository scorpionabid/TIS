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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable()->comment('Reply-to message ID');
            $table->text('body');
            $table->timestamps();
            $table->softDeletes()->comment('Sender-side soft delete');

            $table->index('sender_id');
            $table->index('parent_id');
            $table->index('created_at');
        });

        // Self-referencing FK added after table creation to avoid forward-reference issue
        Schema::table('messages', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('messages')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
        });

        Schema::dropIfExists('messages');
    }
};
