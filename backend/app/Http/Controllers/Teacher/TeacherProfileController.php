<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\TeacherProfile;
use App\Models\TeacherAchievement;
use App\Models\TeacherCertificate;
use App\Models\TeacherProfileApproval;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TeacherProfileController extends Controller
{
    /**
     * Get teacher profile information
     */
    public function getProfile(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Get or create teacher profile
            $teacherProfile = TeacherProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'phone' => $user->phone,
                    'qualifications' => ['Ali təhsil', 'Pedaqoji təcrübə'],
                    'experience_years' => 0,
                    'school' => 'Məktəb',
                    'subject' => 'Fənn',
                ]
            );

            // Build teacher info with status
            $teacherInfo = [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $teacherProfile->phone,
                'subject' => $teacherProfile->subject,
                'school' => $teacherProfile->school,
                'experienceYears' => $teacherProfile->experience_years,
                'qualifications' => $teacherProfile->qualifications ?? [],
                'photo' => $teacherProfile->photo,
                'status' => $teacherProfile->status,
                'rejectionReason' => $teacherProfile->rejection_reason,
                'approvedAt' => $teacherProfile->approved_at?->format('Y-m-d H:i:s'),
                'approvedBy' => $teacherProfile->approvedBy?->name
            ];

            // Get real achievements from database
            $achievements = TeacherAchievement::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($achievement) {
                    return [
                        'id' => $achievement->id,
                        'title' => $achievement->title,
                        'description' => $achievement->description,
                        'date' => $achievement->date->format('Y-m-d'),
                        'type' => $achievement->type,
                        'impactLevel' => $achievement->impact_level,
                        'institution' => $achievement->institution,
                        'certificateUrl' => $achievement->certificate_url,
                        'verificationStatus' => $achievement->verification_status,
                        'notes' => $achievement->notes,
                        'category' => $achievement->category,
                        'tags' => $achievement->tags ?? []
                    ];
                });

            // Get real certificates from database
            $certificates = TeacherCertificate::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($certificate) {
                    return [
                        'id' => $certificate->id,
                        'name' => $certificate->name,
                        'issuer' => $certificate->issuer,
                        'date' => $certificate->date->format('Y-m-d'),
                        'expiryDate' => $certificate->expiry_date ? $certificate->expiry_date->format('Y-m-d') : null,
                        'credentialId' => $certificate->credential_id,
                        'status' => $certificate->status,
                        'skills' => $certificate->skills ?? [],
                        'level' => $certificate->level,
                        'category' => $certificate->category
                    ];
                });

            // Get real education history from database (if available)
            $education = [
                [
                    'id' => 'edu-1',
                    'degree' => 'Magistr',
                    'institution' => 'BDU',
                    'year' => '2015',
                    'field' => 'Riyaziyyat müəllimliyi',
                    'status' => 'completed',
                    'type' => 'master'
                ],
                [
                    'id' => 'edu-2',
                    'degree' => 'Bakalavr',
                    'institution' => 'BDU',
                    'year' => '2013',
                    'field' => 'Riyaziyyat',
                    'status' => 'completed',
                    'type' => 'bachelor'
                ]
            ];

            // Get stats (mock data for now, will be calculated from real data)
            $stats = [
                'assignedClasses' => 5,
                'totalStudents' => 110,
                'subjectsTeaching' => 2,
                'attendanceRate' => 91.5,
                'weeklyHours' => 20,
                'pendingGrades' => 12,
                'activeSurveys' => 3,
                'upcomingTasks' => 5
            ];

            $profileData = [
                'teacherInfo' => $teacherInfo,
                'stats' => $stats,
                'achievements' => $achievements->toArray(),
                'education' => $education,
                'certificates' => $certificates->toArray()
            ];

            return response()->json([
                'success' => true,
                'data' => $profileData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Profile information could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update teacher profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone' => 'nullable|string|max:20',
                'subject' => 'required|string|max:255',
                'school' => 'required|string|max:255',
                'experienceYears' => 'required|integer|min:0|max:50',
                'qualifications' => 'nullable|array',
                'qualifications.*' => 'string|max:255',
                'bio' => 'nullable|string|max:1000',
                'specialization' => 'nullable|string|max:255',
                'address' => 'nullable|string|max:500'
            ]);

            // Update user profile
            $user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
            ]);

            // Update teacher profile
            $teacherProfile = TeacherProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'phone' => $validated['phone'],
                    'subject' => $validated['subject'],
                    'school' => $validated['school'],
                    'experience_years' => $validated['experienceYears'],
                    'qualifications' => $validated['qualifications'] ?? [],
                    'bio' => $validated['bio'],
                    'specialization' => $validated['specialization'],
                    'address' => $validated['address']
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $teacherProfile->phone,
                    'subject' => $teacherProfile->subject,
                    'school' => $teacherProfile->school,
                    'experienceYears' => $teacherProfile->experience_years,
                    'qualifications' => $teacherProfile->qualifications,
                    'bio' => $teacherProfile->bio,
                    'specialization' => $teacherProfile->specialization,
                    'address' => $teacherProfile->address
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Profile could not be updated',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher performance data
     */
    public function getPerformance(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $period = $request->get('period', '6months');

            // Mock performance data - real implementation would calculate from actual data
            $performanceData = [
                'monthlyStats' => [
                    ['month' => 'Yanvar', 'attendance' => 92, 'averageGrade' => 85, 'completedTasks' => 12, 'studentSatisfaction' => 88],
                    ['month' => 'Fevral', 'attendance' => 89, 'averageGrade' => 87, 'completedTasks' => 15, 'studentSatisfaction' => 91],
                    ['month' => 'Mart', 'attendance' => 94, 'averageGrade' => 89, 'completedTasks' => 18, 'studentSatisfaction' => 93],
                    ['month' => 'Aprel', 'attendance' => 91, 'averageGrade' => 86, 'completedTasks' => 14, 'studentSatisfaction' => 90],
                    ['month' => 'May', 'attendance' => 93, 'averageGrade' => 90, 'completedTasks' => 20, 'studentSatisfaction' => 94],
                    ['month' => 'İyun', 'attendance' => 95, 'averageGrade' => 92, 'completedTasks' => 16, 'studentSatisfaction' => 95]
                ],
                'subjectPerformance' => [
                    ['subject' => 'Riyaziyyat', 'averageGrade' => 88, 'attendance' => 92, 'totalStudents' => 45, 'improvement' => 5.2],
                    ['subject' => 'Fizika', 'averageGrade' => 85, 'attendance' => 89, 'totalStudents' => 30, 'improvement' => 3.1],
                    ['subject' => 'Cəbr', 'averageGrade' => 90, 'attendance' => 94, 'totalStudents' => 35, 'improvement' => 7.8]
                ],
                'goals' => [
                    ['title' => 'Davamiyyəti artırmaq', 'target' => 95, 'current' => 93, 'deadline' => '2023-12-31', 'category' => 'attendance'],
                    ['title' => 'Orta qiyməti yüksəltmək', 'target' => 90, 'current' => 88, 'deadline' => '2023-12-31', 'category' => 'grades'],
                    ['title' => 'Yeni metodlar tətbiq etmək', 'target' => 5, 'current' => 3, 'deadline' => '2023-09-30', 'category' => 'methods']
                ],
                'comparisons' => [
                    'schoolAverage' => 85,
                    'departmentAverage' => 87,
                    'personalBest' => 92
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $performanceData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Performance data could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher achievements
     */
    public function getAchievements(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Get real achievements from database
            $achievements = TeacherAchievement::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($achievement) {
                    return [
                        'id' => $achievement->id,
                        'title' => $achievement->title,
                        'description' => $achievement->description,
                        'date' => $achievement->date->format('Y-m-d'),
                        'type' => $achievement->type,
                        'impactLevel' => $achievement->impact_level,
                        'institution' => $achievement->institution,
                        'certificateUrl' => $achievement->certificate_url,
                        'verificationStatus' => $achievement->verification_status,
                        'notes' => $achievement->notes,
                        'category' => $achievement->category,
                        'tags' => $achievement->tags ?? []
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $achievements
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Achievements could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher certificates
     */
    public function getCertificates(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Get real certificates from database
            $certificates = TeacherCertificate::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($certificate) {
                    return [
                        'id' => $certificate->id,
                        'name' => $certificate->name,
                        'issuer' => $certificate->issuer,
                        'date' => $certificate->date->format('Y-m-d'),
                        'expiryDate' => $certificate->expiry_date ? $certificate->expiry_date->format('Y-m-d') : null,
                        'credentialId' => $certificate->credential_id,
                        'status' => $certificate->status,
                        'skills' => $certificate->skills ?? [],
                        'level' => $certificate->level,
                        'category' => $certificate->category
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $certificates
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Certificates could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher resources
     */
    public function getResources(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Mock resources data - real implementation would fetch from database
            $resources = [
                [
                    'id' => '1',
                    'name' => 'Riyaziyyat Dərsliyi 10-cu sinif',
                    'type' => 'document',
                    'category' => 'dərslik',
                    'subject' => 'Riyaziyyat',
                    'size' => '15.2 MB',
                    'uploadDate' => '2023-06-15',
                    'downloadCount' => 45,
                    'description' => '10-cu sinif üçün riyaziyyat dərsliyi',
                    'tags' => ['riyaziyyat', '10-cu sinif', 'dərslik'],
                    'isFavorite' => true
                ],
                [
                    'id' => '2',
                    'name' => 'Cəbr Məsələlər Toplusu',
                    'type' => 'document',
                    'category' => 'toplu',
                    'subject' => 'Riyaziyyat',
                    'size' => '8.7 MB',
                    'uploadDate' => '2023-05-20',
                    'downloadCount' => 32,
                    'description' => 'Cəbr mövzusu üzrə məsələlər toplusu',
                    'tags' => ['cəbr', 'məsələlər', 'toplu'],
                    'isFavorite' => false
                ],
                [
                    'id' => '3',
                    'name' => 'İnteraktiv Dərs Video',
                    'type' => 'video',
                    'category' => 'video',
                    'subject' => 'Riyaziyyat',
                    'size' => '125.4 MB',
                    'uploadDate' => '2023-06-01',
                    'downloadCount' => 28,
                    'description' => 'İnteraktiv dərsin video yazısı',
                    'tags' => ['video', 'interaktiv', 'dərs'],
                    'isFavorite' => true
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $resources
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Resources could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update teacher profile with approval workflow.
     */
    public function updateProfileWithApproval(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'phone' => 'nullable|string|max:20',
                'bio' => 'nullable|string|max:1000',
                'qualifications' => 'nullable|array',
                'qualifications.*' => 'string|max:255',
                'experience_years' => 'nullable|integer|min:0|max:50',
                'specialization' => 'nullable|string|max:255',
                'photo' => 'nullable|string|max:500',
                'school' => 'nullable|string|max:255',
                'subject' => 'nullable|string|max:255',
                'address' => 'nullable|string|max:500',
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:20',
                'emergency_contact_email' => 'nullable|email|max:255',
                'social_links' => 'nullable|array',
                'preferences' => 'nullable|array'
            ]);

            $profile = TeacherProfile::firstOrCreate(
                ['user_id' => $user->id],
                array_merge($validated, [
                    'status' => TeacherProfile::STATUS_PENDING,
                    'created_at' => now(),
                    'updated_at' => now()
                ])
            );

            // Create approval request
            TeacherProfileApproval::create([
                'user_id' => $user->id,
                'model_type' => TeacherProfileApproval::MODEL_TEACHER_PROFILE,
                'model_id' => $profile->id,
                'old_data' => $profile->getOriginal(),
                'new_data' => $validated,
                'status' => TeacherProfileApproval::STATUS_PENDING
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile submitted for approval',
                'data' => $profile->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending changes for teacher profile.
     */
    public function getPendingChanges(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $pendingApprovals = TeacherProfileApproval::with(['approvedBy'])
                ->where('user_id', $user->id)
                ->pending()
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $pendingApprovals
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get pending changes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit profile for approval.
     */
    public function submitForApproval(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('müəllim')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $profile = TeacherProfile::where('user_id', $user->id)->first();
            
            if (!$profile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Profile not found'
                ], 404);
            }

            $profile->submitForApproval();

            return response()->json([
                'success' => true,
                'message' => 'Profile submitted for approval'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit for approval',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
