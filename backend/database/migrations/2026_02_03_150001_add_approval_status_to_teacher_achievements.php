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
        Schema::table('teacher_achievements', function (Blueprint $table) {
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('approved')->after('tags');
            $table->text('approval_rejection_reason')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approval_rejection_reason');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('approved_at');
            
            $table->index('approval_status');
            $table->index('approved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_achievements', function (Blueprint $table) {
            $table->dropColumn('approval_status');
            $table->dropColumn('approval_rejection_reason');
            $table->dropColumn('approved_at');
            $table->dropForeign(['approved_by']);
            $table->dropColumn('approved_by');
        });
    }
};
