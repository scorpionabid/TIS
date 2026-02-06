<?php

namespace App\Exports;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SurveyApprovalExport implements FromCollection, WithColumnWidths, WithHeadings, WithMapping, WithStyles
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
        $this->survey->load(['questions' => function ($query) {
            $query->orderBy('order_index')->select('id', 'survey_id', 'title', 'description', 'type', 'order_index');
        }]);

        \Log::info('📋 [EXPORT COLLECTION] Starting data collection', [
            'survey_id' => $this->survey->id,
            'user_id' => $this->user->id,
            'user_role' => $this->user->getRoleNames()->first(),
            'filters' => $this->filters,
            'questions_count' => $this->survey->questions->count(),
        ]);

        // Optimize query for large datasets - select only necessary fields
        $query = SurveyResponse::where('survey_id', $this->survey->id)
            ->select([
                'id', 'survey_id', 'institution_id', 'department_id', 'respondent_id',
                'responses', 'status', 'submitted_at', 'approved_at', 'created_at',
            ])
            ->with([
                'institution:id,name,type,short_name,parent_id,level',
                'institution.parent:id,name,type,short_name', // Load sector (parent institution)
                'department:id,name',
                'respondent:id,first_name,last_name,email',
                'approvalRequest' => function ($query) {
                    $query->select('id', 'approvalable_id', 'current_status', 'submitted_at', 'completed_at');
                },
                'approvalRequest.approvalActions' => function ($query) {
                    $query->select('id', 'approval_request_id', 'approver_id', 'action', 'comments', 'action_taken_at')
                        ->latest('action_taken_at')
                        ->limit(1); // Only get latest action per response
                },
                'approvalRequest.approvalActions.approver:id,first_name,last_name',
            ]);

        // Apply user access control
        $this->applyUserAccessControl($query);

        // Apply filters from request
        if (! empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (! empty($this->filters['approval_status'])) {
            $query->whereHas('approvalRequest', function ($q) {
                $q->where('current_status', $this->filters['approval_status']);
            });
        }

        if (! empty($this->filters['institution_id'])) {
            $query->where('institution_id', $this->filters['institution_id']);
        }

        if (! empty($this->filters['institution_type'])) {
            $query->whereHas('institution', function ($q) {
                $q->where('type', $this->filters['institution_type']);
            });
        }

        if (! empty($this->filters['date_from'])) {
            $query->where('created_at', '>=', $this->filters['date_from']);
        }

        if (! empty($this->filters['date_to'])) {
            $query->where('created_at', '<=', $this->filters['date_to'] . ' 23:59:59');
        }

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->whereHas('institution', function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%");
            });
        }

        // Filter by specific response IDs if provided (for bulk exports)
        if (! empty($this->filters['response_ids']) && is_array($this->filters['response_ids'])) {
            $responseIds = array_map('intval', $this->filters['response_ids']);
            $query->whereIn('id', $responseIds);
        }

        // Use chunk for large datasets to prevent memory issues
        $results = collect();
        $chunkSize = 100; // Process in chunks of 100 for memory efficiency

        // Sort by sector (via parent institution), then by institution name, then by submission date
        // Note: We need to join institutions table for proper sorting
        $query->leftJoin('institutions', 'survey_responses.institution_id', '=', 'institutions.id')
            ->leftJoin('institutions as sectors', 'institutions.parent_id', '=', 'sectors.id')
            ->orderBy('sectors.name', 'asc')        // Group by sector
            ->orderBy('institutions.name', 'asc')   // Then by school name
            ->orderBy('survey_responses.created_at', 'desc')  // Finally by submission date
            ->select('survey_responses.*'); // Ensure we only select survey_responses columns

        $query->chunk($chunkSize, function ($responses) use ($results) {
            foreach ($responses as $response) {
                $results->push($response);
            }
        });

        // Production: Only log essential export statistics
        \Log::info('[EXPORT] Survey export completed', [
            'survey_id' => $this->survey->id,
            'total_responses' => $results->count(),
            'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
        ]);

        return $results;
    }

    public function map($response): array
    {
        // Production: Minimal logging for mapping process
        if (app()->environment('local', 'development')) {
            \Log::debug('[EXPORT] Mapping response', [
                'response_id' => $response->id,
                'institution_name' => $response->institution?->name,
                'institution_level' => $response->institution?->level,
                'sector_name' => $this->getSectorName($response->institution),
            ]);
        }

        // Get sector and institution names
        $sectorName = $this->getSectorName($response->institution);
        $institutionName = $response->institution?->name ?? 'N/A';

        // Start with sector, then institution
        $row = [
            $sectorName,        // NEW - Sector column
            $institutionName,    // Institution column
        ];

        // Get survey questions and add response for each question
        $questions = $this->survey->questions;
        $responses = $response->responses ?? [];

        \Log::info('📊 [EXPORT] Processing questions for response', [
            'response_id' => $response->id,
            'questions_count' => $questions->count(),
            'question_ids' => $questions->pluck('id')->toArray(),
            'responses_keys' => is_array($responses) ? array_keys($responses) : 'not_array',
            'responses_values' => is_array($responses) ? array_values($responses) : 'not_array',
        ]);

        foreach ($questions as $question) {
            $questionId = (string) $question->id;
            $answer = $responses[$questionId] ?? '';

            // Format the answer based on question type
            if (is_array($answer)) {
                // Check if it's a table_input response (array of row objects)
                if ($question->type === 'table_input' || (isset($answer[0]) && is_array($answer[0]))) {
                    // Format table_input as readable text
                    $formattedRows = [];
                    foreach ($answer as $rowIndex => $row) {
                        if (is_array($row)) {
                            $rowValues = array_filter(array_values($row), fn($v) => $v !== null && $v !== '');
                            if (!empty($rowValues)) {
                                $formattedRows[] = 'Sətir ' . ($rowIndex + 1) . ': ' . implode(' | ', $rowValues);
                            }
                        }
                    }
                    $answer = !empty($formattedRows) ? implode("\n", $formattedRows) : '';
                } else {
                    // For multiple choice questions, join selected options
                    $answer = implode(', ', array_map('strval', $answer));
                }
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
        // Start with sector and institution columns
        $headings = [
            'Sektor',      // NEW - Sector column
            'Müəssisə',     // Institution column
        ];

        // Add column for each survey question
        $questions = $this->survey->questions;
        foreach ($questions as $question) {
            // Use question title/description as column header, truncate if too long
            $questionText = $question->title ?? $question->description ?? ('Sual ' . ($question->order_index ?? $question->id));
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
            'Qeydlər',
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
                    'startColor' => ['argb' => 'FF2563EB'],
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true],
            ],
        ];
    }

    public function columnWidths(): array
    {
        $widths = [];
        $columns = range('A', 'Z');

        // Column A - Sector name (NEW)
        $widths['A'] = 30;

        // Column B - Institution name (moved from A)
        $widths['B'] = 30;

        // Dynamic columns for questions (start from C instead of B)
        $questions = $this->survey->questions;
        $columnIndex = 2; // Start from C (A=0, B=1, C=2)

        foreach ($questions as $question) {
            if ($columnIndex < count($columns)) {
                // Set width based on question type
                $width = match ($question->type ?? 'text') {
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
        // Get role name using Spatie's getRoleNames() method
        $userRoleName = $this->user->getRoleNames()->first();

        \Log::info('🔐 [EXPORT] Applying user access control', [
            'user_id' => $this->user->id,
            'user_role_name' => $userRoleName,
            'user_institution_id' => $this->user->institution_id,
            'user_institution_name' => $this->user->institution?->name,
            'has_specific_response_ids' => ! empty($this->filters['response_ids']),
            'response_ids_count' => ! empty($this->filters['response_ids']) ? count($this->filters['response_ids']) : 0,
        ]);

        // Special case: If specific response IDs are provided for export and user has appropriate permissions,
        // allow export of those specific responses (this is for bulk export functionality)
        if (! empty($this->filters['response_ids']) && in_array($userRoleName, ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'])) {
            \Log::info('📋 [EXPORT] Allowing export of specific response IDs for authorized user', [
                'user_role_name' => $userRoleName,
                'response_ids' => $this->filters['response_ids'],
            ]);

            // Don't apply additional institution restrictions when specific response IDs are provided
            return;
        }

        switch ($userRoleName) {
            case 'superadmin':
                // SuperAdmin can see all responses
                break;

            case 'regionadmin':
            case 'regionoperator':
                // RegionAdmin and RegionOperator have same access to their region's data
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    \Log::info('🌐 [EXPORT] RegionAdmin/RegionOperator access control', [
                        'user_role' => $userRoleName,
                        'allowed_institution_ids_count' => count($childInstitutionIds),
                        'allowed_institution_ids' => $childInstitutionIds,
                    ]);
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'sektoradmin':
                if ($this->user->institution) {
                    $childInstitutionIds = $this->user->institution->getAllChildrenIds();
                    \Log::info('🏢 [EXPORT] SektorAdmin access control', [
                        'allowed_institution_ids' => $childInstitutionIds,
                    ]);
                    $query->whereIn('institution_id', $childInstitutionIds);
                }
                break;

            case 'schooladmin':
                if ($this->user->institution) {
                    \Log::info('🏫 [EXPORT] SchoolAdmin access control', [
                        'allowed_institution_id' => $this->user->institution->id,
                    ]);
                    $query->where('institution_id', $this->user->institution->id);
                }
                break;

            default:
                // For other roles, restrict to their own institution
                \Log::info('👤 [EXPORT] Default role access control', [
                    'role_name' => $userRoleName,
                    'has_institution' => (bool) $this->user->institution,
                    'allowed_institution_id' => $this->user->institution?->id,
                ]);
                if ($this->user->institution) {
                    $query->where('institution_id', $this->user->institution->id);
                }
        }
    }

    private function getStatusText(string $status): string
    {
        return match ($status) {
            'draft' => 'Layihə',
            'submitted' => 'Təqdim edilib',
            'approved' => 'Təsdiqlənib',
            'rejected' => 'Rədd edilib',
            default => ucfirst($status)
        };
    }

    private function getApprovalStatusText(?string $status): string
    {
        if (! $status) {
            return '';
        }

        return match ($status) {
            'pending' => 'Gözləyir',
            'in_progress' => 'İcrada',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Geri qaytarıldı',
            default => ucfirst($status)
        };
    }

    /**
     * Get sector name for an institution
     * Handles hierarchical institution structure:
     * - Level 4 (schools): Returns parent institution name (sector)
     * - Level 3 (sectors): Returns own name
     * - Other levels: Returns N/A
     */
    private function getSectorName($institution): string
    {
        if (! $institution) {
            return 'N/A';
        }

        // If institution is a school (level 4), parent is sector (level 3)
        if ($institution->level == 4) {
            return $institution->parent?->name ?? 'N/A';
        }

        // If institution is a sector (level 3), return its own name
        if ($institution->level == 3) {
            return $institution->name;
        }

        // For other levels (region, ministry), return N/A
        return 'N/A';
    }
}
