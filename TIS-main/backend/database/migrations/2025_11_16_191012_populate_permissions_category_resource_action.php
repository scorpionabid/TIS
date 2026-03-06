<?php

use App\Models\Permission;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all permissions with NULL category, resource, or action
        $permissions = Permission::whereNull('category')
            ->orWhereNull('resource')
            ->orWhereNull('action')
            ->get();

        foreach ($permissions as $permission) {
            $parsed = $this->parsePermissionName($permission->name);

            $permission->update([
                'category' => $permission->category ?? $parsed['category'],
                'resource' => $permission->resource ?? $parsed['resource'],
                'action' => $permission->action ?? $parsed['action'],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally clear the populated fields
        Permission::query()->update([
            'category' => null,
            'resource' => null,
            'action' => null,
        ]);
    }

    /**
     * Parse permission name to extract resource, action, and category.
     */
    private function parsePermissionName(string $permissionName): array
    {
        $result = [
            'resource' => null,
            'action' => null,
            'category' => null,
        ];

        // Handle space-separated format (e.g., "create teacher_performance")
        if (str_contains($permissionName, ' ')) {
            $parts = explode(' ', $permissionName, 2);
            $result['action'] = $parts[0];
            $result['resource'] = $parts[1] ?? null;
            $result['category'] = $this->getCategoryFromResource($parts[1] ?? '');

            return $result;
        }

        // Handle dot-separated format (e.g., "users.create")
        if (str_contains($permissionName, '.')) {
            $parts = explode('.', $permissionName, 2);
            $result['resource'] = $parts[0];
            $result['action'] = $parts[1] ?? null;
            $result['category'] = $this->getCategoryFromResource($parts[0]);

            return $result;
        }

        // Single word permission
        $result['resource'] = $permissionName;
        $result['category'] = $this->getCategoryFromResource($permissionName);

        return $result;
    }

    /**
     * Determine category from resource name.
     */
    private function getCategoryFromResource(string $resource): string
    {
        $categoryMap = [
            'users' => 'users',
            'institutions' => 'institutions',
            'surveys' => 'surveys',
            'survey_responses' => 'surveys',
            'roles' => 'roles',
            'departments' => 'departments',
            'assessments' => 'assessments',
            'assessment-types' => 'assessments',
            'students' => 'students',
            'classes' => 'classes',
            'subjects' => 'subjects',
            'approvals' => 'approvals',
            'rooms' => 'rooms',
            'events' => 'events',
            'psychology' => 'psychology',
            'inventory' => 'inventory',
            'teachers' => 'teachers',
            'teacher_performance' => 'teachers',
            'teaching_loads' => 'teachers',
            'teaching-loads' => 'teachers',
            'tasks' => 'tasks',
            'documents' => 'documents',
            'links' => 'documents',
            'reports' => 'reports',
            'analytics' => 'reports',
            'institution-types' => 'institutions',
            'preschools' => 'institutions',
            'attendance' => 'academic',
            'grades' => 'academic',
            'schedules' => 'academic',
            'system' => 'system',
        ];

        return $categoryMap[$resource] ?? 'other';
    }
};
