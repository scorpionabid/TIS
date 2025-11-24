<?php

namespace Tests\Support;

use App\Models\Institution;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Hash;

/**
 * Shared helpers for preparing authorization context in tests.
 */
trait SeedsDefaultRolesAndPermissions
{
    /**
     * Ensure role and permission tables contain the baseline data.
     */
    protected function seedDefaultRolesAndPermissions(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
    }

    /**
     * Create a test user with the given role and optional permissions.
     *
     * @param string|null          $role        Role name to assign (null skips assignment).
     * @param array<string>        $permissions Additional permissions to grant.
     * @param array<string, mixed> $attributes  Extra user attributes to override defaults.
     */
    protected function createUserWithRole(?string $role = 'superadmin', array $permissions = [], array $attributes = []): User
    {
        $this->seedDefaultRolesAndPermissions();

        $institutionId = $attributes['institution_id'] ?? Institution::factory()->create()->id;

        $baseAttributes = [
            'password' => Hash::make('secret123'),
            'institution_id' => $institutionId,
            'is_active' => true,
        ];

        $user = User::factory()->create(array_merge($baseAttributes, $attributes));

        // Force fill any attributes that are guarded or appended after factory creation
        if (! empty($attributes)) {
            $user->forceFill($attributes);
            $user->save();
        }

        if ($role) {
            $user->assignRole($role);
        }

        if (! empty($permissions)) {
            $user->givePermissionTo($permissions);
        }

        return $user;
    }
}
