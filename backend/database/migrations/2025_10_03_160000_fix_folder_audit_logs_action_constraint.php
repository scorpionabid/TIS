<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support ALTER COLUMN, so we need to:
        // 1. Create a new table with correct structure
        // 2. Copy data
        // 3. Drop old table
        // 4. Rename new table
        
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // Get existing data
            $existingData = DB::table('folder_audit_logs')->get();
            
            // Drop the old table
            DB::statement('DROP TABLE IF EXISTS folder_audit_logs_backup');
            DB::statement('ALTER TABLE folder_audit_logs RENAME TO folder_audit_logs_backup');
            
            // Create new table with correct enum values (no CHECK constraint in SQLite)
            DB::statement('
                CREATE TABLE folder_audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    folder_id INTEGER NOT NULL,
                    user_id INTEGER,
                    action VARCHAR NOT NULL,
                    old_data TEXT,
                    new_data TEXT,
                    reason TEXT,
                    ip_address VARCHAR,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY (folder_id) REFERENCES document_collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            ');
            
            // Create indexes (check if not exists)
            DB::statement('CREATE INDEX IF NOT EXISTS folder_audit_logs_folder_id_created_at_index ON folder_audit_logs(folder_id, created_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS folder_audit_logs_user_id_action_index ON folder_audit_logs(user_id, action)');
            DB::statement('CREATE INDEX IF NOT EXISTS folder_audit_logs_action_index ON folder_audit_logs(action)');
            
            // Copy data back
            foreach ($existingData as $row) {
                DB::table('folder_audit_logs')->insert((array) $row);
            }
            
            // Drop backup table
            DB::statement('DROP TABLE folder_audit_logs_backup');
        }
    }

    public function down(): void
    {
        // No need to revert - this is a fix
    }
};
