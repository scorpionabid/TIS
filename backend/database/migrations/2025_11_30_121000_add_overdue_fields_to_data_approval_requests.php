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
        Schema::table('data_approval_requests', function (Blueprint $table) {
            $table->boolean('is_overdue')->default(false)->after('deadline');
            $table->timestamp('overdue_flagged_at')->nullable()->after('is_overdue');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_approval_requests', function (Blueprint $table) {
            $table->dropColumn(['is_overdue', 'overdue_flagged_at']);
        });
    }
};
