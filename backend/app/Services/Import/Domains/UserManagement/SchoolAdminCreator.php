<?php

namespace App\Services\Import\Domains\UserManagement;

use App\Models\Institution;
use App\Models\User;
use App\Services\Import\Domains\Processing\BatchOptimizer;
use Illuminate\Support\Facades\Hash;

/**
 * SchoolAdmin Creator Service
 *
 * Creates SchoolAdmin users for level 4 institutions.
 * Handles unique username/email generation with counter appending.
 */
class SchoolAdminCreator
{
    /**
     * Create SchoolAdmin user for institution
     *
     * Steps:
     * 1. Ensure unique username (with counter if needed)
     * 2. Ensure unique email (with counter if needed)
     * 3. Hash password
     * 4. Create user record
     * 5. Assign 'schooladmin' role
     *
     * @param array $schoolAdminData
     * @param Institution $institution
     * @param BatchOptimizer|null $batchOptimizer Optional for batch processing
     * @return User
     */
    public function createSchoolAdmin(
        array $schoolAdminData,
        Institution $institution,
        ?BatchOptimizer $batchOptimizer = null
    ): User {
        // Ensure unique username and email
        $username = $this->ensureUniqueUsername($schoolAdminData['username'], $batchOptimizer);
        $email = $this->ensureUniqueEmail($schoolAdminData['email'], $batchOptimizer);

        $userData = [
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($schoolAdminData['password']),
            'first_name' => $schoolAdminData['first_name'],
            'last_name' => $schoolAdminData['last_name'],
            'phone' => $schoolAdminData['phone'] ?? '',
            'department' => $schoolAdminData['department'] ?? '',
            'institution_id' => $institution->id,
            'is_active' => true,
        ];

        $user = User::create($userData);
        $user->assignRole('schooladmin');

        return $user;
    }

    /**
     * Ensure username is unique by appending numbers if needed
     *
     * Algorithm:
     * 1. Check batch cache (if provided)
     * 2. Check database (for concurrent imports)
     * 3. Append counter (username → username1, username2, etc.)
     * 4. Add to cache to prevent duplicates in same batch
     *
     * @param string $username
     * @param BatchOptimizer|null $batchOptimizer
     * @return string
     */
    protected function ensureUniqueUsername(string $username, ?BatchOptimizer $batchOptimizer = null): string
    {
        $originalUsername = $username;
        $counter = 1;

        // First check in batch cache if available
        if ($batchOptimizer) {
            while ($batchOptimizer->isUsernameCached($username)) {
                $username = $originalUsername . $counter;
                $counter++;
            }
        }

        // Then check database for final verification (in case of concurrent imports)
        while (User::where('username', $username)->exists()) {
            $username = $originalUsername . $counter;
            $counter++;
        }

        // Add to cache to prevent duplicates within the same batch
        if ($batchOptimizer) {
            $batchOptimizer->addUsernameToCache($username);
        }

        return $username;
    }

    /**
     * Ensure email is unique by appending numbers if needed
     *
     * Algorithm:
     * 1. Split email (name@domain)
     * 2. Check batch cache (if provided)
     * 3. Check database
     * 4. Append counter (name@domain → name1@domain, name2@domain, etc.)
     * 5. Add to cache
     *
     * @param string $email
     * @param BatchOptimizer|null $batchOptimizer
     * @return string
     */
    protected function ensureUniqueEmail(string $email, ?BatchOptimizer $batchOptimizer = null): string
    {
        $originalEmail = $email;
        $counter = 1;

        // Split email into name and domain
        $parts = explode('@', $email);
        $emailName = $parts[0];
        $emailDomain = $parts[1] ?? 'atis.az';

        // First check in batch cache if available
        if ($batchOptimizer) {
            while ($batchOptimizer->isEmailCached($email)) {
                $email = $emailName . $counter . '@' . $emailDomain;
                $counter++;
            }
        }

        // Then check database for final verification (in case of concurrent imports)
        while (User::where('email', $email)->exists()) {
            $email = $emailName . $counter . '@' . $emailDomain;
            $counter++;
        }

        // Add to cache to prevent duplicates within the same batch
        if ($batchOptimizer) {
            $batchOptimizer->addEmailToCache($email);
        }

        return $email;
    }
}
