<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Subject;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;

class BasicDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('🔧 Seeding basic data (users, institutions, academic years)...');
        
        DB::beginTransaction();
        
        try {
            // 1. Academic Years and Terms
            $this->seedAcademicData();
            
            // 2. Enhanced User Data
            $this->seedUsers();
            
            // 3. Institution Hierarchy with Real Data
            $this->seedInstitutionHierarchy();
            
            // 4. Enhanced Subjects
            $this->call(SubjectSeeder::class);
            
            DB::commit();
            
            $this->command->info('✅ Basic data seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ Basic data seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedAcademicData()
    {
        $this->command->info('📚 Seeding academic years and terms...');
        
        // Academic Years
        $academicYears = [
            ['name' => '2023-2024', 'start_date' => '2023-09-01', 'end_date' => '2024-06-30', 'is_active' => false],
            ['name' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-06-30', 'is_active' => true],
            ['name' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_active' => false],
        ];
        
        foreach ($academicYears as $year) {
            AcademicYear::firstOrCreate(['name' => $year['name']], $year);
        }
        
        // Academic Terms for current year (using direct DB insertion due to missing model)
        $currentYear = AcademicYear::where('is_active', true)->first();
        if ($currentYear) {
            $terms = [
                ['name' => 'I Yarımil', 'start_date' => '2024-09-01', 'end_date' => '2025-01-31', 'academic_year' => $currentYear->name, 'is_active' => true],
                ['name' => 'II Yarımil', 'start_date' => '2025-02-01', 'end_date' => '2025-06-30', 'academic_year' => $currentYear->name, 'is_active' => false],
            ];
            
            foreach ($terms as $term) {
                DB::table('academic_terms')->updateOrInsert(
                    ['name' => $term['name'], 'academic_year' => $term['academic_year']], 
                    array_merge($term, ['created_at' => now()])
                );
            }
        }
    }

    private function seedUsers()
    {
        $this->command->info('👥 Seeding user data...');
        
        // Regional Admins
        $regionAdmins = [
            ['username' => 'region_baku', 'email' => 'baku@edu.az', 'role' => 'regionadmin'],
            ['username' => 'region_ganja', 'email' => 'ganja@edu.az', 'role' => 'regionadmin'],
            ['username' => 'region_sumgait', 'email' => 'sumgait@edu.az', 'role' => 'regionadmin'],
        ];
        
        foreach ($regionAdmins as $admin) {
            $user = User::firstOrCreate(
                ['username' => $admin['username']],
                [
                    'email' => $admin['email'],
                    'password' => bcrypt('admin123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($admin['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
        
        // School Admins
        $schoolAdmins = [
            ['username' => 'school1_admin', 'email' => 'school1@edu.az', 'role' => 'schooladmin'],
            ['username' => 'school2_admin', 'email' => 'school2@edu.az', 'role' => 'schooladmin'],
            ['username' => 'school3_admin', 'email' => 'school3@edu.az', 'role' => 'schooladmin'],
        ];
        
        foreach ($schoolAdmins as $admin) {
            $user = User::firstOrCreate(
                ['username' => $admin['username']],
                [
                    'email' => $admin['email'],
                    'password' => bcrypt('admin123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($admin['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
        
        // Teachers
        $teachers = [
            ['username' => 'teacher1', 'email' => 'teacher1@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher2', 'email' => 'teacher2@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher3', 'email' => 'teacher3@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher4', 'email' => 'teacher4@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher5', 'email' => 'teacher5@edu.az', 'role' => 'müəllim'],
        ];
        
        foreach ($teachers as $teacher) {
            $user = User::firstOrCreate(
                ['username' => $teacher['username']],
                [
                    'email' => $teacher['email'],
                    'password' => bcrypt('teacher123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($teacher['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
    }

    private function seedInstitutionHierarchy()
    {
        $this->command->info('🏢 Seeding institution hierarchy...');
        
        // Check if institutions already exist
        $existingInstitutions = Institution::count();
        
        if ($existingInstitutions === 0) {
            // Call the existing institution hierarchy seeder only if no institutions exist
            $this->call(InstitutionHierarchySeeder::class);
        } else {
            $this->command->info("📝 Institution hierarchy already exists ({$existingInstitutions} institutions found). Skipping...");
        }
        
        // Assign users to institutions
        $this->assignUsersToInstitutions();
    }
    
    private function assignUsersToInstitutions()
    {
        // Get institutions
        $bakuRegion = Institution::where('name', 'like', '%Bakı%')->where('level', 2)->first();
        $ganjaRegion = Institution::where('name', 'like', '%Gəncə%')->where('level', 2)->first();
        $sumgaitRegion = Institution::where('name', 'like', '%Sumqayıt%')->where('level', 2)->first();
        
        $schools = Institution::where('level', 4)->take(3)->get();
        
        // Assign regional admins
        if ($bakuRegion) {
            User::where('username', 'region_baku')->update(['institution_id' => $bakuRegion->id]);
        }
        if ($ganjaRegion) {
            User::where('username', 'region_ganja')->update(['institution_id' => $ganjaRegion->id]);
        }
        if ($sumgaitRegion) {
            User::where('username', 'region_sumgait')->update(['institution_id' => $sumgaitRegion->id]);
        }
        
        // Assign school admins and teachers
        $schoolAdmins = User::whereHas('roles', function($q) {
            $q->where('name', 'schooladmin');
        })->get();
        $teachers = User::whereHas('roles', function($q) {
            $q->where('name', 'müəllim');
        })->get();
        
        foreach ($schools as $index => $school) {
            if (isset($schoolAdmins[$index])) {
                $schoolAdmins[$index]->update(['institution_id' => $school->id]);
            }
        }
        
        foreach ($teachers as $index => $teacher) {
            $school = $schools[$index % $schools->count()];
            $teacher->update(['institution_id' => $school->id]);
        }
    }
}