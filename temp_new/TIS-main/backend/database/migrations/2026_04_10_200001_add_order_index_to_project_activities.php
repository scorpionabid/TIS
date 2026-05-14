<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            $table->integer('order_index')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            $table->dropColumn('order_index');
        });
    }
};
