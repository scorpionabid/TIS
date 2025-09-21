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
        $query = SurveyResponse::where('survey_id', $this->survey->id)
            ->with([
                'institution:id,name,type,short_name',
                'department:id,name',
                'respondent:id,name,email',
                'approvalRequest:id,approvalable_id,current_status,submitted_at,completed_at',
                'approvalRequest.approvalActions:id,approval_request_id,approver_id,action,comments,action_taken_at',
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

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function map($response): array
    {
        // Get latest approval action
        $latestApprovalAction = $response->approvalRequest?->approvalActions?->sortByDesc('action_taken_at')?->first();

        return [
            $response->institution?->name ?? '',
            $response->institution?->type ?? '',
            $response->institution?->short_name ?? '',
            $response->department?->name ?? '',
            $response->respondent?->name ?? '',
            $response->respondent?->email ?? '',
            $this->getStatusText($response->status),
            $this->getApprovalStatusText($response->approvalRequest?->current_status),
            $response->progress_percentage . '%',
            $response->submitted_at ? \Carbon\Carbon::parse($response->submitted_at)->format('d.m.Y H:i') : '',
            $response->approved_at ? \Carbon\Carbon::parse($response->approved_at)->format('d.m.Y H:i') : '',
            $latestApprovalAction?->approver?->name ?? '',
            $latestApprovalAction?->comments ?? '',
            $latestApprovalAction?->action_taken_at ? \Carbon\Carbon::parse($latestApprovalAction->action_taken_at)->format('d.m.Y H:i') : '',
            $response->created_at->format('d.m.Y H:i'),
            $response->updated_at->format('d.m.Y H:i'),
        ];
    }

    public function headings(): array
    {
        return [
            'Müəssisə',
            'Müəssisə Tipi',
            'Qısa Ad',
            'Şöbə',
            'Cavablayan',
            'Email',
            'Status',
            'Təsdiq Status',
            'Tamamlanma %',
            'Təqdim Tarixi',
            'Təsdiq Tarixi',
            'Təsdiq Edən',
            'Qeydlər',
            'Son Əməliyyat',
            'Yaradılma',
            'Yenilənmə'
        ];
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
        return [
            'A' => 30, // Müəssisə
            'B' => 20, // Müəssisə Tipi
            'C' => 15, // Qısa Ad
            'D' => 20, // Şöbə
            'E' => 25, // Cavablayan
            'F' => 30, // Email
            'G' => 12, // Status
            'H' => 15, // Təsdiq Status
            'I' => 12, // Tamamlanma %
            'J' => 16, // Təqdim Tarixi
            'K' => 16, // Təsdiq Tarixi
            'L' => 20, // Təsdiq Edən
            'M' => 35, // Qeydlər
            'N' => 16, // Son Əməliyyat
            'O' => 16, // Yaradılma
            'P' => 16, // Yenilənmə
        ];
    }

    private function applyUserAccessControl($query): void
    {
        $userRole = $this->user->role;

        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can see all responses
                break;

            case 'regionadmin':
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
                // For other roles, restrict to their own institution
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