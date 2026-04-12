<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProjectExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $project;

    public function __construct(Project $project)
    {
        $this->project = $project;
    }

    public function collection()
    {
        $activities = $this->project->activities()
            ->with(['employee', 'assignedEmployees', 'subActivities.assignedEmployees'])
            ->whereNull('parent_id')
            ->get();
            
        $flattened = collect();
        foreach ($activities as $activity) {
            $flattened->push($activity);
            foreach ($activity->subActivities as $sub) {
                // Pre-process for mapping
                $sub->is_sub = true;
                $flattened->push($sub);
            }
        }
        return $flattened;
    }

    public function headings(): array
    {
        return [
            'ID',
            'Fəaliyyət Adı',
            'Təsvir',
            'Məsul Şəxslər',
            'Başlama Tarixi',
            'Bitmə Tarixi',
            'Büdcə',
            'Status',
            'Prioritet',
            'Platforma',
            'Mexanizm',
            'Hədəf İcrası (%)',
            'KPI/Metriklər',
            'Risklər'
        ];
    }

    public function map($activity): array
    {
        $employees = $activity->assignedEmployees->pluck('name')->implode(', ');
        $name = isset($activity->is_sub) ? "   ↳ " . $activity->name : $activity->name;
        
        return [
            $activity->id,
            $name,
            $activity->description,
            $employees ?: ($activity->employee ? $activity->employee->name : '-'),
            $activity->start_date ? $activity->start_date->format('d.m.Y') : '-',
            $activity->end_date ? $activity->end_date->format('d.m.Y') : '-',
            $activity->budget,
            strtoupper($activity->status),
            strtoupper($activity->priority),
            $activity->location_platform,
            $activity->monitoring_mechanism,
            $activity->goal_contribution_percentage . '%',
            $activity->kpi_metrics,
            $activity->risks
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '1e3a8a']]],
        ];
    }
}
