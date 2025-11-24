<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use App\Services\BaseService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class InstitutionAdminCreatorService extends BaseService
{
    protected AdminTemplateExtensionService $adminExtension;

    public function __construct()
    {
        $this->adminExtension = new AdminTemplateExtensionService;
    }

    /**
     * Create admin user for institution
     */
    public function createAdminForInstitution(
        Institution $institution,
        ?array $adminData,
        string $institutionTypeKey
    ): array {
        try {
            // If no admin data provided, return success without creating admin
            if (! $adminData || empty($adminData['email'])) {
                return [
                    'success' => true,
                    'admin_created' => false,
                    'message' => 'Admin məlumatları verilmədi, yalnız müəssisə yaradıldı',
                    'admin' => null,
                ];
            }

            // Validate admin data
            $validation = $this->validateAdminDataForCreation($adminData, $institution);
            if (! $validation['valid']) {
                return [
                    'success' => false,
                    'admin_created' => false,
                    'message' => implode('; ', $validation['errors']),
                    'admin' => null,
                ];
            }

            // Check if admin already exists
            $existingAdmin = User::where('email', $adminData['email'])->first();
            if ($existingAdmin) {
                return [
                    'success' => true,
                    'admin_created' => false,
                    'message' => "Admin artıq mövcuddur: {$adminData['email']}",
                    'admin' => $existingAdmin,
                ];
            }

            // Create admin user
            $admin = $this->createAdminUser($adminData, $institution, $institutionTypeKey);

            return [
                'success' => true,
                'admin_created' => true,
                'message' => "Admin uğurla yaradıldı: {$admin->email}",
                'admin' => $admin,
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'admin_created' => false,
                'message' => 'Admin yaradılarkən xəta: ' . $e->getMessage(),
                'admin' => null,
            ];
        }
    }

    /**
     * Create admin user with proper role and institution assignment
     */
    private function createAdminUser(array $adminData, Institution $institution, string $institutionTypeKey): User
    {
        return DB::transaction(function () use ($adminData, $institution, $institutionTypeKey) {
            // Get appropriate role for institution type
            $roleName = $this->adminExtension->getAdminRoleForType($institutionTypeKey);
            $role = Role::where('name', $roleName)->where('guard_name', 'sanctum')->first();

            if (! $role) {
                throw new Exception("Admin rolu tapılmadı: {$roleName}");
            }

            // Generate unique username
            $username = $this->generateUniqueUsername($adminData['username'] ?? $adminData['email']);

            // Use provided password or generate secure one
            $password = $this->processAdminPassword($adminData);

            // Create user
            $admin = User::create([
                'username' => $username,
                'email' => $adminData['email'],
                'password' => Hash::make($password),
                'role_id' => $role->id,
                'institution_id' => $institution->id,
                'is_active' => true,
                'password_changed_at' => now(),
                'preferences' => [
                    'first_name' => $adminData['first_name'] ?? 'Admin',
                    'last_name' => $adminData['last_name'] ?? 'İstifadəçi',
                    'phone' => $adminData['phone'] ?? null,
                    'notes' => $adminData['notes'] ?? null,
                    'auto_generated' => true,
                    'initial_password' => $password, // Store for first-time setup
                    'created_via_import' => true,
                    'import_date' => now()->toDateString(),
                ],
            ]);

            // Assign role using Spatie
            $admin->assignRole($roleName);

            // Log admin creation
            \Log::info('Admin yaradıldı import zamanı', [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'institution_id' => $institution->id,
                'institution_name' => $institution->name,
                'role' => $roleName,
                'username' => $username,
            ]);

            return $admin;
        });
    }

    /**
     * Validate admin data for creation
     */
    private function validateAdminDataForCreation(array $adminData, Institution $institution): array
    {
        $errors = [];

        // Email validation
        if (empty($adminData['email'])) {
            $errors[] = 'Admin email məcburidir';
        } elseif (! filter_var($adminData['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Admin email format düzgün deyil';
        } elseif (User::where('email', $adminData['email'])->exists()) {
            // This is actually handled as a warning/skip in the main flow
        }

        // Institution validation
        if (! $institution || ! $institution->id) {
            $errors[] = 'Müəssisə məlumatları düzgün deyil';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Generate unique username
     */
    private function generateUniqueUsername(string $baseUsername): string
    {
        // Clean base username
        $baseUsername = preg_replace('/[^a-zA-Z0-9_]/', '', strtolower($baseUsername));
        $baseUsername = substr($baseUsername, 0, 20); // Limit length

        if (empty($baseUsername)) {
            $baseUsername = 'admin';
        }

        $username = $baseUsername;
        $counter = 1;

        // Find unique username
        while (User::where('username', $username)->exists() && $counter < 1000) {
            $username = $baseUsername . sprintf('%03d', $counter);
            $counter++;
        }

        return $username;
    }

    /**
     * Process admin password - use provided or generate secure one
     */
    private function processAdminPassword(array $adminData): string
    {
        $providedPassword = $adminData['password'] ?? '';

        if (! empty($providedPassword)) {
            // Validate provided password
            $validation = $this->adminExtension->validatePassword($providedPassword);

            if ($validation['valid']) {
                // Log password acceptance
                \Log::info('Admin import - Parol qəbul edildi', [
                    'email' => $adminData['email'],
                    'strength' => $validation['strength'],
                    'message' => $validation['message'],
                ]);

                return $providedPassword;
            }
            // Log password rejection and generate secure one
            \Log::warning('Admin import - Parol tələbləri qarşılamır, avtomatik yaradılır', [
                'email' => $adminData['email'],
                'provided_password_strength' => $validation['strength'],
                'errors' => $validation['errors'],
                'warnings' => $validation['warnings'],
                'message' => $validation['message'],
            ]);

            return $this->generateSecurePassword();
        }

        // No password provided, generate secure one
        \Log::info('Admin import - Parol verilmədi, avtomatik yaradılır', [
            'email' => $adminData['email'],
        ]);

        return $this->generateSecurePassword();
    }

    /**
     * Generate secure password
     */
    private function generateSecurePassword(): string
    {
        // Generate strong password: 12 characters with mixed case, numbers, and symbols
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';
        $symbols = '!@#$%^&*-_+=';

        $password = '';
        $password .= $uppercase[rand(0, strlen($uppercase) - 1)]; // At least 1 uppercase
        $password .= $lowercase[rand(0, strlen($lowercase) - 1)]; // At least 1 lowercase
        $password .= $numbers[rand(0, strlen($numbers) - 1)]; // At least 1 number
        $password .= $symbols[rand(0, strlen($symbols) - 1)]; // At least 1 symbol

        // Fill remaining 8 characters
        $allChars = $uppercase . $lowercase . $numbers . $symbols;
        for ($i = 4; $i < 12; $i++) {
            $password .= $allChars[rand(0, strlen($allChars) - 1)];
        }

        // Shuffle the password
        return str_shuffle($password);
    }

    /**
     * Get admin creation statistics
     */
    public function getAdminCreationStats(array $results): array
    {
        $totalInstitutions = count($results);
        $adminsCreated = 0;
        $adminsSkipped = 0;
        $adminErrors = 0;

        foreach ($results as $result) {
            if (isset($result['admin_result'])) {
                if ($result['admin_result']['admin_created']) {
                    $adminsCreated++;
                } elseif ($result['admin_result']['success']) {
                    $adminsSkipped++;
                } else {
                    $adminErrors++;
                }
            } else {
                $adminsSkipped++;
            }
        }

        return [
            'total_institutions' => $totalInstitutions,
            'admins_created' => $adminsCreated,
            'admins_skipped' => $adminsSkipped,
            'admin_errors' => $adminErrors,
            'admin_success_rate' => $totalInstitutions > 0 ?
                round(($adminsCreated / $totalInstitutions) * 100, 1) : 0,
        ];
    }

    /**
     * Generate admin credentials summary for notification
     */
    public function generateCredentialsSummary(array $createdAdmins): array
    {
        $summary = [];

        foreach ($createdAdmins as $admin) {
            if ($admin && isset($admin->preferences['initial_password'])) {
                $summary[] = [
                    'institution' => $admin->institution->name ?? 'N/A',
                    'email' => $admin->email,
                    'username' => $admin->username,
                    'password' => $admin->preferences['initial_password'],
                    'role' => $admin->roles->first()->display_name ?? 'N/A',
                ];
            }
        }

        return $summary;
    }

    /**
     * Clean up failed admin creations (rollback functionality)
     */
    public function rollbackAdminCreation(Institution $institution): void
    {
        try {
            DB::transaction(function () use ($institution) {
                // Find admins created for this institution during import
                $admins = User::where('institution_id', $institution->id)
                    ->whereJsonContains('preferences->created_via_import', true)
                    ->get();

                foreach ($admins as $admin) {
                    // Remove role assignments
                    $admin->roles()->detach();

                    // Delete user
                    $admin->delete();

                    \Log::info('Admin rollback edildi', [
                        'admin_id' => $admin->id,
                        'admin_email' => $admin->email,
                        'institution_id' => $institution->id,
                    ]);
                }
            });
        } catch (Exception $e) {
            \Log::error('Admin rollback xətası', [
                'institution_id' => $institution->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update admin assignment for existing institution
     */
    public function updateAdminAssignment(Institution $institution, User $admin): bool
    {
        try {
            DB::transaction(function () use ($institution, $admin) {
                // Update admin's institution assignment
                $admin->update([
                    'institution_id' => $institution->id,
                ]);

                // Ensure proper role assignment
                $expectedRole = $this->adminExtension->getAdminRoleForType($institution->type);
                if (! $admin->hasRole($expectedRole)) {
                    $admin->syncRoles([$expectedRole]);
                }

                \Log::info('Admin təyin edildi mövcud müəssisəyə', [
                    'admin_id' => $admin->id,
                    'institution_id' => $institution->id,
                    'role' => $expectedRole,
                ]);
            });

            return true;
        } catch (Exception $e) {
            \Log::error('Admin təyin xətası', [
                'admin_id' => $admin->id,
                'institution_id' => $institution->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
