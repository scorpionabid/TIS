<?php

namespace App\Http\Controllers;

use App\Models\TeacherEvaluation;
use App\Models\PerformanceMetric;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeacherPerformanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:view teacher_performance')->only(['index', 'show']);
        $this->middleware('permission:create teacher_performance')->only(['store']);
        $this->middleware('permission:edit teacher_performance')->only(['update']);
        $this->middleware('permission:delete teacher_performance')->only(['destroy']);
        $this->middleware('permission:manage teacher_performance')->only(['approve', 'requestRevision']);
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $query = TeacherEvaluation::with(['teacher.profile', 'evaluator.profile', 'institution', 'metrics']);

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $query->whereHas('institution', function($q) use ($user) {
                    $q->where('region_id', $user->region_id);
                });
            } elseif ($user->hasRole('schooladmin')) {
                $query->where('institution_id', $user->institution_id);
            } elseif ($user->hasRole('mudur')) {
                $query->where('teacher_id', $user->id)
                     ->orWhere('evaluator_id', $user->id);
            }
        }

        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        if ($request->filled('evaluator_id')) {
            $query->where('evaluator_id', $request->evaluator_id);
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->academic_year);
        }

        if ($request->filled('evaluation_type')) {
            $query->where('evaluation_type', $request->evaluation_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('overall_rating')) {
            $query->where('overall_rating', $request->overall_rating);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('teacher', function($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereHas('profile', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->boolean('requires_improvement')) {
            $query->where('improvement_plan_required', true);
        }

        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        $evaluations = $query->orderBy('evaluation_date', 'desc')
                           ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Müəllim qiymətləndirmələri uğurla əldə edildi',
            'data' => $evaluations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'institution_id' => 'required|exists:institutions,id',
            'evaluation_period' => 'required|string|in:q1,q2,q3,q4,semester1,semester2,annual',
            'academic_year' => 'required|integer|min:2020|max:2030',
            'evaluation_type' => 'required|string|in:annual,probationary,mid_year,promotion,performance_improvement,special,continuous',
            'evaluation_date' => 'required|date',
            'teaching_effectiveness_score' => 'nullable|numeric|min:0|max:100',
            'classroom_management_score' => 'nullable|numeric|min:0|max:100',
            'subject_knowledge_score' => 'nullable|numeric|min:0|max:100',
            'student_engagement_score' => 'nullable|numeric|min:0|max:100',
            'professional_development_score' => 'nullable|numeric|min:0|max:100',
            'collaboration_score' => 'nullable|numeric|min:0|max:100',
            'innovation_score' => 'nullable|numeric|min:0|max:100',
            'punctuality_score' => 'nullable|numeric|min:0|max:100',
            'communication_score' => 'nullable|numeric|min:0|max:100',
            'leadership_score' => 'nullable|numeric|min:0|max:100',
            'strengths' => 'nullable|array',
            'areas_for_improvement' => 'nullable|array',
            'goals_set' => 'nullable|array',
            'recommendations' => 'nullable|array',
            'evaluator_comments' => 'nullable|string',
            'teacher_self_assessment' => 'nullable|string',
            'student_feedback_summary' => 'nullable|string',
            'parent_feedback_summary' => 'nullable|string',
            'peer_feedback_summary' => 'nullable|string',
            'classroom_observation_notes' => 'nullable|string',
            'lesson_plan_review' => 'nullable|string',
            'student_performance_analysis' => 'nullable|string',
            'attendance_record' => 'nullable|string',
            'professional_activities' => 'nullable|array',
            'certification_status' => 'nullable|string',
            'support_provided' => 'nullable|array',
        ]);

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $institution = Institution::find($validated['institution_id']);
                if (!$institution || $institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu təşkil üçün icazə yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($validated['institution_id'] !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Yalnız öz təşkilinizdə qiymətləndirmə yarada bilərsiniz',
                    ], 403);
                }
            }
        }

        $existingEvaluation = TeacherEvaluation::where('teacher_id', $validated['teacher_id'])
            ->where('evaluation_period', $validated['evaluation_period'])
            ->where('academic_year', $validated['academic_year'])
            ->where('evaluation_type', $validated['evaluation_type'])
            ->first();

        if ($existingEvaluation) {
            return response()->json([
                'success' => false,
                'message' => 'Bu müəllim üçün həmin dövr və il üçün artıq qiymətləndirmə mövcuddur',
            ], 422);
        }

        $validated['evaluator_id'] = $user->id;
        $validated['status'] = 'draft';

        $evaluation = TeacherEvaluation::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə uğurla yaradıldı',
            'data' => $evaluation->load(['teacher.profile', 'evaluator.profile', 'institution']),
        ], 201);
    }

    public function show(TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if (!$evaluation->institution || $evaluation->institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməyə giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($evaluation->institution_id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməyə giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif (!in_array($user->id, [$evaluation->teacher_id, $evaluation->evaluator_id])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu qiymətləndirməyə giriş icazəniz yoxdur',
                ], 403);
            }
        }

        $evaluation->load(['teacher.profile', 'evaluator.profile', 'approver.profile', 'institution', 'metrics']);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə məlumatları əldə edildi',
            'data' => $evaluation->generateEvaluationSummary(),
        ]);
    }

    public function update(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if (!$evaluation->institution || $evaluation->institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməni dəyişmək icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($evaluation->institution_id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməni dəyişmək icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($evaluation->evaluator_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yalnız öz qiymətləndirmələrinizi dəyişə bilərsiniz',
                ], 403);
            }
        }

        if ($evaluation->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş qiymətləndirmə dəyişdirilə bilməz',
            ], 422);
        }

        $validated = $request->validate([
            'evaluation_period' => 'sometimes|string|in:q1,q2,q3,q4,semester1,semester2,annual',
            'evaluation_type' => 'sometimes|string|in:annual,probationary,mid_year,promotion,performance_improvement,special,continuous',
            'evaluation_date' => 'sometimes|date',
            'teaching_effectiveness_score' => 'nullable|numeric|min:0|max:100',
            'classroom_management_score' => 'nullable|numeric|min:0|max:100',
            'subject_knowledge_score' => 'nullable|numeric|min:0|max:100',
            'student_engagement_score' => 'nullable|numeric|min:0|max:100',
            'professional_development_score' => 'nullable|numeric|min:0|max:100',
            'collaboration_score' => 'nullable|numeric|min:0|max:100',
            'innovation_score' => 'nullable|numeric|min:0|max:100',
            'punctuality_score' => 'nullable|numeric|min:0|max:100',
            'communication_score' => 'nullable|numeric|min:0|max:100',
            'leadership_score' => 'nullable|numeric|min:0|max:100',
            'strengths' => 'nullable|array',
            'areas_for_improvement' => 'nullable|array',
            'goals_set' => 'nullable|array',
            'recommendations' => 'nullable|array',
            'evaluator_comments' => 'nullable|string',
            'teacher_self_assessment' => 'nullable|string',
            'student_feedback_summary' => 'nullable|string',
            'parent_feedback_summary' => 'nullable|string',
            'peer_feedback_summary' => 'nullable|string',
            'classroom_observation_notes' => 'nullable|string',
            'lesson_plan_review' => 'nullable|string',
            'student_performance_analysis' => 'nullable|string',
            'attendance_record' => 'nullable|string',
            'professional_activities' => 'nullable|array',
            'certification_status' => 'nullable|string',
            'support_provided' => 'nullable|array',
        ]);

        $evaluation->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə uğurla yeniləndi',
            'data' => $evaluation->load(['teacher.profile', 'evaluator.profile', 'institution']),
        ]);
    }

    public function destroy(TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if (!$evaluation->institution || $evaluation->institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməni silmək icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($evaluation->institution_id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu qiymətləndirməni silmək icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($evaluation->evaluator_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yalnız öz qiymətləndirmələrinizi silə bilərsiniz',
                ], 403);
                }
        }

        if ($evaluation->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş qiymətləndirmə silinə bilməz',
            ], 422);
        }

        $evaluation->metrics()->delete();
        $evaluation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə uğurla silindi',
        ]);
    }

    public function complete(TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin') && $evaluation->evaluator_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməni tamamlamaq icazəniz yoxdur',
            ], 403);
        }

        if ($evaluation->status === 'completed' || $evaluation->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə artıq tamamlanıb',
            ], 422);
        }

        $overallScore = $evaluation->calculateOverallScore();
        
        $evaluation->complete($overallScore);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə uğurla tamamlandı',
            'data' => [
                'overall_score' => $evaluation->overall_score,
                'overall_rating' => $evaluation->overall_rating_label,
                'next_evaluation_date' => $evaluation->next_evaluation_date,
            ],
        ]);
    }

    public function approve(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('manage teacher_performance')) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə təsdiqlənmək icazəniz yoxdur',
            ], 403);
        }

        if ($evaluation->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız tamamlanmış qiymətləndirmələr təsdiqlənə bilər',
            ], 422);
        }

        $evaluation->approve($user->id);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə uğurla təsdiqləndi',
            'data' => $evaluation->load(['approver.profile']),
        ]);
    }

    public function requestRevision(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('manage teacher_performance')) {
            return response()->json([
                'success' => false,
                'message' => 'Düzəliş tələb etmək icazəniz yoxdur',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $evaluation->requestRevision($validated['reason']);

        return response()->json([
            'success' => true,
            'message' => 'Düzəliş tələbi göndərildi',
        ]);
    }

    public function addGoal(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin') && $evaluation->evaluator_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməyə hədəf əlavə etmək icazəniz yoxdur',
            ], 403);
        }

        $validated = $request->validate([
            'goal' => 'required|string|max:500',
            'target_date' => 'nullable|date|after:today',
            'priority' => 'sometimes|string|in:low,medium,high',
        ]);

        $evaluation->addGoal(
            $validated['goal'],
            $validated['target_date'] ?? null,
            $validated['priority'] ?? 'medium'
        );

        return response()->json([
            'success' => true,
            'message' => 'Hədəf uğurla əlavə edildi',
            'data' => [
                'active_goals' => $evaluation->getActiveGoals(),
                'total_goals' => count($evaluation->goals_set ?? []),
            ],
        ]);
    }

    public function markGoalAchieved(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin') && $evaluation->evaluator_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu hədəfi əldə edilmiş kimi işarələmək icazəniz yoxdur',
            ], 403);
        }

        $validated = $request->validate([
            'goal_index' => 'required|integer|min:0',
        ]);

        $goals = $evaluation->goals_set ?? [];
        if (!isset($goals[$validated['goal_index']])) {
            return response()->json([
                'success' => false,
                'message' => 'Hədəf tapılmadı',
            ], 404);
        }

        $evaluation->markGoalAchieved($validated['goal_index']);

        return response()->json([
            'success' => true,
            'message' => 'Hədəf əldə edilmiş kimi işarələndi',
            'data' => [
                'achieved_goals' => $evaluation->getAchievedGoals(),
                'active_goals' => $evaluation->getActiveGoals(),
            ],
        ]);
    }

    public function addRecommendation(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin') && $evaluation->evaluator_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməyə tövsiyə əlavə etmək icazəniz yoxdur',
            ], 403);
        }

        $validated = $request->validate([
            'recommendation' => 'required|string|max:500',
            'priority' => 'sometimes|string|in:low,medium,high',
        ]);

        $evaluation->addRecommendation(
            $validated['recommendation'],
            $validated['priority'] ?? 'medium'
        );

        return response()->json([
            'success' => true,
            'message' => 'Tövsiyə uğurla əlavə edildi',
            'data' => $evaluation->recommendations,
        ]);
    }

    public function getMetrics(TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if (!$evaluation->institution || $evaluation->institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu metrikalara giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($evaluation->institution_id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu metrikalara giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif (!in_array($user->id, [$evaluation->teacher_id, $evaluation->evaluator_id])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu metrikalara giriş icazəniz yoxdur',
                ], 403);
            }
        }

        $metrics = $evaluation->metrics()->get();

        return response()->json([
            'success' => true,
            'message' => 'Performans metrikaları əldə edildi',
            'data' => $metrics->map(function($metric) {
                return $metric->getMetricSummary();
            }),
        ]);
    }

    public function addMetric(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('superadmin') && $evaluation->evaluator_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməyə metrika əlavə etmək icazəniz yoxdur',
            ], 403);
        }

        $validated = $request->validate([
            'metric_type' => 'required|string|in:student_performance,attendance,lesson_quality,engagement,innovation,collaboration,professional_development,student_satisfaction,parent_satisfaction,peer_evaluation,administrative_tasks,extracurricular',
            'metric_name' => 'required|string|max:200',
            'metric_value' => 'required|numeric|min:0',
            'target_value' => 'required|numeric|min:0',
            'unit_of_measure' => 'required|string|max:50',
            'measurement_period' => 'nullable|string|max:100',
            'data_source' => 'nullable|string|max:200',
            'calculation_method' => 'nullable|string|max:200',
            'weight' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $validated['evaluation_id'] = $evaluation->id;
        $validated['teacher_id'] = $evaluation->teacher_id;

        $metric = PerformanceMetric::create($validated);
        $metric->updateAchievementLevel();

        return response()->json([
            'success' => true,
            'message' => 'Performans metrikası uğurla əlavə edildi',
            'data' => $metric->getMetricSummary(),
        ], 201);
    }

    public function getTeacherSummary(Request $request, $teacherId): JsonResponse
    {
        $user = Auth::user();

        $teacher = User::find($teacherId);
        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'Müəllim tapılmadı',
            ], 404);
        }

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if ($teacher->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu müəllimin məlumatlarına giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($teacher->institution_id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu müəllimin məlumatlarına giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($teacher->id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur',
                ], 403);
            }
        }

        $academicYear = $request->get('academic_year', now()->year);

        $evaluations = TeacherEvaluation::byTeacher($teacherId)
            ->where('academic_year', $academicYear)
            ->completed()
            ->with(['metrics'])
            ->orderBy('evaluation_date', 'desc')
            ->get();

        $overallStats = [
            'total_evaluations' => $evaluations->count(),
            'average_score' => $evaluations->avg('overall_score'),
            'latest_rating' => $evaluations->first()?->overall_rating_label,
            'improvement_required' => $evaluations->where('improvement_plan_required', true)->count(),
            'goals_set' => $evaluations->sum(fn($e) => count($e->goals_set ?? [])),
            'goals_achieved' => $evaluations->sum(fn($e) => count($e->getAchievedGoals())),
        ];

        $scoreBreakdown = $evaluations->isNotEmpty() ? [
            'teaching_effectiveness' => $evaluations->avg('teaching_effectiveness_score'),
            'classroom_management' => $evaluations->avg('classroom_management_score'),
            'subject_knowledge' => $evaluations->avg('subject_knowledge_score'),
            'student_engagement' => $evaluations->avg('student_engagement_score'),
            'professional_development' => $evaluations->avg('professional_development_score'),
            'collaboration' => $evaluations->avg('collaboration_score'),
            'innovation' => $evaluations->avg('innovation_score'),
            'punctuality' => $evaluations->avg('punctuality_score'),
            'communication' => $evaluations->avg('communication_score'),
            'leadership' => $evaluations->avg('leadership_score'),
        ] : [];

        $trendData = $evaluations->map(function($evaluation) {
            return [
                'date' => $evaluation->evaluation_date,
                'score' => $evaluation->overall_score,
                'rating' => $evaluation->overall_rating,
                'type' => $evaluation->evaluation_type,
            ];
        })->toArray();

        return response()->json([
            'success' => true,
            'message' => 'Müəllim performans xülasəsi əldə edildi',
            'data' => [
                'teacher' => [
                    'id' => $teacher->id,
                    'name' => $teacher->profile 
                        ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                        : $teacher->username,
                    'email' => $teacher->email,
                ],
                'academic_year' => $academicYear,
                'overall_stats' => $overallStats,
                'score_breakdown' => $scoreBreakdown,
                'trend_data' => $trendData,
                'recent_evaluations' => $evaluations->take(5)->map(fn($e) => $e->generateEvaluationSummary()),
            ],
        ]);
    }

    public function getInstitutionStats(Request $request, $institutionId): JsonResponse
    {
        $user = Auth::user();

        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat tapılmadı',
            ], 404);
        }

        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                if ($institution->region_id !== $user->region_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu təşkilatın məlumatlarına giriş icazəniz yoxdur',
                    ], 403);
                }
            } elseif ($user->hasRole('schooladmin')) {
                if ($institution->id !== $user->institution_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu təşkilatın məlumatlarına giriş icazəniz yoxdur',
                    ], 403);
                }
            }
        }

        $academicYear = $request->get('academic_year', now()->year);

        $evaluations = TeacherEvaluation::byInstitution($institutionId)
            ->where('academic_year', $academicYear)
            ->completed()
            ->with(['teacher.profile'])
            ->get();

        $stats = [
            'total_evaluations' => $evaluations->count(),
            'total_teachers' => $evaluations->pluck('teacher_id')->unique()->count(),
            'average_score' => round($evaluations->avg('overall_score'), 2),
            'score_distribution' => [
                'excellent' => $evaluations->where('overall_rating', 'excellent')->count(),
                'very_good' => $evaluations->where('overall_rating', 'very_good')->count(),
                'good' => $evaluations->where('overall_rating', 'good')->count(),
                'satisfactory' => $evaluations->where('overall_rating', 'satisfactory')->count(),
                'needs_improvement' => $evaluations->where('overall_rating', 'needs_improvement')->count(),
                'unsatisfactory' => $evaluations->where('overall_rating', 'unsatisfactory')->count(),
            ],
            'improvement_required' => $evaluations->where('improvement_plan_required', true)->count(),
            'top_performers' => $evaluations->where('overall_score', '>=', 90)
                ->sortByDesc('overall_score')
                ->take(5)
                ->map(function($evaluation) {
                    return [
                        'teacher_name' => $evaluation->teacher->profile 
                            ? "{$evaluation->teacher->profile->first_name} {$evaluation->teacher->profile->last_name}"
                            : $evaluation->teacher->username,
                        'score' => $evaluation->overall_score,
                        'rating' => $evaluation->overall_rating_label,
                    ];
                })->values(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Təşkilat performans statistikası əldə edildi',
            'data' => [
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                ],
                'academic_year' => $academicYear,
                'statistics' => $stats,
            ],
        ]);
    }
}
