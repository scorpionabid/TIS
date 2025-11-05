<?php

namespace App\Exports;

use App\Models\SchoolAssessment;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SchoolAssessmentExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $assessment;
    protected $resultFields;

    public function __construct(SchoolAssessment $assessment)
    {
        $this->assessment = $assessment;
        $this->assessment->load(['assessmentType.resultFields', 'stage', 'institution']);
        $this->resultFields = $this->assessment->assessmentType->resultFields ?? collect();
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return $this->assessment->classResults;
    }

    /**
     * Define the headings for the Excel file
     */
    public function headings(): array
    {
        $baseHeadings = [
            'Sinif',
            'Fənn',
            'Şagird Sayı',
            'İştirakçı Sayı',
        ];

        // Add result field headings
        $fieldHeadings = $this->resultFields->map(function ($field) {
            return $field->label;
        })->toArray();

        return array_merge($baseHeadings, $fieldHeadings, ['Daxil Edən', 'Tarix']);
    }

    /**
     * Map each row data
     */
    public function map($classResult): array
    {
        $baseData = [
            $classResult->class_label,
            $classResult->subject ?? '-',
            $classResult->student_count ?? 0,
            $classResult->participant_count ?? 0,
        ];

        // Add result field values
        $fieldValues = $this->resultFields->map(function ($field) use ($classResult) {
            return $classResult->metadata[$field->field_key] ?? '-';
        })->toArray();

        $recordedBy = $classResult->recorder?->name ?? '-';
        $recordedAt = $classResult->recorded_at
            ? \Carbon\Carbon::parse($classResult->recorded_at)->format('d.m.Y H:i')
            : '-';

        return array_merge($baseData, $fieldValues, [$recordedBy, $recordedAt]);
    }

    /**
     * Apply styles to the worksheet
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E2E8F0']
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }
}
