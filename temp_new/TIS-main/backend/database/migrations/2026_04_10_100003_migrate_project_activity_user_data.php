<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Transfer existing user_id from project_activities to the pivot table
        $activities = DB::table('project_activities')
            ->whereNotNull('user_id')
            ->select('id', 'user_id', 'created_at')
            ->get();

        foreach ($activities as $activity) {
            DB::table('project_activity_user')->insertOrIgnore([
                'project_activity_id' => $activity->id,
                'user_id' => $activity->user_id,
                'assigned_at' => $activity->created_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // No easy rollback for data migration once IDs are consolidated in pivot
    }
};
