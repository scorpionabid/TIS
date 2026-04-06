<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\Subject;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class MuellimComprehensiveFixSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚀 Alining and Fixing Teacher (Müəllim) Data...');

        DB::beginTransaction();

        try {
            // Faza 1: Sync User Data & Profiles
            $this->phase1_syncUserData();

            // Faza 2: Create Teacher Profiles
            $this->phase2_createTeacherProfiles();

            // Faza 3: Assign Subjects and Workplaces
            $this->phase3_assignSubjectsAndWorkplaces();

            // Faza 4: Fix Permissions
            $this->phase4_fixPermissions();

            DB::commit();
            $this->command->info('✅ Comprehensive Teacher Fix Completed Successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('❌ Fix failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function getTeachers()
    {
        return User::whereHas('roles', function ($query) {
            $query->where('name', 'müəllim');
        })->get();
    }

    private function phase1_syncUserData(): void
    {
        $this->command->info('🔄 Phase 1: Syncing basic user data from profiles...');

        $teachers = $this->getTeachers();
        $syncCount = 0;
        $createdProfiles = 0;

        $basicTeachersData = [
            'teacher1@edu.az' => ['first_name' => 'Aynur',  'last_name' => 'Həsənova',  'utis' => '9990001'],
            'teacher2@edu.az' => ['first_name' => 'Rəşad',  'last_name' => 'Məmmədov',  'utis' => '9990002'],
            'teacher3@edu.az' => ['first_name' => 'Günel',  'last_name' => 'Əliyeva',   'utis' => '9990003'],
            'teacher4@edu.az' => ['first_name' => 'Tural',  'last_name' => 'Quliyev',   'utis' => '9990004'],
            'teacher5@edu.az' => ['first_name' => 'Sevinc', 'last_name' => 'Babayeva',  'utis' => '9990005'],
        ];

        foreach ($teachers as $teacher) {
            $profile = UserProfile::where('user_id', $teacher->id)->first();

            if (!$profile && isset($basicTeachersData[$teacher->email])) {
                $data = $basicTeachersData[$teacher->email];
                $profile = UserProfile::create([
                    'user_id' => $teacher->id,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'utis_code' => $data['utis'],
                    'position_type' => 'muəllim',
                    'employment_status' => 'full_time',
                    'primary_institution_id' => $teacher->institution_id ?? 1,
                ]);
                $createdProfiles++;
            }

            if ($profile) {
                $updateData = [];
                if (empty($teacher->first_name)) $updateData['first_name'] = $profile->first_name;
                if (empty($teacher->last_name)) $updateData['last_name'] = $profile->last_name;
                if (empty($teacher->utis_code)) $updateData['utis_code'] = $profile->utis_code;

                if (!empty($updateData)) {
                    $teacher->update($updateData);
                    $syncCount++;
                }
            }
        }

        $this->command->info("📊 Synced names for {$syncCount} users.");
        $this->command->info("➕ Created missing user_profiles for {$createdProfiles} basic teachers.");
    }

    private function phase2_createTeacherProfiles(): void
    {
        $this->command->info('👤 Phase 2: Creating teacher_profiles records...');

        $teachers = $this->getTeachers();
        $count = 0;

        foreach ($teachers as $teacher) {
            $userProfile = UserProfile::where('user_id', $teacher->id)->first();

            TeacherProfile::updateOrCreate(
                ['user_id' => $teacher->id],
                [
                    'phone' => $userProfile->contact_phone ?? '+994 50 000 00 00',
                    'bio' => 'Təcrübəli müəllim. Peşəkar fəaliyyətini ATİS platforması üzərindən idarə edir.',
                    'experience_years' => $userProfile->experience_years ?? rand(1, 20),
                    'specialization' => $userProfile->specialty ?? $userProfile->speciality ?? 'Müəllim',
                    'institution_id' => $teacher->institution_id ?? 1,
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => 1,
                ]
            );
            $count++;
        }

        $this->command->info("📊 Generated/Updated {$count} teacher_profiles.");
    }

    private function phase3_assignSubjectsAndWorkplaces(): void
    {
        $this->command->info('📚 Phase 3: Mapping specialties to subjects and creating workplaces...');

        $teachers = $this->getTeachers();
        $subjectCount = 0;
        $workplaceCount = 0;

        $specialtyToId = [
            'riyaziyyat'                        => 1,
            'azərbaycan dili'                   => 2,
            'azərbaycan dili və ədəbiyyat'      => 2,
            'azərbaycan dili və ədəbiyyatı'     => 2,
            'fizika'                            => 3,
            'kimya'                             => 4,
            'biologiya'                         => 5,
            'ingilis dili'                      => 6,
            'rus dili'                          => 7,
            'tarix'                             => 14,
            'coğrafiya'                         => 9,
            'informatika'                       => 10,
            'musiqi'                            => 11,
            'təsviri incəsənət'                 => 12,
            'fiziki tərbiyə'                    => 16,
            'fiziki-tərbiyə'                    => 16,
            'texnologiya'                       => 19,
        ];

        foreach ($teachers as $teacher) {
            $userProfile = UserProfile::where('user_id', $teacher->id)->first();
            $specialty = strtolower(trim($userProfile->specialty ?? ''));

            if ($teacher->institution_id) {
                DB::table('teacher_workplaces')->updateOrInsert(
                    ['user_id' => $teacher->id, 'institution_id' => $teacher->institution_id],
                    [
                        'workplace_priority' => 'primary',
                        'position_type' => $userProfile->position_type ?? 'muəllim',
                        'employment_type' => 'full_time',
                        'status' => 'active',
                        'salary_currency' => 'AZN',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
                $workplaceCount++;
            }

            $subjectId = null;
            foreach ($specialtyToId as $key => $id) {
                if (str_contains($specialty, $key)) {
                    $subjectId = $id;
                    break;
                }
            }

            if ($subjectId) {
                DB::table('teacher_subjects')->updateOrInsert(
                    ['teacher_id' => $teacher->id, 'subject_id' => $subjectId],
                    [
                        'grade_levels' => json_encode([5, 6, 7, 8, 9, 10, 11]),
                        'specialization_level' => 'intermediate',
                        'is_active' => true,
                        'is_primary_subject' => true,
                        'valid_from' => '2025-09-01',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                TeacherProfile::where('user_id', $teacher->id)->update(['subject_id' => $subjectId]);
                $subjectCount++;
            }
        }

        $this->command->info("📊 Created {$workplaceCount} workplaces and assigned {$subjectCount} subjects.");
    }

    private function phase4_fixPermissions(): void
    {
        $this->command->info('🔐 Phase 4: Expanding teacher role permissions...');

        $guard = 'sanctum';
        $role = Role::where('name', 'müəllim')->where('guard_name', $guard)->first();

        if (!$role) {
            $this->command->error('❌ Role not found!');
            return;
        }

        $perms = [
            'subjects.read',
            'tasks.create',
            'documents.update',
            'documents.delete',
            'notifications.read',
        ];

        foreach ($perms as $pName) {
            $permission = Permission::firstOrCreate(['name' => $pName, 'guard_name' => $guard]);
            if (!$role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }

        $this->command->info('✅ Permissions updated for müəllim role.');
    }
}
