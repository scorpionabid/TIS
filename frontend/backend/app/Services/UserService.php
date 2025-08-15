<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;

class UserService extends BaseService
{
    protected string $modelClass = User::class;
    
    protected array $relationships = ['role', 'institution', 'profile', 'department'];

    /**
     * Create user with profile
     */
    public function createUserWithProfile(array $userData, array $profileData = []): User
    {
        return DB::transaction(function () use ($userData, $profileData) {
            $user = $this->create([
                'username' => $userData['username'],
                'email' => $userData['email'],
                'password' => Hash::make($userData['password']),
                'role_id' => $userData['role_id'],
                'institution_id' => $userData['institution_id'],
                'department_id' => $userData['department_id'] ?? null,
                'is_active' => $userData['is_active'] ?? true,
            ]);

            if (!empty($profileData)) {
                UserProfile::create(array_merge($profileData, ['user_id' => $user->id]));
            }

            return $user->fresh($this->relationships);
        });
    }

    /**
     * Reset user password
     */
    public function resetUserPassword(int $userId, string $newPassword): User
    {
        return DB::transaction(function () use ($userId, $newPassword) {
            $user = $this->update($userId, [
                'password' => Hash::make($newPassword),
                'password_changed_at' => now(),
                'failed_login_attempts' => 0,
                'locked_until' => null
            ]);

            return $user;
        });
    }

    /**
     * Toggle user status
     */
    public function toggleUserStatus(int $userId, bool $isActive): User
    {
        if (!$isActive && $userId === Auth::id()) {
            throw new Exception('Cannot deactivate your own account');
        }

        return $this->update($userId, ['is_active' => $isActive]);
    }

    /**
     * Get users by role
     */
    public function getUsersByRole(string $roleName): \Illuminate\Database\Eloquent\Collection
    {
        return User::whereHas('role', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        })->with($this->relationships)->get();
    }

    /**
     * Get users by institution
     */
    public function getUsersByInstitution(int $institutionId): \Illuminate\Database\Eloquent\Collection
    {
        return User::where('institution_id', $institutionId)
            ->with($this->relationships)->get();
    }

    /**
     * Find user by username
     */
    public function findByUsername(string $username): ?User
    {
        return User::where('username', $username)
            ->with($this->relationships)->first();
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)
            ->with($this->relationships)->first();
    }
}