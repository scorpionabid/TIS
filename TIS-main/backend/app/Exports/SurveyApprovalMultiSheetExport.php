<?php

namespace App\Exports;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Multi-sheet export for survey responses.
 * - Sheet 1 (Xülasə): All responses × all questions as columns (SurveyApprovalExport)
 * - Sheet 2+: One sheet per table_input question only
 *   - Sıra 1: Sualın tam başlığı (birləşdirilmiş xana)
 *   - Sıra 2: Sektor | Müəssisə | Sətir № | col1 | col2 | ...
 *   - Sıra 3+: Məlumatlar
 */
class SurveyApprovalMultiSheetExport implements WithMultipleSheets
{
    protected Survey $survey;

    protected Request $request;

    protected User $user;

    public function __construct(Survey $survey, Request $request, User $user)
    {
        $this->survey = $survey;
        $this->request = $request;
        $this->user = $user;
    }

    public function sheets(): array
    {
        $sheets = [];

        // Sheet 1: Summary — all responses × all questions (same as before)
        $sheets[] = new SurveyApprovalExport($this->survey, $this->request, $this->user);

        // Load all survey questions ordered by display index
        $this->survey->load(['questions' => function ($query) {
            $query->orderBy('order_index');
        }]);

        // Yalnız table_input suallarını tap
        $tableInputQuestions = $this->survey->questions->filter(
            fn ($q) => $q->type === 'table_input'
        );

        if ($tableInputQuestions->isEmpty()) {
            return $sheets;
        }

        // Müəssisə məlumatı ilə cavabları al
        $responses = $this->getResponses();

        // Hər table_input sualı üçün ayrı vərəq yarat
        foreach ($tableInputQuestions as $question) {
            $sheets[] = new TableInputSheetExport($question, $responses);
        }

        return $sheets;
    }

    /**
     * Get responses with access control applied
     */
    private function getResponses()
    {
        $query = SurveyResponse::where('survey_id', $this->survey->id)
            ->with([
                'institution:id,name,type,short_name,parent_id,level',
                'institution.parent:id,name,type,short_name',
            ]);

        // Apply user access control
        $this->applyUserAccessControl($query);

        // Apply filters
        $filters = $this->request->all();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (! empty($filters['response_ids']) && is_array($filters['response_ids'])) {
            $query->whereIn('id', $filters['response_ids']);
        }

        return $query->get();
    }

    private function applyUserAccessControl($query): void
    {
        $userRoleName = $this->user->getRoleNames()->first();

        $filters = $this->request->all();
        if (! empty($filters['response_ids']) && in_array($userRoleName, ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'])) {
            return;
        }

        switch ($userRoleName) {
            case 'superadmin':
                break;

            case 'regionadmin':
            case 'regionoperator':
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'sektoradmin':
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'schooladmin':
                if ($this->user->institution) {
                    $query->where('institution_id', $this->user->institution->id);
                }
                break;

            default:
                if ($this->user->institution) {
                    $query->where('institution_id', $this->user->institution->id);
                }
        }
    }
}
