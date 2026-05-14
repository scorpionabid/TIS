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
            $table->decimal('budget', 12, 2)->default(0)->after('actual_hours');
            $table->unsignedBigInteger('parent_id')->nullable()->after('project_id');
            $table->string('category')->nullable()->after('status'); // e.g. "To-Do", "Completed" grouping

            $table->foreign('parent_id')->references('id')->on('project_activities')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['budget', 'parent_id', 'category']);
        });
    }
};
