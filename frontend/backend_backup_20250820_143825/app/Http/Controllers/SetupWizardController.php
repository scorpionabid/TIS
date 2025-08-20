<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class SetupWizardController extends Controller
{
    /**
     * Check if system needs initial setup
     */
    public function checkSetupStatus(): JsonResponse
    {
        try {
            // Check if superadmin exists
            $superAdminExists = User::whereHas('roles', function($q) {
                $q->where('name', 'superadmin');
            })->exists();

            // Check if basic institutions exist
            $institutionsExist = Institution::where('level', 1)->exists();

            // Check if roles and permissions are properly configured
            $rolesConfigured = Role::count() >= 5; // At least 5 basic roles
            $permissionsConfigured = Permission::count() >= 20; // Basic permissions

            $needsSetup = !($superAdminExists && $institutionsExist && $rolesConfigured && $permissionsConfigured);

            return response()->json([
                'needs_setup' => $needsSetup,
                'checks' => [
                    'superadmin_exists' => $superAdminExists,
                    'institutions_exist' => $institutionsExist,
                    'roles_configured' => $rolesConfigured,
                    'permissions_configured' => $permissionsConfigured
                ],
                'recommendations' => $this->getSetupRecommendations($needsSetup)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Setup status yoxlanıla bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Initialize basic system configuration
     */
    public function initializeSystem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'superadmin_username' => 'required|string|min:3|max:50|unique:users,username',
            'superadmin_email' => 'required|email|unique:users,email',
            'superadmin_password' => 'required|string|min:8',
            'ministry_name' => 'required|string|max:255',
            'ministry_code' => 'required|string|max:20',
            'system_name' => 'required|string|max:255',
            'system_locale' => 'required|string|in:az,en,tr'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // 1. Create Ministry (Root Institution)
            $ministry = Institution::create([
                'name' => $request->ministry_name,
                'short_name' => $request->ministry_name,
                'type' => 'ministry',
                'level' => 1,
                'parent_id' => null,
                'institution_code' => $request->ministry_code,
                'is_active' => true,
                'established_date' => now(),
                'contact_info' => json_encode([
                    'email' => $request->superadmin_email,
                    'phone' => '+994 12 000-00-00'
                ]),
                'location' => json_encode([
                    'city' => 'Bakı',
                    'country' => 'Azerbaijan'
                ])
            ]);

            // 2. Create SuperAdmin User
            $superAdminUser = User::create([
                'username' => $request->superadmin_username,
                'email' => $request->superadmin_email,
                'password' => Hash::make($request->superadmin_password),
                'full_name' => 'Super Administrator',
                'institution_id' => $ministry->id,
                'is_active' => true,
                'email_verified_at' => now(),
                'password_changed_at' => now()
            ]);

            // 3. Assign SuperAdmin Role
            $superAdminRole = Role::where('name', 'superadmin')->first();
            if ($superAdminRole) {
                $superAdminUser->assignRole($superAdminRole);
            }

            // 4. Create System Configuration
            $this->createSystemConfiguration($request);

            // 5. Initialize Basic Departments for Ministry
            $this->createBasicDepartments($ministry);

            DB::commit();

            return response()->json([
                'message' => 'Sistem uğurla quruldu',
                'data' => [
                    'ministry_id' => $ministry->id,
                    'superadmin_id' => $superAdminUser->id,
                    'next_steps' => [
                        'Regionları yaradın',
                        'Sektorları və məktəbləri qurun',
                        'İstifadəçiləri əlavə edin'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Sistem qurulumu zamanı xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create sample regional structure
     */
    public function createSampleStructure(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'region_name' => 'required|string|max:255',
            'region_code' => 'required|string|max:10',
            'sectors' => 'required|array|min:1',
            'sectors.*.name' => 'required|string|max:255',
            'sectors.*.code' => 'required|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Get ministry
            $ministry = Institution::where('type', 'ministry')->where('level', 1)->first();
            if (!$ministry) {
                return response()->json(['message' => 'Ministry tapılmadı'], 404);
            }

            // Create Region
            $region = Institution::create([
                'name' => $request->region_name,
                'short_name' => $request->region_code,
                'type' => 'regional_education_department',
                'level' => 2,
                'parent_id' => $ministry->id,
                'region_code' => $request->region_code,
                'institution_code' => $request->region_code,
                'is_active' => true,
                'contact_info' => json_encode([
                    'phone' => '+994 12 000-00-00',
                    'email' => strtolower($request->region_code) . '@edu.gov.az'
                ])
            ]);

            // Create Sectors
            $sectors = [];
            foreach ($request->sectors as $sectorData) {
                $sector = Institution::create([
                    'name' => $sectorData['name'],
                    'short_name' => $sectorData['code'],
                    'type' => 'sector_education_office',
                    'level' => 3,
                    'parent_id' => $region->id,
                    'region_code' => $request->region_code,
                    'institution_code' => $sectorData['code'],
                    'is_active' => true,
                    'contact_info' => json_encode([
                        'phone' => '+994 12 000-00-00',
                        'email' => strtolower($sectorData['code']) . '@edu.gov.az'
                    ])
                ]);

                // Create sample departments for sector
                $this->createBasicDepartments($sector);
                
                $sectors[] = $sector;
            }

            // Create sample RegionAdmin user
            $regionAdmin = User::create([
                'username' => strtolower($request->region_code) . '_admin',
                'email' => strtolower($request->region_code) . '.admin@edu.gov.az',
                'password' => Hash::make('admin123'),
                'full_name' => $request->region_name . ' Admin',
                'institution_id' => $region->id,
                'is_active' => true,
                'email_verified_at' => now(),
                'password_changed_at' => now()
            ]);

            $regionAdminRole = Role::where('name', 'regionadmin')->first();
            if ($regionAdminRole) {
                $regionAdmin->assignRole($regionAdminRole);
            }

            DB::commit();

            return response()->json([
                'message' => 'Nümunə struktur uğurla yaradıldı',
                'data' => [
                    'region' => $region,
                    'sectors' => $sectors,
                    'region_admin' => $regionAdmin,
                    'credentials' => [
                        'username' => $regionAdmin->username,
                        'password' => 'admin123',
                        'note' => 'Parol dərhal dəyişdirilməlidir'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Nümunə struktur yaradılarkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate existing data and suggest fixes
     */
    public function validateSystemData(): JsonResponse
    {
        try {
            $issues = [];
            $warnings = [];
            $suggestions = [];

            // Check institutions hierarchy
            $orphanInstitutions = Institution::whereNotNull('parent_id')
                ->whereDoesntHave('parent')
                ->count();
            
            if ($orphanInstitutions > 0) {
                $issues[] = "Valideyn təşkilatı olmayan {$orphanInstitutions} təşkilat tapıldı";
            }

            // Check users without institutions
            $usersWithoutInstitution = User::whereNull('institution_id')->count();
            if ($usersWithoutInstitution > 0) {
                $warnings[] = "Təşkilata təyin edilməmiş {$usersWithoutInstitution} istifadəçi var";
            }

            // Check users without roles
            $usersWithoutRoles = User::whereDoesntHave('roles')->count();
            if ($usersWithoutRoles > 0) {
                $issues[] = "Rolu olmayan {$usersWithoutRoles} istifadəçi var";
            }

            // Check inactive institutions with active users
            $activeUsersInInactiveInstitutions = User::where('is_active', true)
                ->whereHas('institution', function($q) {
                    $q->where('is_active', false);
                })
                ->count();

            if ($activeUsersInInactiveInstitutions > 0) {
                $warnings[] = "Deaktiv təşkilatlarda {$activeUsersInInactiveInstitutions} aktiv istifadəçi var";
            }

            // Performance suggestions
            $totalUsers = User::count();
            $totalInstitutions = Institution::count();
            
            if ($totalUsers > 1000) {
                $suggestions[] = "Çox sayda istifadəçi var ({$totalUsers}). Performans üçün cache aktivləşdirin";
            }

            if ($totalInstitutions > 100) {
                $suggestions[] = "Çox sayda təşkilat var ({$totalInstitutions}). Hierarchical queries optimize edin";
            }

            $overallStatus = empty($issues) ? 'healthy' : 'needs_attention';

            return response()->json([
                'status' => $overallStatus,
                'summary' => [
                    'total_users' => $totalUsers,
                    'total_institutions' => $totalInstitutions,
                    'total_issues' => count($issues),
                    'total_warnings' => count($warnings)
                ],
                'issues' => $issues,
                'warnings' => $warnings,
                'suggestions' => $suggestions,
                'next_actions' => $this->getNextActions($issues, $warnings)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məlumat validasiyası aparıla bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create basic departments for an institution
     */
    private function createBasicDepartments(Institution $institution): void
    {
        $departments = [
            ['name' => 'Maliyyə Şöbəsi', 'type' => 'maliyyə'],
            ['name' => 'İnzibati Şöbə', 'type' => 'inzibati'],
            ['name' => 'Təsərrüfat Şöbəsi', 'type' => 'təsərrüfat'],
            ['name' => 'UBR Şöbəsi', 'type' => 'ubr']
        ];

        foreach ($departments as $dept) {
            Department::create([
                'name' => $dept['name'],
                'department_type' => $dept['type'],
                'institution_id' => $institution->id,
                'is_active' => true
            ]);
        }
    }

    /**
     * Create system configuration
     */
    private function createSystemConfiguration(Request $request): void
    {
        // This would create system-wide configuration
        // For now, we'll just log it
        \Log::info('System configuration created', [
            'system_name' => $request->system_name,
            'locale' => $request->system_locale,
            'setup_at' => now()
        ]);
    }

    /**
     * Get setup recommendations
     */
    private function getSetupRecommendations(bool $needsSetup): array
    {
        if (!$needsSetup) {
            return ['Sistem düzgün qurulub və istifadəyə hazırdır'];
        }

        return [
            'SuperAdmin istifadəçisi yaradın',
            'Əsas təşkilat strukturunu qurun',
            'Roller və icazələri konfiqurasiya edin',
            'Regional strukturu yaradın',
            'Test məlumatları əlavə edin'
        ];
    }

    /**
     * Get next actions based on validation results
     */
    private function getNextActions(array $issues, array $warnings): array
    {
        $actions = [];

        if (!empty($issues)) {
            $actions[] = 'Kritik problemləri həll edin';
        }

        if (!empty($warnings)) {
            $actions[] = 'Xəbərdarlıqları nəzərdən keçirin';
        }

        if (empty($issues) && empty($warnings)) {
            $actions[] = 'Sistem sağlamdır. Rutin yoxlamalar aparın';
        }

        return $actions;
    }
}