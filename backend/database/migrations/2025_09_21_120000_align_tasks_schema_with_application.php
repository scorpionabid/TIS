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
        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'target_departments')) {
                $table->json('target_departments')->nullable()->after('target_institutions');
            }

            if (!Schema::hasColumn('tasks', 'target_roles')) {
                $table->json('target_roles')->nullable()->after('target_departments');
            }

            if (!Schema::hasColumn('tasks', 'completion_notes')) {
                $table->text('completion_notes')->nullable()->after('notes');
            }
        });

        // Align enum values with application constants
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // Temporarily widen columns to allow value transformation
            DB::statement("ALTER TABLE tasks MODIFY COLUMN category VARCHAR(50) NOT NULL");
            DB::statement("ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(50) NOT NULL");
            DB::statement("ALTER TABLE tasks MODIFY COLUMN target_scope VARCHAR(50) NOT NULL");

            // Normalize existing values to match new enums
            DB::table('tasks')->where('category', 'hesabat')->update(['category' => 'report']);
            DB::table('tasks')->where('category', 'temir')->update(['category' => 'maintenance']);
            DB::table('tasks')->where('category', 'tedbir')->update(['category' => 'event']);
            DB::table('tasks')->where('category', 'telimat')->update(['category' => 'instruction']);

            DB::table('tasks')->where('priority', 'asagi')->update(['priority' => 'low']);
            DB::table('tasks')->where('priority', 'orta')->update(['priority' => 'medium']);
            DB::table('tasks')->where('priority', 'yuksek')->update(['priority' => 'high']);
            DB::table('tasks')->where('priority', 'tecili')->update(['priority' => 'urgent']);

            DB::table('tasks')->where('target_scope', 'sectoral')->update(['target_scope' => 'sector']);

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN category ENUM(
                    'report',
                    'maintenance',
                    'event',
                    'audit',
                    'instruction',
                    'other'
                ) NOT NULL COMMENT 'Task categories: Reports, Maintenance, Events, Audit, Instructions, Other'
            ");

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN priority ENUM(
                    'low',
                    'medium',
                    'high',
                    'urgent'
                ) NOT NULL DEFAULT 'medium' COMMENT 'Priority levels: Low, Medium, High, Urgent'
            ");

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN target_scope ENUM(
                    'specific',
                    'regional',
                    'sector',
                    'institutional',
                    'all'
                ) NOT NULL DEFAULT 'specific'
            ");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE tasks ALTER COLUMN category TYPE VARCHAR(50)");
            DB::statement("ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(50)");
            DB::statement("ALTER TABLE tasks ALTER COLUMN target_scope TYPE VARCHAR(50)");

            DB::table('tasks')->where('category', 'hesabat')->update(['category' => 'report']);
            DB::table('tasks')->where('category', 'temir')->update(['category' => 'maintenance']);
            DB::table('tasks')->where('category', 'tedbir')->update(['category' => 'event']);
            DB::table('tasks')->where('category', 'telimat')->update(['category' => 'instruction']);

            DB::table('tasks')->where('priority', 'asagi')->update(['priority' => 'low']);
            DB::table('tasks')->where('priority', 'orta')->update(['priority' => 'medium']);
            DB::table('tasks')->where('priority', 'yuksek')->update(['priority' => 'high']);
            DB::table('tasks')->where('priority', 'tecili')->update(['priority' => 'urgent']);

            DB::table('tasks')->where('target_scope', 'sectoral')->update(['target_scope' => 'sector']);
        } elseif ($driver === 'sqlite') {
            // SQLite does not support enum; column type is TEXT already.
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN category VARCHAR(50) NOT NULL");
            DB::statement("ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(50) NOT NULL");
            DB::statement("ALTER TABLE tasks MODIFY COLUMN target_scope VARCHAR(50) NOT NULL");

            DB::table('tasks')->where('category', 'report')->update(['category' => 'hesabat']);
            DB::table('tasks')->where('category', 'maintenance')->update(['category' => 'temir']);
            DB::table('tasks')->where('category', 'event')->update(['category' => 'tedbir']);
            DB::table('tasks')->where('category', 'instruction')->update(['category' => 'telimat']);
            DB::table('tasks')->where('category', 'other')->update(['category' => 'telimat']);
            DB::table('tasks')->where('category', 'other')->update(['category' => 'telimat']); // Fallback for newly added option

            DB::table('tasks')->where('priority', 'low')->update(['priority' => 'asagi']);
            DB::table('tasks')->where('priority', 'medium')->update(['priority' => 'orta']);
            DB::table('tasks')->where('priority', 'high')->update(['priority' => 'yuksek']);
            DB::table('tasks')->where('priority', 'urgent')->update(['priority' => 'tecili']);

            DB::table('tasks')->where('target_scope', 'sector')->update(['target_scope' => 'sectoral']);
            DB::table('tasks')->where('target_scope', 'institutional')->update(['target_scope' => 'specific']);
            DB::table('tasks')->where('target_scope', 'institutional')->update(['target_scope' => 'specific']);

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN category ENUM(
                    'hesabat',
                    'temir',
                    'tedbir',
                    'audit',
                    'telimat'
                ) NOT NULL COMMENT 'Task categories: Reports, Maintenance, Events, Audit, Instructions'
            ");

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN priority ENUM(
                    'asagi',
                    'orta',
                    'yuksek',
                    'tecili'
                ) NOT NULL DEFAULT 'orta' COMMENT 'Priority levels: Low, Medium, High, Critical'
            ");

            DB::statement("
                ALTER TABLE tasks
                MODIFY COLUMN target_scope ENUM(
                    'specific',
                    'regional',
                    'sectoral',
                    'all'
                ) NOT NULL DEFAULT 'specific'
            ");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE tasks ALTER COLUMN category TYPE VARCHAR(16)");
            DB::statement("ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(16)");
            DB::statement("ALTER TABLE tasks ALTER COLUMN target_scope TYPE VARCHAR(16)");

            DB::table('tasks')->where('category', 'report')->update(['category' => 'hesabat']);
            DB::table('tasks')->where('category', 'maintenance')->update(['category' => 'temir']);
            DB::table('tasks')->where('category', 'event')->update(['category' => 'tedbir']);
            DB::table('tasks')->where('category', 'instruction')->update(['category' => 'telimat']);

            DB::table('tasks')->where('priority', 'low')->update(['priority' => 'asagi']);
            DB::table('tasks')->where('priority', 'medium')->update(['priority' => 'orta']);
            DB::table('tasks')->where('priority', 'high')->update(['priority' => 'yuksek']);
            DB::table('tasks')->where('priority', 'urgent')->update(['priority' => 'tecili']);

            DB::table('tasks')->where('target_scope', 'sector')->update(['target_scope' => 'sectoral']);
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'target_roles')) {
                $table->dropColumn('target_roles');
            }

            if (Schema::hasColumn('tasks', 'target_departments')) {
                $table->dropColumn('target_departments');
            }

            if (Schema::hasColumn('tasks', 'completion_notes')) {
                $table->dropColumn('completion_notes');
            }
        });
    }
};
