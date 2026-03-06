<?php

namespace App\Exports;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InstitutionExport implements FromQuery, WithColumnWidths, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    public function query(): Builder
    {
        $query = Institution::with(['institutionType', 'parent'])
            ->select([
                'id', 'name', 'short_name', 'type', 'level', 'parent_id',
                'region_code', 'institution_code', 'contact_info', 'location',
                'metadata', 'utis_code', 'is_active', 'established_date', 'created_at',
            ]);

        // Apply filters
        if (! empty($this->filters['type'])) {
            $query->where('type', $this->filters['type']);
        }

        if (! empty($this->filters['level'])) {
            $query->where('level', $this->filters['level']);
        }

        if (! empty($this->filters['parent_id'])) {
            $query->where('parent_id', $this->filters['parent_id']);
        }

        if (! empty($this->filters['region_code'])) {
            $query->where('region_code', $this->filters['region_code']);
        }

        if (! empty($this->filters['is_active'])) {
            $query->where('is_active', $this->filters['is_active'] === 'true');
        }

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('institution_code', 'ilike', "%{$search}%")
                    ->orWhere('utis_code', 'ilike', "%{$search}%");
            });
        }

        return $query->orderBy('level')->orderBy('name');
    }

    public function map($institution): array
    {
        // Parse JSON fields
        $contactInfo = json_decode($institution->contact_info ?? '{}', true);
        $location = json_decode($institution->location ?? '{}', true);
        $metadata = json_decode($institution->metadata ?? '{}', true);

        // Get parent name
        $parentName = $institution->parent ? $institution->parent->name : '';

        return [
            $institution->name,
            $institution->short_name ?? '',
            $institution->type,
            $parentName,
            $institution->region_code ?? '',
            $institution->institution_code ?? '',
            $contactInfo['phone'] ?? '',
            $contactInfo['email'] ?? '',
            $location['region'] ?? '',
            $location['address'] ?? '',
            $metadata['student_capacity'] ?? '',
            $metadata['staff_count'] ?? '',
            $metadata['founded_year'] ?? '',
            $institution->established_date ?? '',
            $institution->utis_code ?? '',
            $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv',
            $institution->created_at->format('Y-m-d'),
        ];
    }

    public function headings(): array
    {
        return [
            'Ad',
            'Qısa Ad',
            'Növ',
            'Ana Təşkilat',
            'Region Kodu',
            'Müəssisə Kodu',
            'Telefon',
            'Email',
            'Region',
            'Ünvan',
            'Şagird Tutumu',
            'Heyət Sayı',
            'Yaranma İli',
            'Təsis Tarixi',
            'UTIS Kodu',
            'Status',
            'Yaradılma Tarixi',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF4472C4'],
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 35, // Ad
            'B' => 20, // Qısa Ad
            'C' => 22, // Növ
            'D' => 30, // Ana Təşkilat
            'E' => 12, // Region Kodu
            'F' => 18, // Müəssisə Kodu
            'G' => 15, // Telefon
            'H' => 25, // Email
            'I' => 15, // Region
            'J' => 40, // Ünvan
            'K' => 15, // Şagird Tutumu
            'L' => 12, // Heyət Sayı
            'M' => 12, // Yaranma İli
            'N' => 15, // Təsis Tarixi
            'O' => 12, // UTIS Kodu
            'P' => 12, // Status
            'Q' => 15, // Yaradılma Tarixi
        ];
    }
}
