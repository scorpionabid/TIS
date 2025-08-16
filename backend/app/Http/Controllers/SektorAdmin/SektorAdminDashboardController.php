<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\TaskNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SektorAdminDashboardController extends Controller
{
    /**
     * Get SektorAdmin dashboard data
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has sektoradmin role
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Get user's sector (institution)
            $userSector = $user->institution;
            
            if (!$userSector || $userSector->type !== 'sector_education_office') {
                return response()->json([
                    'message' => 'İstifadəçi sektora təyin edilməyib'
                ], 400);
            }

            // Get all schools under this sector
            $sectorSchools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4) // School level
                ->get();

            $totalSchools = $sectorSchools->count();
            $activeSchools = $sectorSchools->where('is_active', true)->count();

            // Get total students and teachers (mock data for now)
            $totalStudents = $this->calculateTotalStudents($sectorSchools);
            $totalTeachers = $this->calculateTotalTeachers($sectorSchools);

            // Get sector users count
            $sectorUsers = User::where('institution_id', $userSector->id)
                ->where('is_active', true)
                ->count();

            // Add school users
            $schoolUserIds = $sectorSchools->pluck('id');
            $schoolUsers = User::whereIn('institution_id', $schoolUserIds)
                ->where('is_active', true)
                ->count();

            $totalSektorUsers = $sectorUsers + $schoolUsers;

            // Mock survey and report data
            $activeSurveys = 3;
            $pendingReports = 7;

            // Get sector information
            $sektorInfo = [
                'name' => $userSector->name,
                'region' => $userSector->parent?->name ?? 'Bilinmir',
                'establishedYear' => '2010' // Mock data
            ];

            // Get recent activities
            $recentActivities = $this->getRecentActivities($userSector, $sectorSchools);

            // Get schools list with basic stats
            $schoolsList = $this->getSchoolsList($sectorSchools);

            return response()->json([
                'totalSchools' => $totalSchools,
                'activeSchools' => $activeSchools,
                'totalStudents' => $totalStudents,
                'totalTeachers' => $totalTeachers,
                'sektorUsers' => $totalSektorUsers,
                'activeSurveys' => $activeSurveys,
                'pendingReports' => $pendingReports,
                'sektorInfo' => $sektorInfo,
                'recentActivities' => $recentActivities,
                'schoolsList' => $schoolsList
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed schools data for the sector
     */
    public function getSectorSchools(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSector = $user->institution;
            
            if (!$userSector) {
                return response()->json([
                    'message' => 'İstifadəçi sektora təyin edilməyib'
                ], 400);
            }

            $schools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->with(['parent'])
                ->get()
                ->map(function($school) {
                    // Mock student and teacher counts
                    $students = rand(200, 600);
                    $teachers = rand(15, 50);
                    
                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'short_name' => $school->short_name,
                        'type' => $school->type,
                        'type_display' => $this->getSchoolTypeDisplay($school->type),
                        'is_active' => $school->is_active,
                        'students' => $students,
                        'teachers' => $teachers,
                        'address' => $school->address ?? 'Ünvan qeyd edilməyib',
                        'phone' => $school->phone ?? 'Telefon qeyd edilməyib',
                        'email' => $school->email ?? 'Email qeyd edilməyib',
                        'established_year' => $school->established_year ?? 'Bilinmir',
                        'created_at' => $school->created_at->format('Y-m-d')
                    ];
                });

            return response()->json([
                'schools' => $schools,
                'total_schools' => $schools->count(),
                'active_schools' => $schools->where('is_active', true)->count(),
                'total_students' => $schools->sum('students'),
                'total_teachers' => $schools->sum('teachers'),
                'sector' => [
                    'name' => $userSector->name,
                    'region' => $userSector->parent?->name ?? 'Bilinmir'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məktəb məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sector performance analytics
     */
    public function getSectorAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSector = $user->institution;
            $sectorSchools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->get();

            // Mock analytics data
            $analytics = [
                'enrollment_trend' => [
                    ['month' => 'Yanvar', 'students' => 3100],
                    ['month' => 'Fevral', 'students' => 3150],
                    ['month' => 'Mart', 'students' => 3200],
                    ['month' => 'Aprel', 'students' => 3250],
                ],
                'school_performance' => $sectorSchools->map(function($school) {
                    return [
                        'school_name' => $school->name,
                        'attendance_rate' => rand(85, 98),
                        'academic_score' => rand(70, 95),
                        'teacher_ratio' => rand(12, 25)
                    ];
                }),
                'subject_statistics' => [
                    ['subject' => 'Riyaziyyat', 'average_score' => 82, 'teachers' => 25],
                    ['subject' => 'Azərbaycan dili', 'average_score' => 87, 'teachers' => 20],
                    ['subject' => 'İngilis dili', 'average_score' => 79, 'teachers' => 18],
                    ['subject' => 'Tarix', 'average_score' => 85, 'teachers' => 12],
                    ['subject' => 'Fizika', 'average_score' => 76, 'teachers' => 15],
                ]
            ];

            return response()->json($analytics);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Analitik məlumatlar yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate total students (mock implementation)
     */
    private function calculateTotalStudents($schools): int
    {
        // Mock calculation - in real implementation this would sum actual student counts
        return $schools->count() * rand(200, 400);
    }

    /**
     * Calculate total teachers (mock implementation)
     */
    private function calculateTotalTeachers($schools): int
    {
        // Mock calculation - in real implementation this would sum actual teacher counts
        return $schools->count() * rand(15, 35);
    }

    /**
     * Get recent activities for the sector
     */
    private function getRecentActivities($sector, $schools): array
    {
        // Mock activities
        return [
            [
                'id' => '1',
                'type' => 'survey',
                'title' => 'Yeni sorğu başladı',
                'description' => 'Müəllimlərin işgüzar qabiliyyəti haqqında sorğu',
                'time' => '3 saat əvvəl',
                'status' => 'in_progress',
                'school' => $schools->first()?->name ?? 'Bilinməyən məktəb'
            ],
            [
                'id' => '2',
                'type' => 'report',
                'title' => 'Aylıq hesabat təqdim edildi',
                'description' => 'Mart ayı üçün təhsil statistikası',
                'time' => '1 gün əvvəl',
                'status' => 'completed'
            ],
            [
                'id' => '3',
                'type' => 'school',
                'title' => 'Məktəb statusu yeniləndi',
                'description' => 'Yeni müəllim qəbulu tamamlandı',
                'time' => '2 gün əvvəl',
                'status' => 'completed',
                'school' => $schools->skip(1)->first()?->name ?? 'Bilinməyən məktəb'
            ],
            [
                'id' => '4',
                'type' => 'user',
                'title' => 'Yeni müəllim qeydiyyatı',
                'description' => 'Fizika müəllimi sistemi qeydiyyatdan keçdi',
                'time' => '3 gün əvvəl',
                'status' => 'completed'
            ]
        ];
    }

    /**
     * Get schools list with basic information
     */
    private function getSchoolsList($schools): array
    {
        return $schools->take(4)->map(function($school) {
            return [
                'id' => $school->id,
                'name' => $school->name,
                'type' => $school->type,
                'students' => rand(200, 600), // Mock data
                'teachers' => rand(15, 50),   // Mock data
                'status' => $school->is_active ? 'active' : 'inactive'
            ];
        })->toArray();
    }

    /**
     * Get school type display name
     */
    private function getSchoolTypeDisplay(string $type): string
    {
        $types = [
            'school' => 'Məktəb',
            'secondary_school' => 'Orta Məktəb',
            'gymnasium' => 'Gimnaziya',
            'vocational' => 'Peşə Məktəbi',
            'kindergarten' => 'Uşaq Bağçası'
        ];

        return $types[$type] ?? $type;
    }

    /**
     * Get pending survey responses for approval
     */
    public function getPendingSurveyResponses(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get pending survey responses from schools in this sector
        $pendingResponses = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->with([
                'survey:id,title,description,category',
                'institution:id,name',
                'respondent:id,name,email'
            ])
            ->orderBy('submitted_at', 'desc')
            ->get()
            ->map(function ($response) {
                return [
                    'id' => $response->id,
                    'survey_title' => $response->survey->title,
                    'survey_description' => $response->survey->description,
                    'survey_category' => $response->survey->category,
                    'school_name' => $response->institution->name,
                    'school_id' => $response->institution->id,
                    'respondent_name' => $response->respondent->name,
                    'respondent_email' => $response->respondent->email,
                    'submitted_at' => $response->submitted_at,
                    'progress_percentage' => $response->progress_percentage,
                    'status' => $response->status,
                    'responses_count' => count($response->responses ?? []),
                ];
            });

        return response()->json([
            'pending_responses' => $pendingResponses,
            'total_count' => $pendingResponses->count(),
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
            ]
        ]);
    }

    /**
     * Get survey response details for review
     */
    public function getSurveyResponseDetails(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->with([
                'survey.questions' => function ($query) {
                    $query->active()->ordered();
                },
                'institution:id,name',
                'respondent:id,name,email'
            ])
            ->find($responseId);

        if (!$response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Format response data with questions
        $questionsWithAnswers = $response->survey->questions->map(function ($question) use ($response) {
            $answer = $response->responses[$question->id] ?? null;
            
            return [
                'id' => $question->id,
                'title' => $question->title,
                'description' => $question->description,
                'type' => $question->type,
                'is_required' => $question->is_required,
                'options' => $question->options,
                'answer' => $answer,
                'formatted_answer' => $this->formatAnswer($question, $answer),
            ];
        });

        return response()->json([
            'response' => [
                'id' => $response->id,
                'status' => $response->status,
                'progress_percentage' => $response->progress_percentage,
                'submitted_at' => $response->submitted_at,
                'started_at' => $response->started_at,
            ],
            'survey' => [
                'id' => $response->survey->id,
                'title' => $response->survey->title,
                'description' => $response->survey->description,
                'category' => $response->survey->category,
            ],
            'school' => [
                'id' => $response->institution->id,
                'name' => $response->institution->name,
            ],
            'respondent' => [
                'id' => $response->respondent->id,
                'name' => $response->respondent->name,
                'email' => $response->respondent->email,
            ],
            'questions_with_answers' => $questionsWithAnswers,
        ]);
    }

    /**
     * Approve survey response
     */
    public function approveSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->find($responseId);

        if (!$response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Approve the response
        $response->approve($user);

        return response()->json([
            'message' => 'Survey response approved successfully',
            'response_id' => $response->id,
            'status' => $response->status,
            'approved_at' => $response->approved_at,
            'approved_by' => $user->name,
        ]);
    }

    /**
     * Reject survey response
     */
    public function rejectSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        $request->validate([
            'reason' => 'required|string|min:10|max:500',
        ]);

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->find($responseId);

        if (!$response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Reject the response
        $response->reject($request->reason);

        return response()->json([
            'message' => 'Survey response rejected',
            'response_id' => $response->id,
            'status' => $response->status,
            'rejection_reason' => $response->rejection_reason,
        ]);
    }

    /**
     * Format answer based on question type
     */
    private function formatAnswer($question, $answer): string
    {
        if ($answer === null) {
            return 'Cavablanmayıb';
        }

        switch ($question->type) {
            case 'rating':
                $min = $question->rating_min ?? 1;
                $max = $question->rating_max ?? 5;
                return "{$answer} / {$max}";

            case 'single_choice':
                if (is_array($question->options)) {
                    foreach ($question->options as $option) {
                        if (isset($option['id']) && $option['id'] === $answer) {
                            return $option['label'];
                        }
                    }
                }
                return $answer;

            case 'multiple_choice':
                if (is_array($answer) && is_array($question->options)) {
                    if (isset($question->options[0]) && is_string($question->options[0])) {
                        // Simple array format
                        return implode(', ', $answer);
                    } else {
                        // Object format with id/label
                        $labels = [];
                        foreach ($answer as $selectedId) {
                            foreach ($question->options as $option) {
                                if (isset($option['id']) && $option['id'] === $selectedId) {
                                    $labels[] = $option['label'];
                                    break;
                                }
                            }
                        }
                        return implode(', ', $labels);
                    }
                }
                return is_array($answer) ? implode(', ', $answer) : $answer;

            case 'number':
                return (string) $answer;

            case 'text':
                return $answer;

            default:
                return is_array($answer) ? implode(', ', $answer) : (string) $answer;
        }
    }

    /**
     * Get pending tasks for approval
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get pending tasks from schools in this sector that require approval
        $pendingTasks = Task::whereIn('id', function($query) use ($schoolIds) {
                // Tasks that are either assigned to schools or target schools in this sector
                $query->select('id')->from('tasks')
                    ->where(function($q) use ($schoolIds) {
                        $q->whereIn('assigned_institution_id', $schoolIds)
                          ->orWhere(function($subQ) use ($schoolIds) {
                              foreach ($schoolIds as $schoolId) {
                                  $subQ->orWhereJsonContains('target_institutions', $schoolId);
                              }
                          });
                    });
            })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->with([
                'creator:id,name,email',
                'assignedInstitution:id,name',
                'progressLogs' => function($query) {
                    $query->latest()->limit(1);
                }
            ])
            ->orderBy('completed_at', 'desc')
            ->get()
            ->map(function ($task) {
                $latestLog = $task->progressLogs->first();
                
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'category' => $task->category,
                    'category_label' => $task->category_label,
                    'priority' => $task->priority,
                    'priority_label' => $task->priority_label,
                    'status' => $task->status,
                    'status_label' => $task->status_label,
                    'progress' => $task->progress,
                    'deadline' => $task->deadline,
                    'completed_at' => $task->completed_at,
                    'created_by' => $task->creator->name ?? 'System',
                    'assigned_institution' => $task->assignedInstitution ? $task->assignedInstitution->name : 'Multiple Schools',
                    'target_institutions_count' => count($task->target_institutions ?? []),
                    'latest_notes' => $latestLog ? $latestLog->notes : null,
                    'is_overdue' => $task->isOverdue(),
                ];
            });

        return response()->json([
            'pending_tasks' => $pendingTasks,
            'total_count' => $pendingTasks->count(),
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
            ]
        ]);
    }

    /**
     * Get task details for review
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })
            ->with([
                'creator:id,name,email',
                'assignedInstitution:id,name',
                'progressLogs.updatedBy:id,name,email,institution_id',
                'progressLogs' => function($query) {
                    $query->orderBy('created_at', 'desc');
                }
            ])
            ->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        // Get schools that completed this task
        $completedSchools = [];
        if ($task->target_institutions) {
            $completedSchools = Institution::whereIn('id', $task->target_institutions)
                ->get()
                ->map(function($school) use ($task) {
                    $latestProgress = TaskProgressLog::where('task_id', $task->id)
                        ->whereHas('updatedBy', function($q) use ($school) {
                            $q->where('institution_id', $school->id);
                        })
                        ->latest()
                        ->first();
                    
                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'status' => $latestProgress ? $latestProgress->new_status : 'pending',
                        'progress' => $latestProgress ? $latestProgress->progress_percentage : 0,
                        'notes' => $latestProgress ? $latestProgress->notes : null,
                        'updated_at' => $latestProgress ? $latestProgress->created_at : null,
                    ];
                });
        }

        return response()->json([
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'category' => $task->category,
                'category_label' => $task->category_label,
                'priority' => $task->priority,
                'priority_label' => $task->priority_label,
                'status' => $task->status,
                'status_label' => $task->status_label,
                'progress' => $task->progress,
                'deadline' => $task->deadline,
                'created_at' => $task->created_at,
                'started_at' => $task->started_at,
                'completed_at' => $task->completed_at,
                'created_by' => $task->creator->name ?? 'System',
                'requires_approval' => $task->requires_approval,
                'notes' => $task->notes,
                'attachments' => $task->attachments,
                'target_institutions' => $task->target_institutions,
                'is_overdue' => $task->isOverdue(),
            ],
            'progress_logs' => $task->progressLogs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'old_status' => $log->old_status,
                    'new_status' => $log->new_status,
                    'progress_percentage' => $log->progress_percentage,
                    'notes' => $log->notes,
                    'updated_by' => $log->updatedBy->name ?? 'System',
                    'school' => $log->updatedBy->institution->name ?? 'Unknown',
                    'created_at' => $log->created_at,
                ];
            }),
            'completed_schools' => $completedSchools,
        ]);
    }

    /**
     * Approve task
     */
    public function approveTask(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        // Approve the task
        $oldStatus = $task->status;
        $task->status = 'completed';
        $task->approved_by = $user->id;
        $task->approved_at = now();
        $task->save();

        // Log the approval
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => 'completed',
            'progress_percentage' => 100,
            'notes' => 'SektorAdmin tərəfindən təsdiqləndi' . ($request->notes ? ': ' . $request->notes : ''),
        ]);

        // Send approval notification
        $notificationService = app(TaskNotificationService::class);
        $notificationService->notifyTaskApprovalDecision($task, 'approved', $user, $request->notes);

        return response()->json([
            'message' => 'Task approved successfully',
            'task_id' => $task->id,
            'status' => $task->status,
            'approved_at' => $task->approved_at,
            'approved_by' => $user->name,
        ]);
    }

    /**
     * Reject task
     */
    public function rejectTask(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        $request->validate([
            'reason' => 'required|string|min:10|max:500',
        ]);

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        // Reject the task - send back to in_progress for revision
        $oldStatus = $task->status;
        $task->status = 'in_progress';
        $task->save();

        // Log the rejection
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => 'in_progress',
            'progress_percentage' => $task->progress,
            'notes' => 'SektorAdmin tərəfindən rədd edildi - Səbəb: ' . $request->reason,
        ]);

        // Send rejection notification
        $notificationService = app(TaskNotificationService::class);
        $notificationService->notifyTaskApprovalDecision($task, 'rejected', $user, $request->reason);

        return response()->json([
            'message' => 'Task rejected and sent back for revision',
            'task_id' => $task->id,
            'status' => $task->status,
            'rejection_reason' => $request->reason,
        ]);
    }

    /**
     * Get task statistics for sector
     */
    public function getTaskStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (!$sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get task statistics
        $stats = [
            'total_tasks' => Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })->count(),
            
            'pending_approval' => Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })->where('status', 'review')->where('requires_approval', true)->count(),
            
            'approved_tasks' => Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })->where('status', 'completed')->whereNotNull('approved_by')->count(),
            
            'in_progress_tasks' => Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })->where('status', 'in_progress')->count(),
            
            'overdue_tasks' => Task::where(function($q) use ($schoolIds) {
                $q->whereIn('assigned_institution_id', $schoolIds)
                  ->orWhere(function($subQ) use ($schoolIds) {
                      foreach ($schoolIds as $schoolId) {
                          $subQ->orWhereJsonContains('target_institutions', $schoolId);
                      }
                  });
            })->overdue()->count(),
        ];

        return response()->json($stats);
    }
}