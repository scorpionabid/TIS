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
        // Check if scope column already exists (snapshot restore protection)
        if (! Schema::hasColumn('permissions', 'scope')) {
            Schema::table('permissions', function (Blueprint $table) {
                // Add scope column with enum type
                $table->enum('scope', [
                    'global',      // System səviyyəli (SuperAdmin only)
                    'system',      // System əməliyyatları (Level 1-2)
                    'regional',    // Regional əməliyyatlar (Level 1-4)
                    'sector',      // Sektor əməliyyatları (Level 1-6)
                    'institution', // Məktəb səviyyəsi (Level 1-8)
                    'classroom',    // Sinif səviyyəsi (Level 1-10)
                ])->default('institution')->after('action');

                // Add index for better query performance
                $table->index('scope', 'permissions_scope_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            // Drop index first
            $table->dropIndex('permissions_scope_index');

            // Drop scope column
            $table->dropColumn('scope');
        });
    }
};
