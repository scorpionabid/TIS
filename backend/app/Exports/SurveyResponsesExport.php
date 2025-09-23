<?php

namespace App\Exports;

use App\Models\SurveyResponse;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class SurveyResponsesExport implements FromCollection, WithHeadings, WithMapping, WithColumnWidths, WithStyles
{
    protected $surveyId;
    protected $filters;

    public function __construct($surveyId = null, array $filters = [])
    {
        $this->surveyId = $surveyId;
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = SurveyResponse::with([
            'survey',
            'institution',
            'respondent',
            'approvalRequest'
        ]);

        // Apply survey filter if provided
        if ($this->surveyId) {
            $query->where('survey_id', $this->surveyId);
        }

        // Apply additional filters
        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (!empty($this->filters['institution_id'])) {
            $query->where('institution_id', $this->filters['institution_id']);
        }

        if (!empty($this->filters['date_from'])) {
            $query->whereDate('submitted_at', '>=', $this->filters['date_from']);
        }

        if (!empty($this->filters['date_to'])) {
            $query->whereDate('submitted_at', '<=', $this->filters['date_to']);
        }

        if (!empty($this->filters['response_ids'])) {
            $query->whereIn('id', $this->filters['response_ids']);
        }

        return $query->orderBy('submitted_at', 'desc')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Sorğu',
            'Müəssisə',
            'Cavabverən',
            'Status',
            'Təsdiq Statusu',
            'İrəliləmə (%)',
            'Təqdim Tarixi',
            'Son Yeniləmə',
            'Cavablar Sayı'
        ];
    }

    public function map($response): array
    {
        return [
            $response->id,
            $response->survey ? $response->survey->title : 'N/A',
            $response->institution ? $response->institution->name : 'N/A',
            $response->respondent ? $response->respondent->name : 'N/A',
            $this->getStatusLabel($response->status),
            $this->getApprovalStatusLabel($response->approvalRequest?->current_status),
            $response->progress_percentage ?? 0,
            $response->submitted_at ? $response->submitted_at->format('d.m.Y H:i') : 'N/A',
            $response->updated_at ? $response->updated_at->format('d.m.Y H:i') : 'N/A',
            $response->responses ? (is_array($response->responses) ? count($response->responses) : count(json_decode($response->responses, true) ?? [])) : 0
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 10,  // ID
            'B' => 30,  // Sorğu
            'C' => 25,  // Müəssisə
            'D' => 20,  // Cavabverən
            'E' => 15,  // Status
            'F' => 15,  // Təsdiq Statusu
            'G' => 12,  // İrəliləmə
            'H' => 18,  // Təqdim Tarixi
            'I' => 18,  // Son Yeniləmə
            'J' => 12,  // Cavablar Sayı
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Header row styling
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => '366092']
                ]
            ],
            // Auto-fit columns
            'A:J' => [
                'alignment' => [
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }

    private function getStatusLabel($status): string
    {
        return match($status) {
            'draft' => 'Qaralama',
            'submitted' => 'Təqdim edildi',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Qaytarıldı',
            default => 'Naməlum'
        };
    }

    private function getApprovalStatusLabel($status): string
    {
        return match($status) {
            'pending' => 'Gözləyir',
            'in_progress' => 'Prosesdə',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Qaytarıldı',
            default => 'N/A'
        };
    }
}