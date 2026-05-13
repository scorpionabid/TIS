<?php

namespace Tests\Feature\RBAC;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;

use Spatie\Permission\Models\Role;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class PreschoolPermissionTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedDefaultRolesAndPermissions();
    }

    #[Test]
    public function required_preschool_permissions_exist(): void
    {
        $permissions = [
            'preschool.groups.manage',
            'preschool.attendance.read',
            'preschool.attendance.write',
            'preschool.attendance.reports',
            'preschool.attendance.export',
        ];

        foreach ($permissions as $permission) {
            $this->assertDatabaseHas('permissions', ['name' => $permission]);
        }
    }

    public static function rolePermissionProvider(): array
    {
        return [
            ['superadmin', 'preschool.groups.manage', true],
            ['schooladmin', 'preschool.groups.manage', true],
            ['regionadmin', 'preschool.groups.manage', false],

            ['superadmin', 'preschool.attendance.read', true],
            ['superadmin', 'preschool.attendance.write', true],
            ['superadmin', 'preschool.attendance.reports', true],
            ['superadmin', 'preschool.attendance.export', true],

            ['schooladmin', 'preschool.attendance.read', true],
            ['schooladmin', 'preschool.attendance.write', true],
            ['schooladmin', 'preschool.attendance.reports', false],

            ['regionadmin', 'preschool.attendance.read', true],
            ['regionadmin', 'preschool.attendance.write', false],
            ['regionadmin', 'preschool.attendance.reports', true],
            ['regionadmin', 'preschool.attendance.export', true],

            ['regionoperator', 'preschool.attendance.read', true],
            ['regionoperator', 'preschool.attendance.reports', true],

            ['sektoradmin', 'preschool.attendance.read', true],
            ['sektoradmin', 'preschool.attendance.reports', true],
        ];
    }

    #[Test]
    public function roles_have_correct_preschool_permissions(): void
    {
        $permissions = self::rolePermissionProvider();

        foreach ($permissions as $data) {
            $roleName = $data[0];
            $permissionName = $data[1];
            $shouldHave = $data[2];
        $role = Role::where('name', $roleName)->where('guard_name', 'sanctum')->first();

        $this->assertNotNull($role, "Role {$roleName} does not exist.");

        if ($shouldHave) {
            $this->assertTrue(
                $role->hasPermissionTo($permissionName),
                "Role {$roleName} should have {$permissionName} permission but doesn't."
            );
        } else {
            $this->assertFalse(
                $role->hasPermissionTo($permissionName),
                "Role {$roleName} should NOT have {$permissionName} permission but does."
            );
        }
        }
    }
}
