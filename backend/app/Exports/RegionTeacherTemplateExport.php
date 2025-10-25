<?php

namespace App\Exports;

use App\Models\Institution;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * RegionAdmin Teacher Import Template Export
 * Generates Excel template with all required fields for teacher import
 */
class RegionTeacherTemplateExport implements WithMultipleSheets
{
    protected $region;

    public function __construct(Institution $region)
    {
        $this->region = $region;
    }

    /**
     * Return multiple sheets
     */
    public function sheets(): array
    {
        return [
            new RegionTeacherTemplateSheet($this->region),
            new InstitutionReferenceSheet($this->region),
            new FieldReferenceSheet(),
        ];
    }
}

/**
 * Main template sheet with sample data
 */
class RegionTeacherTemplateSheet implements FromArray, WithHeadings, WithStyles, WithColumnWidths
{
    protected $region;

    public function __construct(Institution $region)
    {
        $this->region = $region;
    }

    public function array(): array
    {
        // Get first institution as example
        $institutionIds = $this->region->getAllChildrenIds();
        $firstInstitution = Institution::whereIn('id', $institutionIds)
            ->where('level', '>=', 3) // Sectors and schools
            ->orderBy('level')
            ->orderBy('name')
            ->first();

        $institutionId = $firstInstitution ? $firstInstitution->id : '';
        $utisCode = $firstInstitution?->utis_code ?? '';
        $instCode = $firstInstitution?->institution_code ?? '';

        return [
            [
                $utisCode, // NEW: institution_utis_code
                $instCode, // NEW: institution_code
                $institutionId, // Keep for backward compatibility
                'ali.mammadov@example.com',
                'ali.mammadov',
                'Əli',
                'Məmmədov',
                'Rəşid',
                'müəllim',
                'secondary',
                'Riyaziyyat',
                'miq_100',
                '85.50',
                'teacher123',
                '+994501234567', // Optional: contact_phone
                '', // Optional: contract_start_date
                '', // Optional: contract_end_date
                '', // Optional: education_level
                '', // Optional: graduation_university
                '', // Optional: graduation_year
                '', // Optional: notes
            ],
            [
                '', // Different institution example (empty codes)
                $instCode,
                $institutionId,
                'leyla.hasanova@example.com',
                'leyla.hasanova',
                'Leyla',
                'Həsənova',
                'Vaqif',
                'direktor_muavini_tedris',
                'primary',
                'Pedaqogika',
                'sertifikasiya',
                '92.00',
                'teacher456',
                '+994555555555',
                '',
                '',
                '',
                '',
                '',
                '',
            ],
        ];
    }

    public function headings(): array
    {
        return [
            // YENİ: INSTITUTION LOOKUP SAHƏLƏR (ən azı biri tələb olunur)
            'institution_utis_code',
            'institution_code',
            'institution_id',

            // MƏCBURI SAHƏLƏR
            'email *',
            'username *',
            'first_name *',
            'last_name *',
            'patronymic *',
            'position_type *',
            'workplace_type *',
            'specialty *',
            'assessment_type *',
            'assessment_score *',
            'password *',

            // KÖNÜLLÜ SAHƏLƏR
            'contact_phone',
            'contract_start_date',
            'contract_end_date',
            'education_level',
            'graduation_university',
            'graduation_year',
            'notes',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Institution lookup fields (blue background)
        $sheet->getStyle('A1:C1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF2196F3']], // Blue background for lookup fields
        ]);

        // Required fields (green background)
        $sheet->getStyle('D1:N1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF4CAF50']], // Green background for required
        ]);

        // Optional fields (gray background)
        $sheet->getStyle('O1:U1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF000000']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFE0E0E0']], // Gray background for optional
        ]);

        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18, // institution_utis_code
            'B' => 18, // institution_code
            'C' => 15, // institution_id
            'D' => 30, // email
            'E' => 20, // username
            'F' => 15, // first_name
            'G' => 15, // last_name
            'H' => 15, // patronymic
            'I' => 25, // position_type
            'J' => 20, // workplace_type
            'K' => 25, // specialty
            'L' => 20, // assessment_type
            'M' => 20, // assessment_score
            'N' => 15, // password
            'O' => 18, // contact_phone
            'P' => 20, // contract_start_date
            'Q' => 20, // contract_end_date
            'R' => 20, // education_level
            'S' => 30, // graduation_university
            'T' => 18, // graduation_year
            'U' => 40, // notes
        ];
    }
}

/**
 * Institution reference sheet
 */
class InstitutionReferenceSheet implements FromArray, WithHeadings, WithStyles
{
    protected $region;

    public function __construct(Institution $region)
    {
        $this->region = $region;
    }

    public function array(): array
    {
        $institutionIds = $this->region->getAllChildrenIds();
        $institutions = Institution::whereIn('id', $institutionIds)
            ->where('level', '>=', 3) // Sectors and schools
            ->orderBy('level')
            ->orderBy('name')
            ->get(['id', 'utis_code', 'institution_code', 'name', 'level']);

        $data = [];
        foreach ($institutions as $inst) {
            $level = $inst->level == 3 ? 'Sektor' : 'Məktəb';
            $data[] = [
                $inst->id,
                $inst->utis_code ?? '',
                $inst->institution_code ?? '',
                $inst->name,
                $level
            ];
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'ID',
            'UTİS Kod',
            'Institution Kod',
            'Müəssisə Adı',
            'Səviyyə',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF2196F3']],
            ],
        ];
    }
}

/**
 * Field reference/documentation sheet
 */
class FieldReferenceSheet implements FromArray, WithHeadings, WithStyles, WithColumnWidths
{
    public function array(): array
    {
        return [
            // Institution lookup fields (at least one required)
            ['== MÜƏSSİSƏ AXTARIŞI (ən azı biri tələb olunur) =='],
            ['institution_utis_code', 'AXTARIŞ', 'UTİS kodu (məktəblər üçün)', '118863433'],
            ['institution_code', 'AXTARIŞ', 'Institution kodu (bütün müəssisələr)', 'SHZRT-001'],
            ['institution_id', 'AXTARIŞ', 'Müəssisə ID (köhnə üsul)', '123'],
            [],
            ['⚠️ QEYDİN: institution_utis_code, institution_code və ya institution_id-dən ən azı BİRİ doldurulmalıdır!'],
            ['✓ Prioritet: UTİS kod → Institution kod → ID'],
            ['✓ 2-ci vərəqdə (Institutions) müəssisə siyahısı və kodları var'],
            [],

            // Required fields
            ['== MƏCBURI SAHƏLƏR =='],
            ['email', 'MƏCBURI', 'Email ünvanı (unikal)', 'ali.mammadov@example.com'],
            ['username', 'MƏCBURI', 'İstifadəçi adı (unikal)', 'ali.mammadov'],
            ['first_name', 'MƏCBURI', 'Ad', 'Əli'],
            ['last_name', 'MƏCBURI', 'Soyad', 'Məmmədov'],
            ['patronymic', 'MƏCBURI', 'Ata adı', 'Rəşid'],
            ['position_type', 'MƏCBURI', 'Vəzifə növü (aşağıdakı siyahıdan)', 'müəllim'],
            ['workplace_type', 'MƏCBURI', 'İş yeri növü (primary və ya secondary)', 'secondary'],
            ['specialty', 'MƏCBURI', 'İxtisas', 'Riyaziyyat'],
            ['assessment_type', 'MƏCBURI', 'Qiymətləndirmə növü (aşağıdakı siyahıdan)', 'miq_100'],
            ['assessment_score', 'MƏCBURI', 'Qiymətləndirmə balı (0-100)', '85.50'],
            ['password', 'MƏCBURI', 'Şifrə (minimum 8 simvol)', 'teacher123'],
            [],

            // Optional fields
            ['== KÖNÜLLÜ SAHƏLƏR =='],
            ['contact_phone', 'KÖNÜLLÜ', 'Əlaqə telefonu', '+994501234567'],
            ['contract_start_date', 'KÖNÜLLÜ', 'Müqavilə başlanğıc tarixi (YYYY-MM-DD)', '2024-09-01'],
            ['contract_end_date', 'KÖNÜLLÜ', 'Müqavilə bitmə tarixi (YYYY-MM-DD)', '2025-06-30'],
            ['education_level', 'KÖNÜLLÜ', 'Təhsil səviyyəsi', 'bachelor'],
            ['graduation_university', 'KÖNÜLLÜ', 'Məzun olduğu universitet', 'BDU'],
            ['graduation_year', 'KÖNÜLLÜ', 'Məzuniyyət ili', '2010'],
            ['notes', 'KÖNÜLLÜ', 'Qeydlər', 'Əlavə məlumat'],

            [], // Empty row
            ['VƏZİFƏ NÖVLƏRİ (position_type):'],
            ['müəllim', '', 'Müəllim'],
            ['direktor', '', 'Direktor'],
            ['direktor_muavini_tedris', '', 'Direktor müavini (tədris)'],
            ['direktor_muavini_inzibati', '', 'Direktor müavini (inzibati)'],
            ['metodist', '', 'Metodist'],
            ['psixoloq', '', 'Psixoloq'],
            ['kitabxanaçı', '', 'Kitabxanaçı'],
            ['texniki_işçi', '', 'Texniki işçi'],

            [], // Empty row
            ['İŞ YERİ NÖVÜ (workplace_type):'],
            ['primary', '', 'İbtidai (1-4 siniflər)'],
            ['secondary', '', 'Orta (5-11 siniflər)'],

            [], // Empty row
            ['QİYMƏTLƏNDİRMƏ NÖVÜ (assessment_type):'],
            ['sertifikasiya', '', 'Sertifikasiya'],
            ['miq_100', '', 'MİQ-100'],
            ['miq_60', '', 'MİQ-60'],
            ['diaqnostik', '', 'Diaqnostik'],
        ];
    }

    public function headings(): array
    {
        return [
            'Sahə',
            'Status',
            'İzahat',
            'Nümunə',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFFF9800']],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 25,
            'B' => 15,
            'C' => 50,
            'D' => 30,
        ];
    }
}
