<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_recipients', function (Blueprint $table) {
            // Unread count sorğusu üçün composite index
            // WHERE recipient_id = ? AND is_read = false AND deleted_at IS NULL
            $table->index(['recipient_id', 'is_read', 'deleted_at'], 'mr_recipient_read_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::table('message_recipients', function (Blueprint $table) {
            $table->dropIndex('mr_recipient_read_deleted_idx');
        });
    }
};
