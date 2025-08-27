<?php

namespace App\Http\Controllers;

use App\Services\UserBulkService;
use App\Services\InstitutionAssignmentService;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use App\Imports\TeachersImport;
use App\Imports\StudentsImport;
use App\Exports\TeacherTemplateExport;
use App\Exports\StudentTemplateExport;
use App\Exports\StaffTemplateExport;
use App\Models\User;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

class UserBulkController extends BaseController
{
    use ValidationRules, ResponseHelpers;

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
        return $this->executeWithErrorHandling(function () use ($request) {
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
                'target_id' => 'nullable|integer' // For role_id or institution_id
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
     * Download import template by user type
     */
    public function downloadTemplate(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'user_type' => 'nullable|string|in:teachers,students,staff',
                'role_id' => 'nullable|string|exists:roles,name'
            ]);

            $user = Auth::user();
            
            // Determine template type from role_id or user_type
            if (!empty($validated['role_id'])) {
                $roleName = $validated['role_id'];
                $templateType = $this->mapRoleToTemplateType($roleName);
                $fileName = "template_{$roleName}_" . date('Y-m-d_H-i-s') . '.xlsx';
            } else {
                $templateType = $validated['user_type'];
                $fileName = "template_{$templateType}_" . date('Y-m-d_H-i-s') . '.xlsx';
            }
            
            if ($templateType === 'teachers' || $this->isTeacherRole($templateType)) {
                return Excel::download(new TeacherTemplateExport(), $fileName);
            } elseif ($templateType === 'students' || $this->isStudentRole($templateType)) {
                return Excel::download(new StudentTemplateExport(), $fileName);
            } else {
                // Staff/Admin template
                return Excel::download(new StaffTemplateExport(), $fileName);
            }
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
                'user_type' => 'required|string|in:teachers,students,staff'
            ]);

            $file = $validated['file'];
            $userType = $validated['user_type'];
            $user = Auth::user();
            $institution = $user->institution;

            if (!$institution && !$user->hasRole('superadmin')) {
                return $this->error('User must be associated with an institution', 403);
            }

            $results = [];

            if ($userType === 'teachers') {
                $import = new TeachersImport($institution);
                Excel::import($import, $file);
                
                $results = [
                    'created' => $import->getSuccessCount(),
                    'errors' => $import->getErrors(),
                    'type' => 'teachers'
                ];
            } elseif ($userType === 'students') {
                $import = new StudentsImport($institution);
                Excel::import($import, $file);
                
                $results = [
                    'created' => $import->getSuccessCount(), 
                    'errors' => $import->getErrors(),
                    'type' => 'students'
                ];
            } else {
                // Staff import
                $results = $this->processStaffImport($file, $institution);
            }

            $message = "İdxal tamamlandı: {$results['created']} {$userType} əlavə edildi";
            if (!empty($results['errors'])) {
                $message .= ", " . count($results['errors']) . " xəta baş verdi";
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
                'user_type' => 'required|string|in:teachers,students,staff',
                'filters' => 'nullable|array'
            ]);

            $userType = $validated['user_type'];
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
            $q->whereIn('name', ['müəllim', 'muavin', 'ubr']);
        });

        // Apply filters
        if (!empty($filters['department'])) {
            $query->where('department_id', $filters['department']);
        }
        
        if (!empty($filters['is_active'])) {
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
        if (!empty($filters['grade'])) {
            $query->whereHas('studentEnrollments', function ($q) use ($filters) {
                $q->where('grade_id', $filters['grade']);
            });
        }
        
        if (!empty($filters['is_active'])) {
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
        if (!empty($filters['department'])) {
            $query->where('department_id', $filters['department']);
        }
        
        if (!empty($filters['is_active'])) {
            $query->where('is_active', $filters['is_active'] === 'true');
        }

        return $query->with(['profile', 'roles', 'department'])->get();
    }

    /**
     * Generate teachers export file
     */
    private function generateTeachersExport($teachers, $fileName)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Doğum tarixi', 
            'Cins', 'Vəzifə', 'Şöbə', 'İşə qəbul tarixi', 'Ünvan', 
            'Fəaliyyət statusu', 'Son giriş'
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
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Doğum tarixi', 'Cins', 
            'Sinif', 'Şagird nömrəsi', 'Qeydiyyat tarixi', 'Ünvan', 
            'Vəsi adı', 'Vəsi telefonu', 'Fəaliyyət statusu'
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
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Doğum tarixi', 
            'Cins', 'Vəzifə', 'Şöbə', 'İşə qəbul tarixi', 'Ünvan', 
            'Təcili əlaqə', 'Qeydlər', 'Fəaliyyət statusu'
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
     * Process staff import
     */
    private function processStaffImport($file, $institution)
    {
        $data = Excel::toArray([], $file)[0];
        $headers = array_shift($data); // Remove header row
        
        $created = 0;
        $errors = [];

        foreach ($data as $rowIndex => $row) {
            try {
                if (empty($row[0]) || empty($row[1])) continue; // Skip empty rows
                
                $username = $this->generateUniqueUsername(strtolower($row[0] . '_' . $row[1]));
                $email = !empty($row[2]) ? $row[2] : $username . '@staff.local';
                
                // Check email uniqueness
                if (User::where('email', $email)->exists()) {
                    $email = $username . '_' . time() . '@staff.local';
                }

                $user = User::create([
                    'username' => $username,
                    'email' => $email,
                    'password' => Hash::make('staff123'),
                    'institution_id' => $institution->id,
                    'is_active' => ($row[15] ?? 'active') === 'active',
                    'email_verified_at' => now(),
                ]);

                // Assign role based on position
                $position = strtolower($row[7] ?? 'katib');
                $role = match ($position) {
                    'psixoloq' => 'psixoloq',
                    'tesarrufat', 'təsərrüfat' => 'tesarrufat',
                    default => 'katib'
                };
                
                $user->assignRole($role);

                // Create profile
                $user->profile()->create([
                    'first_name' => $row[0],
                    'last_name' => $row[1],
                    'contact_phone' => $row[3] ?? null,
                    'birth_date' => $row[4] ?? null,
                    'gender' => $row[5] ?? null,
                    'hire_date' => $row[9] ?? null,
                    'address' => $row[10] ?? null,
                    'emergency_contact' => json_encode([
                        'name' => $row[11] ?? null,
                        'phone' => $row[12] ?? null,
                        'email' => $row[13] ?? null,
                    ]),
                    'notes' => $row[14] ?? null,
                ]);

                $created++;
                
            } catch (\Exception $e) {
                $errors[] = "Sətir " . ($rowIndex + 2) . ": " . $e->getMessage();
            }
        }

        return [
            'created' => $created,
            'errors' => $errors,
            'type' => 'staff'
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
     * Map role name to template type
     */
    private function mapRoleToTemplateType($roleName): string
    {
        // Common teacher role names
        if ($this->isTeacherRole($roleName)) {
            return 'teachers';
        }
        
        // Common student role names  
        if ($this->isStudentRole($roleName)) {
            return 'students';
        }
        
        // Everything else is staff/admin
        return 'staff';
    }

    /**
     * Check if role is teacher-related
     */
    private function isTeacherRole($roleName): bool
    {
        $teacherRoles = ['teacher', 'müəllim', 'muellim', 'educator'];
        $lowerRoleName = strtolower($roleName);
        
        foreach ($teacherRoles as $teacherRole) {
            if (strpos($lowerRoleName, $teacherRole) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if role is student-related
     */
    private function isStudentRole($roleName): bool
    {
        $studentRoles = ['student', 'şagird', 'sagird', 'pupil'];
        $lowerRoleName = strtolower($roleName);
        
        foreach ($studentRoles as $studentRole) {
            if (strpos($lowerRoleName, $studentRole) !== false) {
                return true;
            }
        }
        
        return false;
    }
}