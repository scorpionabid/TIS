<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ProjectExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithColumnWidths
{
    protected $project;

    public function __construct(Project $project)
    {
        $this->project = $project;
    }

    public function collection()
    {
        $activities = $this->project->activities()
            ->with(['assignedEmployees', 'subActivities.assignedEmployees'])
            ->whereNull('parent_id')
            ->orderBy('order', 'asc')
            ->get();

        $flattened = collect();
        foreach ($activities as $activity) {
            $flattened->push($activity);
            foreach ($activity->subActivities->sortBy('order') as $sub) {
                $sub->is_sub = true;
                $flattened->push($sub);
            }
        }
        return $flattened;
    }

    public function headings(): array
    {
        return [
            '#',
            'Fəaliyyət Adı',
            'Təsvir',
            'Məsul Şəxslər',
            'Başlama Tarixi',
            'Bitmə Tarixi',
            'Status',
            'Prioritet',
            'Büdcə (₼)',
            'Gözlənilən Nəticə',
            'KPI / Metriklər',
            'Risklər',
            'Qeydlər',
            'Yer / Platforma',
            'Mexanizm',
            'İcra faizi (%)',
        ];
    }

    public function map($activity): array
    {
        $employees = $activity->assignedEmployees->pluck('name')->implode(', ');
        $prefix    = isset($activity->is_sub) ? '    ↳ ' : '';

        return [
            $activity->id,
            $prefix . $this->toPlainText($activity->name),
            $this->toPlainText($activity->description),
            $employees ?: '-',
            $activity->start_date ? $activity->start_date->format('d.m.Y') : '-',
            $activity->end_date   ? $activity->end_date->format('d.m.Y')   : '-',
            $this->translateStatus($activity->status),
            $this->translatePriority($activity->priority),
            $activity->budget ? number_format((float)$activity->budget, 2, '.', '') : '-',
            $this->toPlainText($activity->expected_outcome),
            $this->toPlainText($activity->kpi_metrics),
            $this->toPlainText($activity->risks),
            $this->toPlainText($activity->notes),
            $this->toPlainText($activity->location_platform),
            $this->toPlainText($activity->monitoring_mechanism),
            $activity->goal_contribution_percentage !== null
                ? $activity->goal_contribution_percentage . '%'
                : '-',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 8,   // ID
            'B' => 50,  // Ad
            'C' => 50,  // Təsvir
            'D' => 25,  // Məsul
            'E' => 14,  // Başlama
            'F' => 14,  // Bitmə
            'G' => 14,  // Status
            'H' => 12,  // Prioritet
            'I' => 12,  // Büdcə
            'J' => 50,  // Gözlənilən nəticə
            'K' => 40,  // KPI
            'L' => 40,  // Risklər
            'M' => 40,  // Qeydlər
            'N' => 30,  // Yer
            'O' => 35,  // Mexanizm
            'P' => 14,  // İcra faizi
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = $sheet->getHighestRow();

        // Header row styling
        $sheet->getStyle('A1:P1')->applyFromArray([
            'font' => [
                'bold'  => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size'  => 11,
            ],
            'fill' => [
                'fillType'   => 'solid',
                'startColor' => ['rgb' => '1e3a8a'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true,
            ],
        ]);

        // Data rows: wrap text + vertical top alignment
        if ($lastRow > 1) {
            $sheet->getStyle("A2:P{$lastRow}")->applyFromArray([
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_TOP,
                    'wrapText' => true,
                ],
            ]);

            // Zebra striping (every other row light blue)
            for ($row = 2; $row <= $lastRow; $row++) {
                if ($row % 2 === 0) {
                    $sheet->getStyle("A{$row}:P{$row}")->getFill()
                        ->setFillType('solid')
                        ->getStartColor()->setRGB('EFF6FF');
                }
            }
        }

        // Header row height
        $sheet->getRowDimension(1)->setRowHeight(30);

        return [];
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function toPlainText(?string $html): string
    {
        if (!$html || trim($html) === '') return '-';

        // HTML etiketlərini sil
        $text = strip_tags($html);

        // HTML entity-lərini çevir
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Çox sayda boş sətirləri tək sətirə endir
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        $text = trim($text);
        return $text !== '' ? $text : '-';
    }

    private function translateStatus(?string $status): string
    {
        return match ($status) {
            'pending'     => 'Gözləyir',
            'in_progress' => 'İcrada',
            'checking'    => 'Yoxlamada',
            'completed'   => 'Tamamlandı',
            'stuck'       => 'Problem',
            default       => $status ?? '-',
        };
    }

    private function translatePriority(?string $priority): string
    {
        return match ($priority) {
            'low'      => 'Aşağı',
            'medium'   => 'Orta',
            'high'     => 'Yüksək',
            'critical' => 'Kritik',
            default    => $priority ?? '-',
        };
    }
}
