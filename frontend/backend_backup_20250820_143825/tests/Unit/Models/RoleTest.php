<?php

namespace Tests\Unit\Models;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleTest extends ModelTestCase
{
    use RefreshDatabase;

    /**
     * The model class being tested
     *
     * @var string
     */
    protected $modelClass = Role::class;

    /**
     * The attributes that should be tested for required fields
     *
     * @var array
     */
    protected $requiredAttributes = [
        'name',
        'display_name',
        'guard_name',
    ];

    /**
     * The attributes that should be tested for fillable fields
     *
     * @var array
     */
    protected $fillableAttributes = [
        'name',
        'display_name',
        'description',
        'guard_name',
        'level',
        'department_access',
        'max_institutions',
        'is_active',
    ];

    /**
     * The attributes that should be tested for hidden fields
     *
     * @var array
     */
    protected $hiddenAttributes = [];

    /**
     * The attributes that should be tested for casts
     *
     * @var array
     */
    protected $casts = [
        'id' => 'int',
        'level' => 'integer',
        'department_access' => 'array',
        'max_institutions' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Test role creation with minimum required fields
     *
     * @return void
     */
    public function test_role_creation_with_minimum_required_fields()
    {
        $role = Role::create([
            'name' => 'test-role',
            'display_name' => 'Test Role',
            'guard_name' => 'api',
        ]);

        $this->assertDatabaseHas('roles', [
            'name' => 'test-role',
            'display_name' => 'Test Role',
            'guard_name' => 'api',
        ]);
    }

    /**
     * Test role permissions relationship
     *
     * @return void
     */
    public function test_role_permissions_relationship()
    {
        $role = Role::factory()->create();
        $permission = Permission::create([
            'name' => 'test-permission',
            'display_name' => 'Test Permission',
            'guard_name' => 'api',
        ]);

        $role->permissions()->attach($permission);

        $this->assertInstanceOf('Illuminate\Database\Eloquent\Collection', $role->permissions);
        $this->assertInstanceOf('App\Models\Permission', $role->permissions->first());
        $this->assertEquals($permission->id, $role->permissions->first()->id);
    }

    /**
     * Test hasPermission method
     *
     * @return void
     */
    public function test_has_permission_method()
    {
        $role = Role::factory()->create();
        $permission = Permission::create([
            'name' => 'test-permission',
            'display_name' => 'Test Permission',
            'guard_name' => 'api',
        ]);

        $role->permissions()->attach($permission);

        $this->assertTrue($role->hasPermission('test-permission'));
        $this->assertFalse($role->hasPermission('non-existent-permission'));
    }

    /**
     * Test givePermissionTo and revokePermissionTo methods
     *
     * @return void
     */
    public function test_permission_management_methods()
    {
        $role = Role::factory()->create();
        $permission = Permission::create([
            'name' => 'test-permission',
            'display_name' => 'Test Permission',
            'guard_name' => 'api',
        ]);

        // Test givePermissionTo
        $role->givePermissionTo($permission);
        $this->assertTrue($role->hasPermission('test-permission'));

        // Test revokePermissionTo
        $role->revokePermissionTo($permission);
        $this->assertFalse($role->fresh()->hasPermission('test-permission'));
    }

    /**
     * Test department access methods
     *
     * @return void
     */
    public function test_department_access_methods()
    {
        $role = Role::create([
            'name' => 'test-role',
            'display_name' => 'Test Role',
            'guard_name' => 'api',
            'department_access' => ['it', 'hr'],
        ]);

        $this->assertTrue($role->hasDepartmentAccess('it'));
        $this->assertTrue($role->hasDepartmentAccess('hr'));
        $this->assertFalse($role->hasDepartmentAccess('finance'));
    }

    /**
     * Test active scope
     *
     * @return void
     */
    public function test_active_scope()
    {
        $activeRole = Role::factory()->create(['is_active' => true]);
        $inactiveRole = Role::factory()->create(['is_active' => false]);

        $activeRoles = Role::active()->get();

        $this->assertTrue($activeRoles->contains('id', $activeRole->id));
        $this->assertFalse($activeRoles->contains('id', $inactiveRole->id));
    }

    /**
     * Test default values
     *
     * @return void
     */
    public function test_default_values()
    {
        $role = new Role([
            'name' => 'test-role',
            'display_name' => 'Test Role',
            'guard_name' => 'api',
        ]);

        $this->assertNull($role->level);
        $this->assertNull($role->department_access);
        $this->assertNull($role->max_institutions);
        $this->assertNull($role->description);
        $this->assertNull($role->is_active);
    }
}
