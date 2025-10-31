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
        if (!Schema::hasColumn('tasks', 'origin_scope')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('origin_scope', 32)
                    ->nullable()
                    ->after('target_scope')
                    ->comment('Indicates which administrative scope (region/sector) originated the task');
            });

            DB::table('tasks')
                ->where('target_scope', 'regional')
                ->update(['origin_scope' => 'region']);

            DB::table('tasks')
                ->whereIn('target_scope', ['sector', 'sectoral'])
                ->update(['origin_scope' => 'sector']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('tasks', 'origin_scope')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropColumn('origin_scope');
            });
        }
    }
};
