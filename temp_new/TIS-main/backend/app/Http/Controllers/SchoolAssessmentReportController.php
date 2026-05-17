<?php

namespace App\Http\Controllers;

use App\Exports\SummaryReportExport;
use App\Models\AssessmentStage;
use App\Models\AssessmentType;
use App\Services\SchoolAssessmentReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class SchoolAssessmentReportController extends Controller
{
    public function __construct(
        private readonly SchoolAssessmentReportService $reportService
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (! $user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu hesabat üçün icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_stage_id' => 'required|exists:assessment_stages,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'class_label' => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        /** @var AssessmentType $assessmentType */
        $assessmentType = AssessmentType::findOrFail($data['assessment_type_id']);
        /** @var AssessmentStage $stage */
        $stage = AssessmentStage::findOrFail($data['assessment_stage_id']);

        if ($stage->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilmiş mərhələ bu qiymətləndirmə növünə aid deyil',
            ], 422);
        }

        $filters = [
            'institution_id' => $data['institution_id'] ?? null,
            'class_label' => $data['class_label'] ?? null,
            'subject' => $data['subject'] ?? null,
            'per_page' => $data['per_page'] ?? null,
            'page' => $data['page'] ?? 1,
        ];

        if ($user->hasRole('regionadmin')) {
            $filters['region_id'] = $user->institution?->region_id;
        } elseif ($user->hasRole('schooladmin')) {
            $filters['institution_id'] = $user->institution_id;
        }

        $report = $this->reportService->generateReport(
            $assessmentType->id,
            $stage->id,
            $filters
        );

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        if (! $user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu hesabat üçün icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_stage_id' => 'required|exists:assessment_stages,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'class_label' => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        /** @var AssessmentType $assessmentType */
        $assessmentType = AssessmentType::findOrFail($data['assessment_type_id']);
        /** @var AssessmentStage $stage */
        $stage = AssessmentStage::findOrFail($data['assessment_stage_id']);

        if ($stage->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilmiş mərhələ bu qiymətləndirmə növünə aid deyil',
            ], 422);
        }

        $filters = [
            'institution_id' => $data['institution_id'] ?? null,
            'class_label' => $data['class_label'] ?? null,
            'subject' => $data['subject'] ?? null,
        ];

        if ($user->hasRole('regionadmin')) {
            $filters['region_id'] = $user->institution?->region_id;
        } elseif ($user->hasRole('schooladmin')) {
            $filters['institution_id'] = $user->institution_id;
        }

        $report = $this->reportService->generateReport(
            $assessmentType->id,
            $stage->id,
            $filters
        );

        $fileName = sprintf(
            'Hesabat_%s_%s_%s.xlsx',
            $assessmentType->name ?? 'Qiymetlendirme',
            $stage->name ?? 'Merhele',
            now()->format('d_m_Y')
        );

        // Sanitize filename
        $fileName = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $fileName);

        return Excel::download(new SummaryReportExport($report), $fileName);
    }
}
