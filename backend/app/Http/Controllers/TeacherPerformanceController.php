<?php

namespace App\Http\Controllers;

use App\Models\TeacherEvaluation;
use App\Models\PerformanceMetric;
use App\Services\TeacherPerformanceService;
use App\Services\PermissionCheckService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TeacherPerformanceController extends BaseController
{
    public function __construct(
        private TeacherPerformanceService $performanceService,
        private PermissionCheckService $permissionService
    ) {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:view teacher_performance')->only(['index', 'show']);
        $this->middleware('permission:create teacher_performance')->only(['store']);
        $this->middleware('permission:edit teacher_performance')->only(['update']);
        $this->middleware('permission:delete teacher_performance')->only(['destroy']);
        $this->middleware('permission:manage teacher_performance')->only(['approve', 'requestRevision']);
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'teacher_id', 'evaluator_id', 'institution_id', 'academic_year',
                'evaluation_type', 'status', 'overall_rating', 'search',
                'requires_improvement', 'overdue'
            ]);
            
            $perPage = $request->get('per_page', 15);
            
            $evaluations = $this->performanceService->getEvaluations($filters, $perPage);

            return $this->success(
                'Müəllim qiymətləndirmələri uğurla əldə edildi',
                $evaluations
            );
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmələr əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $evaluation = $this->performanceService->createEvaluation($request->all());

            return $this->success(
                'Qiymətləndirmə uğurla yaradıldı',
                $evaluation,
                201
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə yaradıla bilmədi: ' . $e->getMessage());
        }
    }

    public function show(TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canAccessEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməyə giriş icazəniz yoxdur', 403);
            }

            $evaluationData = $this->performanceService->getEvaluationDetails($evaluation->id);

            return $this->success(
                'Qiymətləndirmə məlumatları əldə edildi',
                $evaluationData
            );
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə məlumatları əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function update(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canUpdateEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməni dəyişmək icazəniz yoxdur', 403);
            }

            $updatedEvaluation = $this->performanceService->updateEvaluation(
                $evaluation->id,
                $request->all()
            );

            return $this->success(
                'Qiymətləndirmə uğurla yeniləndi',
                $updatedEvaluation
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə yenilənə bilmədi: ' . $e->getMessage());
        }
    }

    public function destroy(TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canDeleteEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməni silmək icazəniz yoxdur', 403);
            }

            $this->performanceService->deleteEvaluation($evaluation->id);

            return $this->success('Qiymətləndirmə uğurla silindi');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə silinə bilmədi: ' . $e->getMessage());
        }
    }

    public function complete(TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canCompleteEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməni tamamlamaq icazəniz yoxdur', 403);
            }

            $result = $this->performanceService->completeEvaluation($evaluation->id);

            return $this->success(
                'Qiymətləndirmə uğurla tamamlandı',
                $result
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə tamamlana bilmədi: ' . $e->getMessage());
        }
    }

    public function approve(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canApproveEvaluation()) {
                return $this->error('Qiymətləndirmə təsdiqlənmək icazəniz yoxdur', 403);
            }

            $approvedEvaluation = $this->performanceService->approveEvaluation($evaluation->id);

            return $this->success(
                'Qiymətləndirmə uğurla təsdiqləndi',
                $approvedEvaluation
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Qiymətləndirmə təsdiqlənə bilmədi: ' . $e->getMessage());
        }
    }

    public function requestRevision(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canRequestRevision()) {
                return $this->error('Düzəliş tələb etmək icazəniz yoxdur', 403);
            }

            $validated = $request->validate([
                'reason' => 'required|string|max:500',
            ]);

            $this->performanceService->requestRevision($evaluation->id, $validated['reason']);

            return $this->success('Düzəliş tələbi göndərildi');
        } catch (\Exception $e) {
            return $this->error('Düzəliş tələbi göndərilə bilmədi: ' . $e->getMessage());
        }
    }

    public function addGoal(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canModifyEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməyə hədəf əlavə etmək icazəniz yoxdur', 403);
            }

            $validated = $request->validate([
                'goal' => 'required|string|max:500',
                'target_date' => 'nullable|date|after:today',
                'priority' => 'sometimes|string|in:low,medium,high',
            ]);

            $result = $this->performanceService->addGoal(
                $evaluation->id,
                $validated['goal'],
                $validated['target_date'] ?? null,
                $validated['priority'] ?? 'medium'
            );

            return $this->success('Hədəf uğurla əlavə edildi', $result);
        } catch (\Exception $e) {
            return $this->error('Hədəf əlavə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function markGoalAchieved(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canModifyEvaluation($evaluation)) {
                return $this->error('Bu hədəfi əldə edilmiş kimi işarələmək icazəniz yoxdur', 403);
            }

            $validated = $request->validate([
                'goal_index' => 'required|integer|min:0',
            ]);

            $result = $this->performanceService->markGoalAchieved(
                $evaluation->id,
                $validated['goal_index']
            );

            return $this->success('Hədəf əldə edilmiş kimi işarələndi', $result);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        } catch (\Exception $e) {
            return $this->error('Hədəf işarələnə bilmədi: ' . $e->getMessage());
        }
    }

    public function addRecommendation(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canModifyEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməyə tövsiyə əlavə etmək icazəniz yoxdur', 403);
            }

            $validated = $request->validate([
                'recommendation' => 'required|string|max:500',
                'priority' => 'sometimes|string|in:low,medium,high',
            ]);

            $recommendations = $this->performanceService->addRecommendation(
                $evaluation->id,
                $validated['recommendation'],
                $validated['priority'] ?? 'medium'
            );

            return $this->success('Tövsiyə uğurla əlavə edildi', $recommendations);
        } catch (\Exception $e) {
            return $this->error('Tövsiyə əlavə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function getMetrics(TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canAccessEvaluation($evaluation)) {
                return $this->error('Bu metrikalara giriş icazəniz yoxdur', 403);
            }

            $metrics = $this->performanceService->getMetrics($evaluation->id);

            return $this->success('Performans metrikaları əldə edildi', $metrics);
        } catch (\Exception $e) {
            return $this->error('Metrikalar əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function addMetric(Request $request, TeacherEvaluation $evaluation): JsonResponse
    {
        try {
            if (!$this->permissionService->canModifyEvaluation($evaluation)) {
                return $this->error('Bu qiymətləndirməyə metrika əlavə etmək icazəniz yoxdur', 403);
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

            $metric = $this->performanceService->addMetric($evaluation->id, $validated);

            return $this->success(
                'Performans metrikası uğurla əlavə edildi',
                $metric,
                201
            );
        } catch (\Exception $e) {
            return $this->error('Metrika əlavə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function getTeacherSummary(Request $request, $teacherId): JsonResponse
    {
        try {
            if (!$this->permissionService->canAccessTeacherData($teacherId)) {
                return $this->error('Bu müəllimin məlumatlarına giriş icazəniz yoxdur', 403);
            }

            $academicYear = $request->get('academic_year', now()->year);
            $summary = $this->performanceService->getTeacherPerformanceSummary($teacherId, $academicYear);

            return $this->success(
                'Müəllim performans xülasəsi əldə edildi',
                $summary
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        } catch (\Exception $e) {
            return $this->error('Müəllim xülasəsi əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    public function getInstitutionStats(Request $request, $institutionId): JsonResponse
    {
        try {
            if (!$this->permissionService->canAccessInstitutionData($institutionId)) {
                return $this->error('Bu təşkilatın məlumatlarına giriş icazəniz yoxdur', 403);
            }

            $academicYear = $request->get('academic_year', now()->year);
            $stats = $this->performanceService->getInstitutionStatistics($institutionId, $academicYear);

            return $this->success(
                'Təşkilat performans statistikası əldə edildi',
                $stats
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        } catch (\Exception $e) {
            return $this->error('Təşkilat statistikaları əldə edilə bilmədi: ' . $e->getMessage());
        }
    }
}
