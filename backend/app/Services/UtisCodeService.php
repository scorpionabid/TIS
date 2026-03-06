<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\UserProfile;

class UtisCodeService
{
    /**
     * Generate unique UTIS code for users (teachers/students) - 7 digits
     */
    public static function generateUserUtisCode(): string
    {
        do {
            $code = str_pad(mt_rand(1000000, 9999999), 7, '0', STR_PAD_LEFT);
        } while (UserProfile::where('utis_code', $code)->exists());

        return $code;
    }

    /**
     * Generate unique UTIS code for institutions (schools/kindergartens) - 8 digits
     */
    public static function generateInstitutionUtisCode(): string
    {
        do {
            $code = str_pad(mt_rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
        } while (Institution::where('utis_code', $code)->exists());

        return $code;
    }

    /**
     * Assign UTIS code to existing user profile if not already present
     */
    public static function ensureUserUtisCode(UserProfile $profile): string
    {
        if (empty($profile->utis_code)) {
            $profile->utis_code = self::generateUserUtisCode();
            $profile->save();
        }

        return $profile->utis_code;
    }

    /**
     * Assign UTIS code to existing institution if not already present
     */
    public static function ensureInstitutionUtisCode(Institution $institution): string
    {
        if (empty($institution->utis_code)) {
            $institution->utis_code = self::generateInstitutionUtisCode();
            $institution->save();
        }

        return $institution->utis_code;
    }

    /**
     * Bulk generate UTIS codes for all existing users without codes
     */
    public static function generateMissingUserCodes(): int
    {
        $updated = 0;
        $profiles = UserProfile::whereNull('utis_code')->orWhere('utis_code', '')->get();

        foreach ($profiles as $profile) {
            self::ensureUserUtisCode($profile);
            $updated++;
        }

        return $updated;
    }

    /**
     * Bulk generate UTIS codes for all existing institutions without codes
     */
    public static function generateMissingInstitutionCodes(): int
    {
        $updated = 0;
        $institutions = Institution::whereNull('utis_code')->orWhere('utis_code', '')->get();

        foreach ($institutions as $institution) {
            self::ensureInstitutionUtisCode($institution);
            $updated++;
        }

        return $updated;
    }

    /**
     * Validate UTIS code format
     */
    public static function validateUtisCode(string $code, string $type = 'user'): bool
    {
        if ($type === 'user') {
            return preg_match('/^\d{7}$/', $code);
        } elseif ($type === 'institution') {
            return preg_match('/^\d{8}$/', $code);
        }

        return false;
    }

    /**
     * Check if UTIS code is unique
     */
    public static function isUtisCodeUnique(string $code, string $type = 'user', ?int $excludeId = null): bool
    {
        if ($type === 'user') {
            $query = UserProfile::where('utis_code', $code);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }

            return ! $query->exists();
        } elseif ($type === 'institution') {
            $query = Institution::where('utis_code', $code);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }

            return ! $query->exists();
        }

        return false;
    }
}
