<?php

namespace Tests\Unit\Models;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionTest extends ModelTestCase
{
    use RefreshDatabase;

    /**
     * The model to be tested.
     *
     * @return string
     */
    protected function getTestModelClass(): string
    {
        return Permission::class;
    }

    /**
     * Get the required fields for the model.
     *
     * @return array
     */
    protected function getRequiredFields(): array
    {
        return [
            'name' => 'test-permission',
            'guard_name' => 'web',
        ];
    }

    /**
     * Get the fillable attributes for the model.
     *
     * @return array
     */
    protected function getFillableAttributes(): array
    {
        return [
            'name' => 'test-permission',
            'display_name' => 'Test Permission',
            'description' => 'A test permission',
            'guard_name' => 'web',
            'category' => 'test',
            'department' => 'test',
            'resource' => 'test-resource',
            'action' => 'test-action',
            'is_active' => true,
        ];
    }

    /**
     * Get the hidden attributes for the model.
     *
     * @return array
     */
    protected function getHiddenAttributes(): array
    {
        return [];
    }

    /**
     * Get the cast attributes for the model.
     *
     * @return array
     */
    protected function getCastAttributes(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @test */
    public function it_has_roles_relationship()
    {
        $permission = Permission::factory()->create();
        $role = Role::factory()->create();
        
        $permission->roles()->attach($role);
        
        $this->assertInstanceOf('Illuminate\Database\Eloquent\Collection', $permission->roles);
        $this->assertInstanceOf('App\Models\Role', $permission->roles->first());
        $this->assertEquals($role->id, $permission->roles->first()->id);
    }

    /** @test */
    public function it_can_scope_active_permissions()
    {
        $activePermission = Permission::factory()->create(['is_active' => true]);
        $inactivePermission = Permission::factory()->create(['is_active' => false]);
        
        $activePermissions = Permission::active()->get();
        
        $this->assertTrue($activePermissions->contains($activePermission));
        $this->assertFalse($activePermissions->contains($inactivePermission));
    }

    /** @test */
    public function it_can_scope_by_category()
    {
        $category1Permission = Permission::factory()->create(['category' => 'category1']);
        $category2Permission = Permission::factory()->create(['category' => 'category2']);
        
        $result = Permission::byCategory('category1')->get();
        
        $this->assertTrue($result->contains($category1Permission));
        $this->assertFalse($result->contains($category2Permission));
    }

    /** @test */
    public function it_can_scope_by_department()
    {
        $dept1Permission = Permission::factory()->create(['department' => 'dept1']);
        $dept2Permission = Permission::factory()->create(['department' => 'dept2']);
        
        $result = Permission::byDepartment('dept1')->get();
        
        $this->assertTrue($result->contains($dept1Permission));
        $this->assertFalse($result->contains($dept2Permission));
    }

    /** @test */
    public function it_can_scope_by_resource()
    {
        $resource1Permission = Permission::factory()->create(['resource' => 'resource1']);
        $resource2Permission = Permission::factory()->create(['resource' => 'resource2']);
        
        $result = Permission::byResource('resource1')->get();
        
        $this->assertTrue($result->contains($resource1Permission));
        $this->assertFalse($result->contains($resource2Permission));
    }

    /** @test */
    public function it_can_scope_by_action()
    {
        $action1Permission = Permission::factory()->create(['action' => 'action1']);
        $action2Permission = Permission::factory()->create(['action' => 'action2']);
        
        $result = Permission::byAction('action1')->get();
        
        $this->assertTrue($result->contains($action1Permission));
        $this->assertFalse($result->contains($action2Permission));
    }

    /** @test */
    public function it_has_default_values()
    {
        $permission = new Permission();
        
        $this->assertTrue($permission->is_active);
    }
}
