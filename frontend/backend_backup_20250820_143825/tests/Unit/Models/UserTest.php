<?php

namespace Tests\Unit\Models;

use App\Models\User;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends ModelTestCase
{
    use RefreshDatabase;

    /**
     * The model class being tested
     *
     * @var string
     */
    protected $modelClass = User::class;

    /**
     * The attributes that should be tested for required fields
     *
     * @var array
     */
    protected $requiredAttributes = [
        'username',
        'email',
        'password',
    ];

    /**
     * The attributes that should be tested for fillable fields
     *
     * @var array
     */
    protected $fillableAttributes = [
        'username',
        'email',
        'password',
        'role_id',
        'institution_id',
        'department_id',
        'departments',
        'is_active',
        'last_login_at',
        'password_changed_at',
        'failed_login_attempts',
        'locked_until',
        'email_verified_at',
        'remember_token',
    ];

    /**
     * The attributes that should be tested for hidden fields
     *
     * @var array
     */
    protected $hiddenAttributes = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be tested for casts
     *
     * @var array
     */
    protected $casts = [
        'id' => 'int',
        'departments' => 'array',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'password_changed_at' => 'datetime',
        'locked_until' => 'datetime',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'failed_login_attempts' => 'integer',
    ];

    /**
     * Test user creation with minimum required fields
     *
     * @return void
     */
    public function test_user_creation_with_minimum_required_fields()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $this->assertDatabaseHas('users', [
            'username' => 'testuser',
            'email' => 'test@example.com',
            'is_active' => true,
        ]);
    }

    /**
     * Test user belongs to an institution
     *
     * @return void
     */
    public function test_user_belongs_to_institution()
    {
        // Skip if Institution factory doesn't exist
        if (!class_exists('Database\Factories\InstitutionFactory')) {
            $this->markTestSkipped('Institution factory not available');
        }
        
        $institution = Institution::factory()->create();
        $user = User::factory()->create(['institution_id' => $institution->id]);

        $this->assertInstanceOf(Institution::class, $user->institution);
        $this->assertEquals($institution->id, $user->institution->id);
    }

    /**
     * Test user has role relationship
     *
     * @return void
     */
    public function test_user_has_role_relationship()
    {
        $user = User::factory()->create();
        $role = \Spatie\Permission\Models\Role::create(['name' => 'test-role', 'guard_name' => 'web']);
        $user->assignRole($role);

        $this->assertTrue($user->hasRole($role));
    }

    /**
     * Test user has direct permissions
     *
     * @return void
     */
    public function test_user_has_direct_permissions()
    {
        $user = User::factory()->create();
        $permission = \Spatie\Permission\Models\Permission::create(['name' => 'test-permission', 'guard_name' => 'web']);
        $user->givePermissionTo($permission);

        $this->assertTrue($user->hasPermissionTo($permission));
    }

    /**
     * Test user active status
     *
     * @return void
     */
    public function test_user_active_status()
    {
        $user = User::factory()->create(['is_active' => true]);
        $this->assertTrue($user->is_active);

        $user->update(['is_active' => false]);
        $this->assertFalse($user->fresh()->is_active);

        $user->update(['is_active' => true]);
        $this->assertTrue($user->fresh()->is_active);
    }

    /**
     * Test user email verification
     *
     * @return void
     */
    public function test_user_email_verification()
    {
        $user = User::factory()->unverified()->create();
        $this->assertNull($user->email_verified_at);

        $user->markEmailAsVerified();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }
}
