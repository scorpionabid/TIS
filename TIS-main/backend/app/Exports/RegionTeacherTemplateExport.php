<?php

namespace App\Exports;

use App\Models\Institution;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
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
            new FieldReferenceSheet,
            new QuickStartGuideSheet, // NEW: Quick start guide
        ];
    }
}

/**
 * Main template sheet with sample data
 */
class RegionTeacherTemplateSheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    protected $region;

    public function __construct(Institution $region)
    {
        $this->region = $region;
    }

    public function array(): array
    {
        // Get multiple institutions for varied examples
        $institutionIds = $this->region->getAllChildrenIds();
        $institutions = Institution::whereIn('id', $institutionIds)
            ->where('level', '>=', 3) // Sectors and schools
            ->orderBy('level')
            ->orderBy('name')
            ->limit(3)
            ->get();

        $firstInst = $institutions->first();
        $secondInst = $institutions->skip(1)->first() ?? $firstInst;
        $thirdInst = $institutions->skip(2)->first() ?? $firstInst;

        return [
            // Example 1: Regular teacher with full data
            [
                $firstInst?->utis_code ?? '',
                $firstInst?->institution_code ?? '',
                $firstInst?->id ?? '',
                'ali.mammadov@example.com',
                'ali.mammadov',
                'Əli',
                'Məmmədov',
                'Rəşid',
                'muəllim',
                'secondary',
                'Riyaziyyat',
                'Riyaziyyat',
                'miq_100',
                '85.50',
                'teacher123',
                '+994501234567',
                '2024-09-01',
                '2025-06-30',
                'master',
                'Bakı Dövlət Universiteti',
                '2015',
                'Riyaziyyat müəllimi, təcrübəli',
            ],

            // Example 2: Deputy director (administrative)
            [
                '',
                $secondInst?->institution_code ?? '',
                '',
                'leyla.hasanova@example.com',
                'leyla.hasanova',
                'Leyla',
                'Həsənova',
                'Vaqif',
                'direktor_muavini_tedris',
                'primary',
                'Pedaqogika',
                'Azərbaycan dili',
                'sertifikasiya',
                '92.00',
                'teacher456',
                '+994555555555',
                '2023-01-15',
                '',
                'bachelor',
                'ADU',
                '2008',
                '',
            ],

            // Example 3: Psychologist
            [
                $thirdInst?->utis_code ?? '',
                '',
                '',
                'nərgiz.əliyeva@example.com',
                'nergiz.aliyeva',
                'Nərgiz',
                'Əliyeva',
                'Kamran',
                'psixoloq',
                'secondary',
                'Psixologiya',
                'Psixoloji xidmət',
                'miq_60',
                '78.30',
                'psych789',
                '+994701234567',
                '',
                '',
                'master',
                'Xəzər Universiteti',
                '2018',
                'Məktəb psixoloqu',
            ],

            // Example 4: Director
            [
                '',
                $firstInst?->institution_code ?? '',
                '',
                'rəşad.məmmədov@example.com',
                'resad.mammadov',
                'Rəşad',
                'Məmmədov',
                'Tofiq',
                'direktor',
                'secondary',
                'İdarəetmə',
                '',
                'sertifikasiya',
                '95.00',
                'director2024',
                '+994502345678',
                '2020-01-01',
                '',
                'phd',
                'BDU',
                '2005',
                'Məktəb direktoru, 15 il təcrübə',
            ],

            // Example 5: Librarian (minimal data)
            [
                $secondInst?->utis_code ?? '',
                '',
                '',
                'aynur.qasimova@example.com',
                'aynur.gasimova',
                'Aynur',
                'Qasımova',
                'Elşən',
                'kitabxanaçı',
                'primary',
                'Kitabxanaçılıq',
                'Ədəbiyyat klubu',
                'diaqnostik',
                '65.00',
                'library123',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ],

            // Example 6: Teacher (subject: Physics)
            [
                '',
                '',
                $thirdInst?->id ?? '',
                'elvin.hüseynov@example.com',
                'elvin.huseynov',
                'Elvin',
                'Hüseynov',
                'Məhəmməd',
                'muəllim',
                'secondary',
                'Fizika',
                'Fizika',
                'miq_100',
                '88.75',
                'physics2024',
                '+994553456789',
                '2024-09-01',
                '2025-06-30',
                'master',
                'BDU Fizika fakültəsi',
                '2012',
                'Fizika müəllimi',
            ],

            // Example 7: Methodist
            [
                $firstInst?->utis_code ?? '',
                $firstInst?->institution_code ?? '',
                '',
                'gülnarə.əhmədova@example.com',
                'gulnara.ahmadova',
                'Gülnarə',
                'Əhmədova',
                'Rauf',
                'metodik_birlesme_rəhbəri',
                'primary',
                'İbtidai sinif pedaqogikası',
                'İbtidai siniflər',
                'sertifikasiya',
                '90.50',
                'metodist2024',
                '+994504567890',
                '',
                '',
                'master',
                'ADU',
                '2010',
                'Metodist, ibtidai siniflər üzrə',
            ],

            // Example 8: Technical worker
            [
                '',
                $secondInst?->institution_code ?? '',
                $secondInst?->id ?? '',
                'tural.məhərrəmov@example.com',
                'tural.maharramov',
                'Tural',
                'Məhərrəmov',
                'Şəhriyar',
                'təsərrüfat_işçisi',
                'secondary',
                'Texniki xidmət',
                '',
                'diaqnostik',
                '60.00',
                'tech2024',
                '+994555678901',
                '',
                '',
                '',
                '',
                '',
                'Texniki işçi',
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
            'specialty',
            'main_subject',
            'assessment_type',
            'assessment_score',
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
        $requiredStyle = [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF4CAF50']],
        ];
        $sheet->getStyle('D1:J1')->applyFromArray($requiredStyle);
        $sheet->getStyle('O1:O1')->applyFromArray($requiredStyle);

        // Optional fields (gray background)
        $optionalStyle = [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF000000']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFE0E0E0']],
        ];
        $sheet->getStyle('K1:N1')->applyFromArray($optionalStyle);
        $sheet->getStyle('P1:V1')->applyFromArray($optionalStyle);

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
            'L' => 25, // main_subject
            'M' => 20, // assessment_type
            'N' => 20, // assessment_score
            'O' => 15, // password
            'P' => 18, // contact_phone
            'Q' => 20, // contract_start_date
            'R' => 20, // contract_end_date
            'S' => 20, // education_level
            'T' => 30, // graduation_university
            'U' => 18, // graduation_year
            'V' => 40, // notes
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
                $level,
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
class FieldReferenceSheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
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
            ['position_type', 'MƏCBURI', 'Vəzifə növü (aşağıdakı siyahıdan)', 'muəllim'],
            ['workplace_type', 'MƏCBURI', 'İş yeri növü (primary və ya secondary)', 'secondary'],
            ['password', 'MƏCBURI', 'Şifrə (minimum 8 simvol)', 'teacher123'],
            [],

            // Optional fields
            ['== KÖNÜLLÜ SAHƏLƏR =='],
            ['specialty', 'KÖNÜLLÜ', 'İxtisas (əgər məlumdursa)', 'Riyaziyyat'],
            ['main_subject', 'KÖNÜLLÜ', 'Əsas fənn (dərs dediyi fənn)', 'Riyaziyyat'],
            ['assessment_type', 'KÖNÜLLÜ', 'Qiymətləndirmə növü (əgər məlumdursa)', 'miq_100'],
            ['assessment_score', 'KÖNÜLLÜ', 'Qiymətləndirmə balı (0-100, əgər məlumdursa)', '85.50'],
            ['contact_phone', 'KÖNÜLLÜ', 'Əlaqə telefonu', '+994501234567'],
            ['contract_start_date', 'KÖNÜLLÜ', 'Müqavilə başlanğıc tarixi (YYYY-MM-DD)', '2024-09-01'],
            ['contract_end_date', 'KÖNÜLLÜ', 'Müqavilə bitmə tarixi (YYYY-MM-DD)', '2025-06-30'],
            ['education_level', 'KÖNÜLLÜ', 'Təhsil səviyyəsi', 'bachelor'],
            ['graduation_university', 'KÖNÜLLÜ', 'Məzun olduğu universitet', 'BDU'],
            ['graduation_year', 'KÖNÜLLÜ', 'Məzuniyyət ili', '2010'],
            ['notes', 'KÖNÜLLÜ', 'Qeydlər', 'Əlavə məlumat'],

            [], // Empty row
            ['VƏZİFƏ NÖVLƏRİ (position_type):'],
            ['direktor', '', 'Direktor'],
            ['direktor_muavini_tedris', '', 'Direktor müavini (tədris)'],
            ['direktor_muavini_inzibati', '', 'Direktor müavini (inzibati)'],
            ['terbiye_isi_uzre_direktor_muavini', '', 'Tərbiyə işi üzrə direktor müavini'],
            ['metodik_birlesme_rəhbəri', '', 'Metodik birləşmə rəhbəri'],
            ['muəllim_sinif_rəhbəri', '', 'Müəllim (sinif rəhbəri)'],
            ['muəllim', '', 'Müəllim'],
            ['psixoloq', '', 'Psixoloq'],
            ['kitabxanaçı', '', 'Kitabxanaçı'],
            ['laborant', '', 'Laborant'],
            ['tibb_işçisi', '', 'Tibb işçisi'],
            ['təsərrüfat_işçisi', '', 'Təsərrüfat işçisi'],

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

/**
 * Quick Start Guide Sheet
 * Comprehensive step-by-step instructions for teacher import
 */
class QuickStartGuideSheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            [''],
            ['📋 MÜƏLLIM İDXALI ÜZRƏ ƏTRAFL TƏLİMAT'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['ADDIM 1: İNSTITUSIYA MƏLUMATLARINI HAZIRLAYIN'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['▶ 2-ci vərəq (Institutions) sizin regionunuzdakı bütün məktəbləri göstərir'],
            ['▶ Hər məktəbin 3 identifikatorundan BİRİNİ istifadə edə bilərsiniz:'],
            [''],
            ['  1️⃣ UTİS Kod (ən etibarlı, tövsiyyə olunur)'],
            ['     Nümunə: 118863433'],
            ['     ✅ Hökumət standartı, unikal'],
            [''],
            ['  2️⃣ Institution Kod (insan oxuya bilən)'],
            ['     Nümunə: SHZRT-001'],
            ['     ✅ Asan oxuna bilir'],
            [''],
            ['  3️⃣ ID (köhnə üsul, geriyə uyğunluq üçün)'],
            ['     Nümunə: 123'],
            ['     ⚠️ Ən az tövsiyyə olunur'],
            [''],
            ['💡 TÖVSİYYƏ: UTİS kod istifadə edin!'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['ADDIM 2: MÜƏLLIM MƏLUMATLARINI DOLDURUN'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['▶ 1-ci vərəq (Template) 8 müxtəlif nümunə göstərir:'],
            ['  • Nümunə 1: Adi müəllim (tam məlumatlarla)'],
            ['  • Nümunə 2: Direktor müavini'],
            ['  • Nümunə 3: Psixoloq'],
            ['  • Nümunə 4: Direktor'],
            ['  • Nümunə 5: Kitabxanaçı (minimal məlumat)'],
            ['  • Nümunə 6-8: Digər vəzifələr'],
            [''],
            ['▶ Sütun rəngləri:'],
            ['  🔵 MAVİ = Müəssisə axtarışı (ən azı 1-i tələb olunur)'],
            ['  🟢 YAŞIL = MƏCBURI sahələr'],
            ['  ⚪ BOZ = Könüllü sahələr'],
            [''],
            ['▶ Məcburi sahələr:'],
            ['  ✓ email (unikal olmalı)'],
            ['  ✓ username (unikal olmalı)'],
            ['  ✓ first_name, last_name, patronymic'],
            ['  ✓ position_type (vəzifə)'],
            ['  ✓ workplace_type (primary və ya secondary)'],
            ['  ◇ specialty (ixtisas) - könüllü (məlumat varsa daxil edin)'],
            ['  ◇ main_subject (əsas fənn) - könüllü (dərs dediyi fənn)'],
            ['  ◇ assessment_type və assessment_score - könüllü məlumat'],
            ['  ✓ password (minimum 8 simvol)'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['ADDIM 3: FAYLIN KONTROLu'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['▶ Yükləmədən əvvəl yoxlayın:'],
            ['  ✓ Bütün email-lər unikaldır'],
            ['  ✓ Bütün username-lər unikaldır'],
            ['  ✓ Müəssisə kodları düzgündür (2-ci vərəqdə var)'],
            ['  ✓ Vəzifə növləri düzgündür (3-cü vərəqdə siyahı)'],
            ['  ✓ Qiymətləndirmə növləri düzgündür'],
            ['  ✓ Şifrələr minimum 8 simvol'],
            [''],
            ['▶ Fayl tələbləri:'],
            ['  • Format: .xlsx'],
            ['  • Maksimum ölçü: 10 MB'],
            ['  • Maksimum sətir: ~4000 müəllim'],
            [''],
            ['💡 TÖVSİYYƏ: 1000-dən çox müəllim üçün bir neçə fayla bölün'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['ADDIM 4: SİSTEMƏ YÜKLƏYİN'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['1. Sistemə daxil olun (RegionAdmin rolu)'],
            ['2. "Müəllim İdarəetməsi" səhifəsinə keçin'],
            ['3. "İdxal/İxrac" düyməsinə klikləyin'],
            ['4. Faylı seçin'],
            ['5. Seçimləri təyin edin:'],
            ['   □ Təkrarlananları keç (tövsiyyə)'],
            ['   □ Mövcudları yenilə (ehtiyatla)'],
            ['6. "İdxal Et" düyməsinə klikləyin'],
            ['7. Progress bar-ı izləyin'],
            ['8. Nəticələri yoxlayın'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['⏱️ PERFORMANS GÖZLƏNTİLƏRİ'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['Təxmini idxal vaxtları:'],
            ['  • 100 müəllim: ~3-5 saniyə'],
            ['  • 500 müəllim: ~10-15 saniyə'],
            ['  • 1000 müəllim: ~20-30 saniyə'],
            ['  • 2000 müəllim: ~40-60 saniyə'],
            [''],
            ['💡 Sistemimiz 500 chunk size ilə işləyir (5x sürətli!)'],
            [''],

            ['══════════════════════════════════════════════════════════════'],
            ['⚠️ VACIB QEYDLƏR'],
            ['══════════════════════════════════════════════════════════════'],
            [''],
            ['✗ YANLIŞLAR:'],
            ['  ❌ Email və ya username təkrarlanır'],
            ['  ❌ Müəssisə regionunuza aid deyil'],
            ['  ❌ Vəzifə növü düzgün yazılmayıb'],
            ['  ❌ Qiymətləndirmə balı 0-100 deyil'],
            ['  ❌ Şifrə çox qısadır (min 8 simvol)'],
            [''],
            ['✓ DÜZGÜN TƏCRÜBƏLƏR:'],
            ['  ✅ Nümunə sətirlərə baxın'],
            ['  ✅ UTİS kod istifadə edin'],
            ['  ✅ Böyük faylları test edin'],
            ['  ✅ Xəta mesajlarını oxuyun'],
            [''],
            ['✅ UĞURLAR!'],
        ];
    }

    public function headings(): array
    {
        return [
            'İSTİFADƏ TƏLİMATI',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1976D2']],
        ]);

        $sheet->getStyle('A2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['argb' => 'FF1976D2']],
        ]);

        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 70,
        ];
    }
}
