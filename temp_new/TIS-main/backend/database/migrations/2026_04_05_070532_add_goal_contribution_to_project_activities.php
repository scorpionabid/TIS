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
        Schema::table('project_activities', function (Blueprint $table) {
            $table->decimal('goal_contribution_percentage', 5, 2)->nullable()->after('status')->comment('Hədəf payı (%)');
            $table->string('goal_target')->nullable()->after('goal_contribution_percentage')->comment('Hədəf detalları');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            //
        });
    }
};
