<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check');
        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_type_check');
        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_access_level_check');

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_category_check
            CHECK (category IN (
                'administrative',
                'financial',
                'educational',
                'hr',
                'technical',
                'legal',
                'reports',
                'forms',
                'other',
                'policy',
                'report'
            ))
        ");

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_file_type_check
            CHECK (file_type IN ('pdf','excel','word','image','other','document'))
        ");

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_access_level_check
            CHECK (access_level IN ('public','regional','sectoral','institution','restricted'))
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check');
        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_type_check');
        DB::statement('ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_access_level_check');

        // Normalize custom values before restoring original constraints.
        DB::table('documents')
            ->whereIn('category', ['policy', 'report'])
            ->update(['category' => 'other']);

        DB::table('documents')
            ->where('file_type', 'document')
            ->update(['file_type' => 'other']);

        DB::table('documents')
            ->where('access_level', 'restricted')
            ->update(['access_level' => 'institution']);

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_category_check
            CHECK (category IN (
                'administrative',
                'financial',
                'educational',
                'hr',
                'technical',
                'legal',
                'reports',
                'forms',
                'other'
            ))
        ");

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_file_type_check
            CHECK (file_type IN ('pdf','excel','word','image','other'))
        ");

        DB::statement("
            ALTER TABLE documents
            ADD CONSTRAINT documents_access_level_check
            CHECK (access_level IN ('public','regional','sectoral','institution'))
        ");
    }
};
