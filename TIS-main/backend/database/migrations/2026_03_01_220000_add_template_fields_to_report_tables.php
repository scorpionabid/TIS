<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            // Template flag - marks if this is a reusable template
            $table->boolean('is_template')->default(false)->after('status');
            // Reference to the original template if this was cloned
            $table->foreignId('cloned_from_id')->nullable()->after('is_template')->constrained('report_tables')->nullOnDelete();
            // Template name (optional - for organizing templates)
            $table->string('template_category', 100)->nullable()->after('cloned_from_id');
            
            $table->index('is_template');
            $table->index('cloned_from_id');
        });
    }

    public function down(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            $table->dropForeign(['cloned_from_id']);
            $table->dropColumn(['is_template', 'cloned_from_id', 'template_category']);
        });
    }
};
