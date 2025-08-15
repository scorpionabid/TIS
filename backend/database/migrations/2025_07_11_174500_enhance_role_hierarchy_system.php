<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add role hierarchy columns
        Schema::table('roles', function (Blueprint $table) {
            // Role categories: system roles vs custom roles
            $table->enum('role_category', ['system', 'custom'])->default('custom')->after('level');
            
            // User who created this role (for custom roles)
            $table->unsignedBigInteger('created_by_user_id')->nullable()->after('role_category');
            
            // Hierarchy scope rules (JSON)
            $table->json('hierarchy_scope')->nullable()->after('created_by_user_id');
            
            // What level of roles this role can create
            $table->integer('can_create_roles_below_level')->nullable()->after('hierarchy_scope');
            
            // Maximum institutions this role can manage
            $table->integer('max_institutions_scope')->nullable()->after('can_create_roles_below_level');
            
            // Department access limitations
            $table->json('department_access_rules')->nullable()->after('max_institutions_scope');
            
            // System metadata
            $table->json('system_metadata')->nullable()->after('department_access_rules');
            
            // Add foreign key constraint
            $table->foreign('created_by_user_id')->references('id')->on('users')->onDelete('set null');
            
            // Add index for performance
            $table->index(['role_category', 'level']);
            $table->index('created_by_user_id');
        });

        // Update existing roles to system category
        $this->updateExistingRoles();
        
        // Add level validation constraint (SQLite compatible)
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE roles ADD CONSTRAINT check_role_level_range CHECK (level BETWEEN 1 AND 10)');
        }
        // SQLite doesn't support adding CHECK constraints to existing tables
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['created_by_user_id']);
            
            // Drop indexes
            $table->dropIndex(['role_category', 'level']);
            $table->dropIndex(['created_by_user_id']);
            
            // Drop columns
            $table->dropColumn([
                'role_category',
                'created_by_user_id', 
                'hierarchy_scope',
                'can_create_roles_below_level',
                'max_institutions_scope',
                'department_access_rules',
                'system_metadata'
            ]);
        });
        
        // Drop constraint (SQLite compatible)
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE roles DROP CONSTRAINT IF EXISTS check_role_level_range');
        }
    }

    /**
     * Update existing roles to mark them as system roles
     */
    private function updateExistingRoles(): void
    {
        $systemRoles = [
            'superadmin' => [
                'role_category' => 'system',
                'hierarchy_scope' => [
                    'can_manage_all_roles' => true,
                    'can_create_any_level' => true,
                    'scope' => 'global'
                ],
                'can_create_roles_below_level' => 10,
                'max_institutions_scope' => null, // unlimited
                'system_metadata' => [
                    'is_super_admin' => true,
                    'system_critical' => true,
                    'protected' => true
                ]
            ],
            'regionadmin' => [
                'role_category' => 'system',
                'hierarchy_scope' => [
                    'can_manage_regional_roles' => true,
                    'can_create_levels' => [5, 6, 7, 8, 9, 10],
                    'scope' => 'regional'
                ],
                'can_create_roles_below_level' => 5,
                'max_institutions_scope' => 50,
                'system_metadata' => [
                    'regional_authority' => true,
                    'protected' => true
                ]
            ],
            'sektoradmin' => [
                'role_category' => 'system',
                'hierarchy_scope' => [
                    'can_manage_sector_roles' => true,
                    'can_create_levels' => [7, 8, 9, 10],
                    'scope' => 'sector'
                ],
                'can_create_roles_below_level' => 7,
                'max_institutions_scope' => 20,
                'system_metadata' => [
                    'sector_authority' => true,
                    'protected' => true
                ]
            ],
            'schooladmin' => [
                'role_category' => 'system',
                'hierarchy_scope' => [
                    'can_manage_school_roles' => true,
                    'can_create_levels' => [9, 10],
                    'scope' => 'institution'
                ],
                'can_create_roles_below_level' => 9,
                'max_institutions_scope' => 1,
                'system_metadata' => [
                    'school_authority' => true,
                    'protected' => true
                ]
            ],
            'muellim' => [
                'role_category' => 'system',
                'hierarchy_scope' => [
                    'scope' => 'classroom'
                ],
                'can_create_roles_below_level' => null,
                'max_institutions_scope' => 1,
                'system_metadata' => [
                    'staff_role' => true,
                    'teaching_role' => true
                ]
            ]
        ];

        foreach ($systemRoles as $roleName => $data) {
            Role::where('name', $roleName)->update([
                'role_category' => $data['role_category'],
                'hierarchy_scope' => json_encode($data['hierarchy_scope']),
                'can_create_roles_below_level' => $data['can_create_roles_below_level'],
                'max_institutions_scope' => $data['max_institutions_scope'],
                'system_metadata' => json_encode($data['system_metadata'])
            ]);
        }

        // Update any other existing roles to custom category
        Role::whereNotIn('name', array_keys($systemRoles))->update([
            'role_category' => 'custom'
        ]);
    }
};