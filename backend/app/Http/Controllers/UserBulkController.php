<?php

namespace App\Http\Controllers;

use App\Exports\StaffTemplateExport;
use App\Exports\StudentTemplateExport;
use App\Exports\TeacherTemplateExport;
use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\ValidationRules;
use App\Imports\StudentsImport;
use App\Imports\TeachersImport;
use App\Models\Student;
use App\Models\User;
use App\Services\InstitutionAssignmentService;
use App\Services\UserBulkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Hash;

class UserBulkController extends BaseController
{
    use ResponseHelpers, ValidationRules;

    public function __construct(
        protected UserBulkService $bulkService,
        protected InstitutionAssignmentService $institutionService
    ) {}

    /**
     * Bulk activate users
     */
    public function activate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate($this->getBulkOperationRules('user'));

            $this->bulkService->validateBulkOperation($validated['user_ids'], 'activate');
            $result = $this->bulkService->activate($validated['user_ids']);

            return $this->success($result);
        }, 'user.bulk.activate');
    }

    /**
     * Bulk deactivate users
     */
    public function deactivate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate($this->getBulkOperationRules('user'));

            $this->bulkService->validateBulkOperation($validated['user_ids'], 'deactivate');
            $result = $this->bulkService->deactivate($validated['user_ids']);

            return $this->success($result);
        }, 'user.bulk.deactivate');
    }

    /**
     * Bulk assign role to users
     */
    public function assignRole(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user'),
                ['role_id' => 'required|integer|exists:roles,id']
            ));

            $this->bulkService->validateBulkOperation($validated['user_ids'], 'assign_role');
            $result = $this->bulkService->assignRole($validated['user_ids'], $validated['role_id']);

            return $this->success($result);
        }, 'user.bulk.assign_role');
    }

    /**
     * Bulk assign institution to users
     */
    public function assignInstitution(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user'),
                ['institution_id' => 'required|integer|exists:institutions,id']
            ));

            $this->bulkService->validateBulkOperation($validated['user_ids'], 'assign_institution');
            $result = $this->bulkService->assignInstitution($validated['user_ids'], $validated['institution_id']);

            return $this->success($result);
        }, 'user.bulk.assign_institution');
    }

    /**
     * Bulk delete users
     */
    public function delete(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user', 50), // Smaller limit for safety
                ['confirm' => 'required|boolean|accepted'] // Extra confirmation required
            ));

            $this->bulkService->validateBulkOperation($validated['user_ids'], 'delete');
            $result = $this->bulkService->delete($validated['user_ids'], $validated['confirm']);

            return $this->success($result);
        }, 'user.bulk.delete');
    }

    /**
     * Get bulk operation statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $stats = $this->bulkService->getStatistics();

            return $this->success($stats, 'Bulk statistics retrieved successfully');
        }, 'user.bulk.statistics');
    }

    /**
     * Get preview of bulk operation
     */
    public function preview(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'user_ids' => 'required|array|min:1|max:100',
                'user_ids.*' => 'integer|exists:users,id',
                'operation' => 'required|string|in:activate,deactivate,assign_role,assign_institution,delete',
                'target_id' => 'nullable|integer', // For role_id or institution_id
            ]);

            $preview = $this->bulkService->getOperationPreview(
                $validated['user_ids'],
                $validated['operation'],
                $validated['target_id'] ?? null
            );

            return $this->success($preview, 'Operation preview generated successfully');
        }, 'user.bulk.preview');
    }

    /**
     * Bulk restore users from trash
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();

            // Check permissions (high privilege operation)
            if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçiləri bərpa etmək icazəniz yoxdur.',
                ], 403);
            }

            $validated = $request->validate([
                'user_ids' => 'required|array|min:1|max:50',
                'user_ids.*' => 'integer|exists:users,id',
                'confirm' => 'required|boolean|accepted',
            ]);

            $result = $this->bulkService->bulkRestore($validated['user_ids'], $validated['confirm']);

            return $this->success($result, 'İstifadəçilər uğurla bərpa edildi');
        }, 'user.bulk.restore');
    }

    /**
     * Bulk force delete users permanently
     */
    public function bulkForceDelete(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();

            // Only SuperAdmin can force delete
            if (! $user->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçiləri həmişəlik silmək icazəniz yoxdur.',
                ], 403);
            }

            $validated = $request->validate([
                'user_ids' => 'required|array|min:1|max:20', // Smaller limit for safety
                'user_ids.*' => 'integer|exists:users,id',
                'confirm' => 'required|boolean|accepted',
                'double_confirm' => 'required|boolean|accepted', // Double confirmation for permanent deletion
            ]);

            $result = $this->bulkService->bulkForceDelete($validated['user_ids'], $validated['confirm']);

            return $this->success($result, 'İstifadəçilər həmişəlik silindi');
        }, 'user.bulk.force_delete');
    }

    /**
     * Download import template by user type
     */
    public function downloadTemplate(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'user_type' => 'nullable|string|in:teachers,students,staff',
                'role_id' => 'nullable|string',
            ]);

            $user = Auth::user();

            // Determine template type from role_id or user_type
            if (! empty($validated['role_id'])) {
                $roleName = $validated['role_id'];
                $templateType = $this->mapRoleToTemplateType($roleName);
                $fileName = "template_{$roleName}_" . date('Y-m-d_H-i-s') . '.xlsx';
            } else {
                $templateType = $validated['user_type'];
                $fileName = "template_{$templateType}_" . date('Y-m-d_H-i-s') . '.xlsx';
            }

            if ($templateType === 'teachers' || $this->isTeacherRole($templateType)) {
                return Excel::download(new TeacherTemplateExport, $fileName);
            } elseif ($templateType === 'students' || $this->isStudentRole($templateType)) {
                return Excel::download(new StudentTemplateExport, $fileName);
            }

            // Staff/Admin template
            return Excel::download(new StaffTemplateExport, $fileName);
        }, 'user.bulk.download_template');
    }

    /**
     * Import users from Excel file
     */
    public function importUsers(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
                'user_type' => 'nullable|string|in:teachers,students,staff',
                'role_id' => 'nullable|string', // This is the role name from frontend
            ]);

            $file = $validated['file'];
            $roleId = $validated['role_id'] ?? null;
            $userType = $validated['user_type'] ?? ($roleId ? $this->mapRoleToTemplateType($roleId) : 'staff');
            
            $user = Auth::user();
            $institution = $user->institution;

            if (! $institution && ! $user->hasRole('superadmin')) {
                return $this->error('İstifadəçi bir təşkilatla əlaqələndirilməlidir', 403);
            }

            $results = [];

            if ($userType === 'teachers') {
                $import = new TeachersImport($institution);
                Excel::import($import, $file);

                $results = [
                    'created' => $import->getSuccessCount(),
                    'updated' => $import->getUpdatedCount(),
                    'errors' => $import->getErrors(),
                    'type' => 'teachers',
                ];
            } elseif ($userType === 'students') {
                $import = new StudentsImport($institution);
                Excel::import($import, $file);

                $results = [
                    'created' => $import->getSuccessCount(),
                    'errors' => $import->getErrors(),
                    'type' => 'students',
                ];
            } else {
                // Staff import
                $results = $this->processStaffImport($file, $institution);
            }

            $created = $results['created'] ?? 0;
            $updated = $results['updated'] ?? 0;
            $errorCount = count($results['errors'] ?? []);

            if ($created === 0 && $updated === 0 && $errorCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'İdxal uğursuz oldu: Heç bir düzgün qeyd tapılmadı. Zəhmət olmasa UTİS kodlarını yoxlayın.',
                    'errors' => $results['errors']
                ], 422);
            }

            $message = "İdxal tamamlandı: {$created} yaradıldı, {$updated} yeniləndi";
            if ($errorCount > 0) {
                $message .= ", {$errorCount} xəta baş verdi";
            }

            return $this->success($results, $message);
        }, 'user.bulk.import');
    }

    /**
     * Export users by type
     */
    public function exportUsers(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'user_type' => 'nullable|string|in:teachers,students,staff',
                'role_id' => 'nullable|string', // Support role name from frontend
                'filters' => 'nullable|array',
            ]);

            $roleId = $validated['role_id'] ?? null;
            $userType = $validated['user_type'] ?? ($roleId ? $this->mapRoleToTemplateType($roleId) : 'staff');
            $filters = $validated['filters'] ?? [];
            $user = Auth::user();
            $institution = $user->institution;

            $fileName = "export_{$userType}_" . date('Y-m-d_H-i-s') . '.xlsx';

            if ($userType === 'teachers') {
                $users = $this->getTeachersForExport($institution, $filters);
                $filePath = $this->generateTeachersExport($users, $fileName);
            } elseif ($userType === 'students') {
                $students = $this->getStudentsForExport($institution, $filters);
                $filePath = $this->generateStudentsExport($students, $fileName);
            } else {
                $users = $this->getStaffForExport($institution, $filters);
                $filePath = $this->generateStaffExport($users, $fileName);
            }

            return response()->download($filePath)->deleteFileAfterSend();
        }, 'user.bulk.export');
    }

    /**
     * Get teachers for export
     */
    private function getTeachersForExport($institution, $filters)
    {
        $query = User::query();

        if ($institution) {
            $query->where('institution_id', $institution->id);
        }

        $query->whereHas('roles', function ($q) {
            $q->whereIn('name', ['müəllim', 'muavin', 'təşkilatçı']);
        });

        // Apply filters
        if (! empty($filters['department'])) {
            $query->where('department_id', $filters['department']);
        }

        if (! empty($filters['is_active'])) {
            $query->where('is_active', $filters['is_active'] === 'true');
        }

        return $query->with(['profile', 'roles', 'department'])->get();
    }

    /**
     * Get students for export
     */
    private function getStudentsForExport($institution, $filters)
    {
        $query = User::query();

        if ($institution) {
            $query->where('institution_id', $institution->id);
        }

        $query->whereHas('roles', function ($q) {
            $q->where('name', 'şagird');
        });

        // Apply filters
        if (! empty($filters['grade'])) {
            $query->whereHas('studentEnrollments', function ($q) use ($filters) {
                $q->where('grade_id', $filters['grade']);
            });
        }

        if (! empty($filters['is_active'])) {
            $query->where('is_active', $filters['is_active'] === 'true');
        }

        return $query->with(['profile', 'studentEnrollments.grade'])->get();
    }

    /**
     * Get staff for export
     */
    private function getStaffForExport($institution, $filters)
    {
        $query = User::query();

        if ($institution) {
            $query->where('institution_id', $institution->id);
        }

        $query->whereHas('roles', function ($q) {
            $q->whereIn('name', ['psixoloq', 'tesarrufat', 'katib']);
        });

        // Apply filters
        if (! empty($filters['department'])) {
            $query->where('department_id', $filters['department']);
        }

        if (! empty($filters['is_active'])) {
            $query->where('is_active', $filters['is_active'] === 'true');
        }

        return $query->with(['profile', 'roles', 'department'])->get();
    }

    /**
     * Generate teachers export file
     */
    private function generateTeachersExport($teachers, $fileName)
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Doğum tarixi',
            'Cins', 'Vəzifə', 'Şöbə', 'İşə qəbul tarixi', 'Ünvan',
            'Fəaliyyət statusu', 'Son giriş',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
        }

        // Data rows
        foreach ($teachers as $index => $teacher) {
            $profile = $teacher->profile;
            $row = $index + 2;

            $sheet->setCellValue('A' . $row, $teacher->id);
            $sheet->setCellValue('B' . $row, $profile->first_name ?? '');
            $sheet->setCellValue('C' . $row, $profile->last_name ?? '');
            $sheet->setCellValue('D' . $row, $teacher->email);
            $sheet->setCellValue('E' . $row, $profile->contact_phone ?? '');
            $sheet->setCellValue('F' . $row, $profile->birth_date ?? '');
            $sheet->setCellValue('G' . $row, $profile->gender ?? '');
            $sheet->setCellValue('H' . $row, $teacher->roles->first()->name ?? '');
            $sheet->setCellValue('I' . $row, $teacher->department->name ?? '');
            $sheet->setCellValue('J' . $row, $profile->hire_date ?? '');
            $sheet->setCellValue('K' . $row, $profile->address ?? '');
            $sheet->setCellValue('L' . $row, $teacher->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            $sheet->setCellValue('M' . $row, $teacher->last_login_at ?? '');
        }

        $writer = new Xlsx($spreadsheet);
        $filePath = storage_path('app/temp/' . $fileName);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Generate students export file
     */
    private function generateStudentsExport($students, $fileName)
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Doğum tarixi', 'Cins',
            'Sinif', 'Şagird nömrəsi', 'Qeydiyyat tarixi', 'Ünvan',
            'Vəsi adı', 'Vəsi telefonu', 'Fəaliyyət statusu',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
        }

        // Data rows
        foreach ($students as $index => $student) {
            $profile = $student->profile;
            $enrollment = $student->studentEnrollments->first();
            $emergencyContact = json_decode($profile->emergency_contact ?? '{}', true);
            $row = $index + 2;

            $sheet->setCellValue('A' . $row, $student->id);
            $sheet->setCellValue('B' . $row, $profile->first_name ?? '');
            $sheet->setCellValue('C' . $row, $profile->last_name ?? '');
            $sheet->setCellValue('D' . $row, $student->email);
            $sheet->setCellValue('E' . $row, $profile->birth_date ?? '');
            $sheet->setCellValue('F' . $row, $profile->gender ?? '');
            $sheet->setCellValue('G' . $row, $enrollment->grade->name ?? '');
            $sheet->setCellValue('H' . $row, $enrollment->student_number ?? '');
            $sheet->setCellValue('I' . $row, $enrollment->enrollment_date ?? '');
            $sheet->setCellValue('J' . $row, $profile->address ?? '');
            $sheet->setCellValue('K' . $row, $emergencyContact['name'] ?? '');
            $sheet->setCellValue('L' . $row, $emergencyContact['phone'] ?? '');
            $sheet->setCellValue('M' . $row, $student->is_active ? 'Aktiv' : 'Qeyri-aktiv');
        }

        $writer = new Xlsx($spreadsheet);
        $filePath = storage_path('app/temp/' . $fileName);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Generate staff export file
     */
    private function generateStaffExport($staff, $fileName)
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Doğum tarixi',
            'Cins', 'Vəzifə', 'Şöbə', 'İşə qəbul tarixi', 'Ünvan',
            'Təcili əlaqə', 'Qeydlər', 'Fəaliyyət statusu',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
        }

        // Data rows
        foreach ($staff as $index => $user) {
            $profile = $user->profile;
            $emergencyContact = json_decode($profile->emergency_contact ?? '{}', true);
            $row = $index + 2;

            $sheet->setCellValue('A' . $row, $user->id);
            $sheet->setCellValue('B' . $row, $profile->first_name ?? '');
            $sheet->setCellValue('C' . $row, $profile->last_name ?? '');
            $sheet->setCellValue('D' . $row, $user->email);
            $sheet->setCellValue('E' . $row, $profile->contact_phone ?? '');
            $sheet->setCellValue('F' . $row, $profile->birth_date ?? '');
            $sheet->setCellValue('G' . $row, $profile->gender ?? '');
            $sheet->setCellValue('H' . $row, $user->roles->first()->name ?? '');
            $sheet->setCellValue('I' . $row, $user->department->name ?? '');
            $sheet->setCellValue('J' . $row, $profile->hire_date ?? '');
            $sheet->setCellValue('K' . $row, $profile->address ?? '');
            $sheet->setCellValue('L' . $row, ($emergencyContact['name'] ?? '') . ' - ' . ($emergencyContact['phone'] ?? ''));
            $sheet->setCellValue('M' . $row, $profile->notes ?? '');
            $sheet->setCellValue('N' . $row, $user->is_active ? 'Aktiv' : 'Qeyri-aktiv');
        }

        $writer = new Xlsx($spreadsheet);
        $filePath = storage_path('app/temp/' . $fileName);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process staff import using header-based column mapping.
     * Column order in the Excel file does NOT matter — headers are matched by name.
     */
    private function processStaffImport($file, $institution)
    {
        $rows = Excel::toArray(new \stdClass(), $file)[0];

        if (empty($rows)) {
            return ['created' => 0, 'updated' => 0, 'errors' => ['Fayl boşdur'], 'type' => 'staff'];
        }

        // Build header → index map from the first row
        $headerRow = array_map(fn($h) => trim((string) $h), $rows[0]);
        $colMap = array_flip($headerRow);

        // Helper: get cell value by header name (returns null if column missing or blank)
        $get = function (array $row, string $col, ?string $default = null) use ($colMap): ?string {
            if (! array_key_exists($col, $colMap)) {
                return $default;
            }
            $val = trim((string) ($row[$colMap[$col]] ?? ''));
            return $val !== '' ? $val : $default;
        };

        $data = array_slice($rows, 1); // skip header row
        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($data as $rowIndex => $row) {
            try {
                $firstName = $get($row, 'first_name', '');
                $lastName  = $get($row, 'last_name', '');
                $utisCode  = $get($row, 'utis_code', '');
                $email     = $get($row, 'email', '');

                // Skip completely empty rows silently
                if (empty($firstName) && empty($lastName) && empty($utisCode)) {
                    continue;
                }

                if (empty($firstName) || empty($lastName)) {
                    $errors[] = 'Sətir ' . ($rowIndex + 2) . ': Ad və ya soyad daxil edilməyib';
                    continue;
                }

                if (empty($utisCode)) {
                    $errors[] = 'Sətir ' . ($rowIndex + 2) . ': UTİS kodu daxil edilməyib';
                    continue;
                }

                // Find existing user by UTIS code (via Profile) or Email
                $userQuery = User::whereHas('profile', fn ($q) => $q->where('utis_code', $utisCode));
                if (! empty($email)) {
                    $userQuery->orWhere('email', $email);
                }
                $user = $userQuery->first();

                $isActive = ($get($row, 'status', 'active') === 'active');

                if ($user) {
                    $user->update([
                        'institution_id' => $institution?->id,
                        'is_active' => $isActive,
                    ]);
                    $updated++;
                } else {
                    $baseUsername = strtolower($firstName . '_' . $lastName);
                    $username = $this->generateUniqueUsername($baseUsername);

                    if (empty($email)) {
                        $email = $username . '@staff.local';
                    }

                    if (User::where('email', $email)->exists()) {
                        $email = $username . '_' . time() . '@staff.local';
                    }

                    $user = User::create([
                        'username'           => $username,
                        'email'              => $email,
                        'password'           => Hash::make($get($row, 'password', 'staff123')),
                        'institution_id'     => $institution?->id,
                        'is_active'          => $isActive,
                        'email_verified_at'  => now(),
                    ]);
                    $created++;
                }

                // Assign role (mapped to actual DB role name)
                $roleName = $this->mapRoleName($get($row, 'role_id', 'muavin'));
                if (\Spatie\Permission\Models\Role::where('name', $roleName)->exists()) {
                    $user->syncRoles([$roleName]);
                } else {
                    $user->syncRoles(['muavin']);
                }

                // Create/Update profile
                $profileData = [
                    'first_name'        => $firstName,
                    'last_name'         => $lastName,
                    'patronymic'        => $get($row, 'patronymic'),
                    'contact_phone'     => $get($row, 'contact_phone'),
                    'birth_date'        => $get($row, 'birth_date'),
                    'gender'            => $get($row, 'gender'),
                    'national_id'       => $get($row, 'national_id'),
                    'address'           => $get($row, 'address'),
                    'emergency_contact' => json_encode([
                        'name'  => $get($row, 'emergency_contact_name'),
                        'phone' => $get($row, 'emergency_contact_phone'),
                        'email' => $get($row, 'emergency_contact_email'),
                    ]),
                    'notes'    => $get($row, 'notes'),
                    'utis_code' => $utisCode,
                ];

                if ($user->profile) {
                    $user->profile->update($profileData);
                } else {
                    $user->profile()->create($profileData);
                }

            } catch (\Exception $e) {
                $errors[] = 'Sətir ' . ($rowIndex + 2) . ': ' . $e->getMessage();
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'errors'  => $errors,
            'type'    => 'staff',
        ];
    }

    /**
     * Generate unique username
     */
    private function generateUniqueUsername($baseUsername)
    {
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . '_' . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Map role name to template type (teachers / students / staff)
     */
    private function mapRoleToTemplateType($roleName): string
    {
        // Direct category names passed from frontend
        if ($roleName === 'teachers') return 'teachers';
        if ($roleName === 'students') return 'students';
        if ($roleName === 'staff')    return 'staff';

        if ($this->isTeacherRole($roleName)) return 'teachers';
        if ($this->isStudentRole($roleName)) return 'students';

        return 'staff';
    }

    /**
     * Map display/import role names to actual DB role names (spatie/laravel-permission)
     * All mapped values must match exactly the role names in the roles table.
     */
    private function mapRoleName(string $name): string
    {
        $name = str_replace('İ', 'i', $name);
        $name = mb_strtolower(trim($name), 'UTF-8');

        $map = [
            // Müəllim
            'müəllim'   => 'müəllim',
            'muellim'   => 'müəllim',
            'müəllimə'  => 'müəllim',
            'teacher'   => 'müəllim',
            'teachers'  => 'müəllim',

            // Şagird
            'şagird'   => 'şagird',
            'sagird'   => 'şagird',
            'student'  => 'şagird',
            'students' => 'şagird',

            // Region operatoru
            'region operatoru' => 'regionoperator',
            'regionoperator'   => 'regionoperator',
            'operator'         => 'regionoperator',

            // Sektor admini
            'sektor admini' => 'sektoradmin',
            'sektoradmin'   => 'sektoradmin',

            // Məktəb müdiri
            'məktəb admini' => 'schooladmin',
            'schooladmin'   => 'schooladmin',

            // Məktəbəqədər müdir
            'məktəbəqədər admin' => 'preschooladmin',
            'preschooladmin'     => 'preschooladmin',

            // Müavin
            'müavin'           => 'muavin',
            'direktor müavini' => 'muavin',
            'muavin'           => 'muavin',

            // Təşkilatçı
            'təşkilatçı' => 'təşkilatçı',
            'teskilatci' => 'təşkilatçı',

            // Təsərrüfat
            'təsərrüfat müdiri' => 'tesarrufat',
            'tesarrufat'        => 'tesarrufat',
            'təsərrüfat'        => 'tesarrufat',

            // Psixoloq
            'psixoloq'    => 'psixoloq',
            'psychologist' => 'psixoloq',

            // Region admini
            'regionadmin'  => 'regionadmin',
            'region admini' => 'regionadmin',

            // Superadmin
            'superadmin' => 'superadmin',
        ];

        return $map[$name] ?? $name;
    }

    /**
     * Check if role belongs to the pedagogical/teaching staff category
     * (uses TeacherTemplateExport / TeachersImport)
     */
    private function isTeacherRole(string $roleName): bool
    {
        $pedagogicalRoles = ['müəllim', 'muavin', 'psixoloq', 'təşkilatçı', 'tesarrufat'];
        return in_array($this->mapRoleName($roleName), $pedagogicalRoles, true);
    }

    /**
     * Check if role is student-related
     */
    private function isStudentRole(string $roleName): bool
    {
        return $this->mapRoleName($roleName) === 'şagird';
    }
}
