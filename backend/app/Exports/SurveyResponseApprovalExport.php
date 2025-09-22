<?php

namespace App\Exports;

use App\Models\Survey;
use App\Models\SurveyResponse;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Http\Request;
use App\Models\User;

class SurveyResponseApprovalExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithColumnWidths
{
    protected Survey $survey;
    protected Request $request;
    protected User $user;
    protected array $filters;

    public function __construct(Survey $survey, Request $request, User $user)
    {
        $this->survey = $survey;
        $this->request = $request;
        $this->user = $user;
        $this->filters = $request->all();
    }

    public function collection()
    {
        // Load survey questions to ensure they're available for export
        $this->survey->load(['questions' => function($query) {
            $query->orderBy('order_index')->select('id', 'survey_id', 'title', 'text', 'question', 'order_index');
        }]);

        // Production: Only log essential information
        if (app()->environment('local', 'development')) {
            \Log::info('Survey questions loaded for export', [
                'survey_id' => $this->survey->id,
                'questions_count' => $this->survey->questions->count(),
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2)
            ]);
        }

        // Optimize query for large datasets - select only necessary fields
        $query = SurveyResponse::where('survey_id', $this->survey->id)
            ->select([
                'id', 'survey_id', 'institution_id', 'department_id', 'respondent_id',
                'responses', 'status', 'submitted_at', 'approved_at', 'created_at'
            ])
            ->with([
                'institution:id,name,type,short_name',
                'department:id,name',
                'respondent:id,name,email',
                'approvalRequest' => function($query) {
                    $query->select('id', 'approvalable_id', 'current_status', 'submitted_at', 'completed_at');
                },
                'approvalRequest.approvalActions' => function($query) {
                    $query->select('id', 'approval_request_id', 'approver_id', 'action', 'comments', 'action_taken_at')
                          ->latest('action_taken_at')
                          ->limit(1); // Only get latest action per response
                },
                'approvalRequest.approvalActions.approver:id,name'
            ]);

        // Apply user access control
        $this->applyUserAccessControl($query);

        // Apply filters from request
        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (!empty($this->filters['approval_status'])) {
            $query->whereHas('approvalRequest', function ($q) {
                $q->where('current_status', $this->filters['approval_status']);
            });
        }

        if (!empty($this->filters['institution_id'])) {
            $query->where('institution_id', $this->filters['institution_id']);
        }

        if (!empty($this->filters['institution_type'])) {
            $query->whereHas('institution', function ($q) {
                $q->where('type', $this->filters['institution_type']);
            });
        }

        if (!empty($this->filters['date_from'])) {
            $query->where('created_at', '>=', $this->filters['date_from']);
        }

        if (!empty($this->filters['date_to'])) {
            $query->where('created_at', '<=', $this->filters['date_to'] . ' 23:59:59');
        }

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->whereHas('institution', function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%");
            });
        }

        // Filter by specific response IDs if provided (for bulk exports)
        if (!empty($this->filters['response_ids']) && is_array($this->filters['response_ids'])) {
            $responseIds = array_map('intval', $this->filters['response_ids']);
            $query->whereIn('id', $responseIds);
        }

        // Use chunk for large datasets to prevent memory issues
        $results = collect();
        $chunkSize = 100; // Process in chunks of 100 for memory efficiency

        $query->orderBy('created_at', 'desc')->chunk($chunkSize, function ($responses) use ($results) {
            foreach ($responses as $response) {
                $results->push($response);
            }
        });

        // Production: Only log essential export statistics
        \Log::info('[EXPORT] Survey export completed', [
            'survey_id' => $this->survey->id,
            'total_responses' => $results->count(),
            'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2)
        ]);

        return $results;
    }

    public function map($response): array
    {
        // Production: Minimal logging for mapping process
        if (app()->environment('local', 'development')) {
            \Log::debug('[EXPORT] Mapping response', [
                'response_id' => $response->id,
                'institution_name' => $response->institution?->name
            ]);
        }

        // Start with institution info - the institution that responded to the survey
        $institutionName = $response->institution?->name ?? 'N/A';
        $row = [$institutionName];

        // Get survey questions and add response for each question
        $questions = $this->survey->questions;
        $responses = $response->responses ?? [];

        \Log::info('📊 [EXPORT] Processing questions for response', [
            'response_id' => $response->id,
            'questions_count' => $questions->count(),
            'question_ids' => $questions->pluck('id')->toArray(),
            'responses_keys' => is_array($responses) ? array_keys($responses) : 'not_array',
            'responses_values' => is_array($responses) ? array_values($responses) : 'not_array'
        ]);

        foreach ($questions as $question) {
            $questionId = (string) $question->id;
            $answer = $responses[$questionId] ?? '';

            // Format the answer based on question type
            if (is_array($answer)) {
                // For multiple choice questions, join selected options
                $answer = implode(', ', $answer);
            } elseif (is_string($answer)) {
                $answer = trim($answer);
            }

            $row[] = $answer;
        }

        // Add metadata columns at the end
        $latestApprovalAction = $response->approvalRequest?->approvalActions?->sortByDesc('action_taken_at')?->first();

        $row = array_merge($row, [
            $this->getStatusText($response->status),
            $response->submitted_at ? \Carbon\Carbon::parse($response->submitted_at)->format('d.m.Y H:i') : '',
            $response->approved_at ? \Carbon\Carbon::parse($response->approved_at)->format('d.m.Y H:i') : '',
            $latestApprovalAction?->approver?->name ?? '',
            $latestApprovalAction?->comments ?? '',
        ]);

        // Production: Removed verbose row logging for performance

        return $row;
    }

    public function headings(): array
    {
        // Start with institution column
        $headings = ['Müəssisə'];

        // Add column for each survey question
        $questions = $this->survey->questions;
        foreach ($questions as $question) {
            // Use question title/text as column header, truncate if too long
            $questionText = $question->title ?? $question->text ?? $question->question ?? ('Sual ' . ($question->order_index ?? $question->id));
            $questionText = strip_tags($questionText);
            if (strlen($questionText) > 50) {
                $questionText = substr($questionText, 0, 50) . '...';
            }
            $headings[] = $questionText;
        }

        // Add metadata columns at the end
        $headings = array_merge($headings, [
            'Status',
            'Təqdim Tarixi',
            'Təsdiq Tarixi',
            'Təsdiq Edən',
            'Qeydlər'
        ]);

        return $headings;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 11],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF2563EB']
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true]
            ],
        ];
    }

    public function columnWidths(): array
    {
        $widths = [];
        $columns = range('A', 'Z');

        // First column - Institution name
        $widths['A'] = 30;

        // Dynamic columns for questions
        $questions = $this->survey->questions;
        $columnIndex = 1; // Start from B (A=0, B=1)

        foreach ($questions as $question) {
            if ($columnIndex < count($columns)) {
                // Set width based on question type
                $width = match($question->type ?? 'text') {
                    'textarea' => 40,
                    'multiple_choice' => 25,
                    'single_choice' => 20,
                    'number' => 15,
                    'email' => 25,
                    'date' => 15,
                    default => 20
                };
                $widths[$columns[$columnIndex]] = $width;
                $columnIndex++;
            }
        }

        // Metadata columns at the end
        $metadataColumns = ['Status', 'Təqdim Tarixi', 'Təsdiq Tarixi', 'Təsdiq Edən', 'Qeydlər'];
        $metadataWidths = [15, 16, 16, 20, 35];

        for ($i = 0; $i < count($metadataColumns); $i++) {
            if ($columnIndex + $i < count($columns)) {
                $widths[$columns[$columnIndex + $i]] = $metadataWidths[$i];
            }
        }

        return $widths;
    }

    private function applyUserAccessControl($query): void
    {
        // Get role name properly - might be object or string
        $userRoleName = is_object($this->user->role) ? $this->user->role->name : $this->user->role;

        \Log::info('🔐 [EXPORT] Applying user access control', [
            'user_id' => $this->user->id,
            'user_role_object' => $this->user->role,
            'user_role_name' => $userRoleName,
            'user_role_type' => gettype($this->user->role),
            'user_institution_id' => $this->user->institution_id,
            'user_institution_name' => $this->user->institution?->name,
            'has_specific_response_ids' => !empty($this->filters['response_ids']),
            'response_ids_count' => !empty($this->filters['response_ids']) ? count($this->filters['response_ids']) : 0
        ]);

        // Special case: If specific response IDs are provided for export and user has appropriate permissions,
        // allow export of those specific responses (this is for bulk export functionality)
        if (!empty($this->filters['response_ids']) && in_array($userRoleName, ['superadmin', 'regionadmin', 'sektoradmin'])) {
            \Log::info('📋 [EXPORT] Allowing export of specific response IDs for authorized user', [
                'user_role_name' => $userRoleName,
                'response_ids' => $this->filters['response_ids']
            ]);
            // Don't apply additional institution restrictions when specific response IDs are provided
            return;
        }

        switch ($userRoleName) {
            case 'superadmin':
                // SuperAdmin can see all responses
                break;

            case 'regionadmin':
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    \Log::info('🌐 [EXPORT] RegionAdmin access control', [
                        'allowed_institution_ids' => $childInstitutionIds
                    ]);
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'sektoradmin':
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    \Log::info('🏢 [EXPORT] SektorAdmin access control', [
                        'allowed_institution_ids' => $childInstitutionIds
                    ]);
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'schooladmin':
                if ($this->user->institution) {
                    \Log::info('🏫 [EXPORT] SchoolAdmin access control', [
                        'allowed_institution_id' => $this->user->institution->id
                    ]);
                    $query->where('institution_id', $this->user->institution->id);
                }
                break;

            default:
                // For other roles, restrict to their own institution
                \Log::info('👤 [EXPORT] Default role access control', [
                    'role_name' => $userRoleName,
                    'has_institution' => !!$this->user->institution,
                    'allowed_institution_id' => $this->user->institution?->id
                ]);
                if ($this->user->institution) {
                    $query->where('institution_id', $this->user->institution->id);
                }
        }
    }

    private function getStatusText(string $status): string
    {
        return match($status) {
            'draft' => 'Layihə',
            'submitted' => 'Təqdim edilib',
            'approved' => 'Təsdiqlənib',
            'rejected' => 'Rədd edilib',
            default => ucfirst($status)
        };
    }

    private function getApprovalStatusText(?string $status): string
    {
        if (!$status) return '';

        return match($status) {
            'pending' => 'Gözləyir',
            'in_progress' => 'İcrada',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Geri qaytarıldı',
            default => ucfirst($status)
        };
    }
}