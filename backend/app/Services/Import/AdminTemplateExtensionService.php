<?php

namespace App\Services\Import;

use App\Models\InstitutionType;
use App\Services\BaseService;

class AdminTemplateExtensionService extends BaseService
{
    /**
     * Get admin-related headers for templates
     */
    public function getAdminHeaders(): array
    {
        return [
            'Admin Email *',
            'Admin Username', 
            'Admin Ad',
            'Admin Soyad',
            'Admin Parol (boş buraxsanız avtomatik yaradılacaq)',
            'Admin Telefon',
            'Admin Qeydlər'
        ];
    }

    /**
     * Get extended headers with admin columns for institution type
     */
    public function getExtendedHeaders($institutionType, array $baseHeaders): array
    {
        $adminHeaders = $this->getAdminHeaders();
        
        // Insert admin headers after institution data but before status
        $statusIndex = count($baseHeaders) - 1; // Status is usually last
        
        // Insert admin columns before status
        array_splice($baseHeaders, $statusIndex, 0, $adminHeaders);
        
        return $baseHeaders;
    }

    /**
     * Get admin sample data based on institution type
     */
    public function getAdminSampleData($institutionType): array
    {
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'primary_school':
            case 'lyceum':
            case 'gymnasium':
                return [
                    'direktor@numuneschool.edu.az',
                    'direktor001', 
                    'Müdir',
                    'Məmmədov',
                    'Direktor123!',
                    '+994551234567',
                    'Məktəb direktoru'
                ];

            case 'kindergarten':
                return [
                    'mudir@bagcha.edu.az',
                    'mudir001',
                    'Müdir',
                    'Həsənova',
                    'Bagca456!',
                    '+994552345678',
                    'Uşaq bağçası müdiri'
                ];

            case 'sector_education_office':
                return [
                    'sektor@tahsil.gov.az',
                    'sektoradmin001',
                    'Sektor',
                    'Rəhbəri',
                    'Sektor789!',
                    '+994553456789', 
                    'Sektor təhsil idarəsi rəhbəri'
                ];

            case 'regional_education_department':
                return [
                    'region@tahsil.gov.az',
                    'regionadmin001',
                    'Regional',
                    'İdarəçi',
                    'Region012!',
                    '+994554567890',
                    'Regional təhsil idarəsi rəhbəri'
                ];

            default:
                return [
                    'admin@institution.edu.az',
                    'admin001',
                    'Admin',
                    'İstifadəçi',
                    'Admin345!',
                    '+994555678901',
                    'Müəssisə administratoru'
                ];
        }
    }

    /**
     * Get extended sample data for templates
     */
    public function getExtendedSampleData($institutionType, array $baseSampleData): array
    {
        $adminSample = $this->getAdminSampleData($institutionType);
        
        $extendedData = [];
        foreach ($baseSampleData as $row) {
            $extendedRow = $row;
            
            // Insert admin data before status (last element)
            $statusData = array_pop($extendedRow); // Remove status
            $extendedRow = array_merge($extendedRow, $adminSample); // Add admin data
            $extendedRow[] = $statusData; // Add status back
            
            $extendedData[] = $extendedRow;
        }
        
        return $extendedData;
    }

    /**
     * Get role mapping for institution types
     */
    public function getRoleMapping(): array
    {
        return [
            'secondary_school' => 'schooladmin',
            'primary_school' => 'schooladmin',
            'lyceum' => 'schooladmin', 
            'gymnasium' => 'schooladmin',
            'kindergarten' => 'schooladmin',
            'sector_education_office' => 'sektoradmin',
            'regional_education_department' => 'regionadmin',
            'vocational_school' => 'schooladmin',
            'special_education_school' => 'schooladmin',
            'art_school' => 'schooladmin',
            'sports_school' => 'schooladmin'
        ];
    }

    /**
     * Get appropriate admin role for institution type
     */
    public function getAdminRoleForType(string $institutionTypeKey): string
    {
        $mapping = $this->getRoleMapping();
        return $mapping[$institutionTypeKey] ?? 'schooladmin';
    }

    /**
     * Extract admin data from row
     */
    public function extractAdminData(array $row, int $adminStartIndex): ?array
    {
        // Check if admin email is provided
        $adminEmail = trim($row[$adminStartIndex] ?? '');
        if (empty($adminEmail)) {
            return null; // No admin data provided
        }

        return [
            'email' => $adminEmail,
            'username' => trim($row[$adminStartIndex + 1] ?? '') ?: $this->generateUsernameFromEmail($adminEmail),
            'first_name' => trim($row[$adminStartIndex + 2] ?? '') ?: 'Admin',
            'last_name' => trim($row[$adminStartIndex + 3] ?? '') ?: 'İstifadəçi',
            'password' => trim($row[$adminStartIndex + 4] ?? ''), // New password field
            'phone' => trim($row[$adminStartIndex + 5] ?? ''),
            'notes' => trim($row[$adminStartIndex + 6] ?? '')
        ];
    }

    /**
     * Generate username from email if not provided
     */
    private function generateUsernameFromEmail(string $email): string
    {
        $parts = explode('@', $email);
        $username = $parts[0];
        
        // Clean username - only alphanumeric and underscore
        $username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
        
        return strtolower($username);
    }

    /**
     * Validate password strength
     */
    public function validatePassword(string $password): array
    {
        $errors = [];
        $warnings = [];
        
        if (empty($password)) {
            return [
                'valid' => false,
                'strength' => 'empty',
                'errors' => [],
                'warnings' => [],
                'message' => 'Parol boş - avtomatik güclü parol yaradılacaq'
            ];
        }
        
        // Minimum length check
        if (strlen($password) < 8) {
            $errors[] = 'Parol ən azı 8 simvol olmalıdır';
        }
        
        // Character requirements
        $hasUppercase = preg_match('/[A-Z]/', $password);
        $hasLowercase = preg_match('/[a-z]/', $password);
        $hasNumbers = preg_match('/[0-9]/', $password);
        $hasSymbols = preg_match('/[!@#$%^&*\-_+=]/', $password);
        
        if (!$hasUppercase) {
            $warnings[] = 'Böyük hərf əlavə edin (A-Z)';
        }
        if (!$hasLowercase) {
            $warnings[] = 'Kiçik hərf əlavə edin (a-z)';
        }
        if (!$hasNumbers) {
            $warnings[] = 'Rəqəm əlavə edin (0-9)';
        }
        if (!$hasSymbols) {
            $warnings[] = 'Xüsusi simvol əlavə edin (!@#$%^&*-_+=)';
        }
        
        // Strength calculation
        $strengthScore = 0;
        if ($hasUppercase) $strengthScore++;
        if ($hasLowercase) $strengthScore++;
        if ($hasNumbers) $strengthScore++;
        if ($hasSymbols) $strengthScore++;
        if (strlen($password) >= 10) $strengthScore++;
        if (strlen($password) >= 12) $strengthScore++;
        
        $strength = 'weak';
        if ($strengthScore >= 3) $strength = 'medium';
        if ($strengthScore >= 5) $strength = 'strong';
        
        $isValid = empty($errors) && $hasUppercase && $hasLowercase && $hasNumbers;
        
        return [
            'valid' => $isValid,
            'strength' => $strength,
            'errors' => $errors,
            'warnings' => $warnings,
            'message' => $isValid ? "Parol qəbul edildi ({$strength})" : 'Parol tələbləri qarşılamır - avtomatik güclü parol yaradılacaq'
        ];
    }

    /**
     * Validate admin data
     */
    public function validateAdminData(?array $adminData, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        if (!$adminData) {
            return [
                'valid' => true,
                'errors' => $errors,
                'warnings' => ['Admin məlumatları verilməyib, avtomatik yaradılmayacaq']
            ];
        }

        // Validate email
        if (empty($adminData['email'])) {
            $errors[] = "Sətir {$rowNum}: Admin email məcburidir";
        } elseif (!filter_var($adminData['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Sətir {$rowNum}: Admin email format düzgün deyil: {$adminData['email']}";
        }

        // Check if email already exists
        if (!empty($adminData['email']) && \App\Models\User::where('email', $adminData['email'])->exists()) {
            $warnings[] = "Sətir {$rowNum}: Bu email ilə admin artıq mövcuddur: {$adminData['email']}";
        }

        // Validate username
        if (!empty($adminData['username']) && \App\Models\User::where('username', $adminData['username'])->exists()) {
            $warnings[] = "Sətir {$rowNum}: Bu username artıq mövcuddur, avtomatik dəyişdiriləcək: {$adminData['username']}";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }

    /**
     * Get admin column indices for different institution types
     */
    public function getAdminColumnIndices($institutionType): array
    {
        // Calculate based on base headers count
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'primary_school': 
            case 'lyceum':
            case 'gymnasium':
                // Base headers: ID, Ad, Qısa Ad, Valideyn ID, Səviyyə, Region Kodu, Qurum Kodu
                // Type-specific: Şagird Sayı, Müəllim Sayı, Sinif Sayı, Direktor Adı, Telefon, Email, Ünvan
                // Total before admin: 14 columns (0-13)
                return [
                    'start_index' => 14,
                    'email' => 14,
                    'username' => 15,
                    'first_name' => 16,
                    'last_name' => 17,
                    'phone' => 18,
                    'notes' => 19,
                    'status' => 20
                ];

            case 'kindergarten':
                // Similar structure to schools
                return [
                    'start_index' => 14,
                    'email' => 14,
                    'username' => 15,
                    'first_name' => 16,
                    'last_name' => 17,
                    'phone' => 18,
                    'notes' => 19,
                    'status' => 20
                ];

            case 'regional_education_department':
            case 'sector_education_office':
                // Base headers + Telefon, Email, Ünvan, Açıqlama = 11 columns (0-10)
                return [
                    'start_index' => 11,
                    'email' => 11,
                    'username' => 12,
                    'first_name' => 13,
                    'last_name' => 14,
                    'phone' => 15,
                    'notes' => 16,
                    'status' => 17
                ];

            default:
                // Generic case
                return [
                    'start_index' => 12,
                    'email' => 12,
                    'username' => 13,
                    'first_name' => 14,
                    'last_name' => 15,
                    'phone' => 16,
                    'notes' => 17,
                    'status' => 18
                ];
        }
    }
}