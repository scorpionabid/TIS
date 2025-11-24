<?php

namespace App\Exports;

use App\Models\Institution;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InstitutionTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function array(): array
    {
        $data = [];

        // Get sample institutions from different levels and types
        $sampleInstitutions = $this->getSampleInstitutions();

        foreach ($sampleInstitutions as $institution) {
            // Get contact info
            $contactInfo = $institution['contact_info'] ?? [];
            $phone = $contactInfo['phone'] ?? '';
            $email = $contactInfo['email'] ?? '';

            // Get location info
            $location = $institution['location'] ?? [];
            $region = $location['region'] ?? '';
            $address = $institution['address'] ?? '';

            // Get metadata
            $metadata = $institution['metadata'] ?? [];
            $studentCapacity = $metadata['student_capacity'] ?? null;
            $staffCount = $metadata['staff_count'] ?? null;
            $foundedYear = $metadata['founded_year'] ?? null;

            $data[] = [
                $institution['name'],
                $institution['short_name'] ?? '',
                $institution['type'],
                $institution['parent_name'] ?? '',
                $institution['region_code'] ?? '',
                $institution['institution_code'] ?? '',
                $phone,
                $email,
                $region,
                $address,
                $studentCapacity,
                $staffCount,
                $foundedYear,
                $institution['established_date'] ?? '',
                $institution['utis_code'] ?? '', // UTIS avtomatik yaradılacaq
            ];
        }

        return $data;
    }

    private function getSampleInstitutions(): array
    {
        // Get real institutions for each level/type if available, otherwise use sample data
        $realInstitutions = Institution::with('parent')
            ->where('is_active', true)
            ->get()
            ->groupBy('level');

        $samples = [];

        // Level 1 - Ministry (if exists)
        if (isset($realInstitutions[1]) && $realInstitutions[1]->count() > 0) {
            $ministry = $realInstitutions[1]->first();
            $samples[] = $this->formatInstitution($ministry);
        } else {
            $samples[] = $this->getSampleMinistry();
        }

        // Level 2 - Regional Education Department (take 1 sample)
        if (isset($realInstitutions[2]) && $realInstitutions[2]->count() > 0) {
            $regional = $realInstitutions[2]->first();
            $samples[] = $this->formatInstitution($regional);
        } else {
            $samples[] = $this->getSampleRegional();
        }

        // Level 3 - Sector Education Office (take 1 sample)
        if (isset($realInstitutions[3]) && $realInstitutions[3]->count() > 0) {
            $sector = $realInstitutions[3]->first();
            $samples[] = $this->formatInstitution($sector);
        } else {
            $samples[] = $this->getSampleSector();
        }

        // Level 4 - Different school types (get variety)
        if (isset($realInstitutions[4]) && $realInstitutions[4]->count() > 0) {
            $schoolTypes = $realInstitutions[4]->groupBy('type');

            // Get one example of each type that exists
            foreach ($schoolTypes as $type => $institutions) {
                if (count($samples) < 8) { // Limit total samples
                    $samples[] = $this->formatInstitution($institutions->first());
                }
            }
        }

        // Add sample school types if we don't have enough variety
        $existingTypes = collect($samples)->pluck('type')->toArray();
        $desiredTypes = ['secondary_school', 'kindergarten', 'lyceum', 'vocational_school'];

        foreach ($desiredTypes as $type) {
            if (! in_array($type, $existingTypes) && count($samples) < 8) {
                $samples[] = $this->getSampleSchool($type);
            }
        }

        return $samples;
    }

    private function formatInstitution($institution): array
    {
        $contactInfo = $institution->contact_info ?? [];
        $location = $institution->location ?? [];
        $metadata = $institution->metadata ?? [];

        return [
            'name' => $institution->name,
            'short_name' => $institution->short_name,
            'type' => $institution->type,
            'parent_name' => $institution->parent ? $institution->parent->name : '',
            'region_code' => $institution->region_code,
            'institution_code' => $institution->institution_code,
            'contact_info' => $contactInfo,
            'location' => $location,
            'address' => $institution->address,
            'metadata' => $metadata,
            'established_date' => $institution->established_date ? $institution->established_date->format('Y-m-d') : '',
            'utis_code' => $institution->utis_code,
        ];
    }

    private function getSampleMinistry(): array
    {
        return [
            'name' => 'Azərbaycan Respublikasının Təhsil Nazirliyi',
            'short_name' => 'TN',
            'type' => 'ministry',
            'parent_name' => '',
            'region_code' => '',
            'institution_code' => 'MIN-001',
            'contact_info' => ['phone' => '+994 12 000-00-00', 'email' => 'info@edu.gov.az'],
            'location' => ['region' => 'Bakı'],
            'address' => 'Bakı şəhəri, Xətai rayonu, Koroğlu Rəhimov küçəsi 49',
            'metadata' => ['staff_count' => 500],
            'established_date' => '1991-10-18',
            'utis_code' => '',
        ];
    }

    private function getSampleRegional(): array
    {
        return [
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'short_name' => 'BŞTİ',
            'type' => 'regional_education_department',
            'parent_name' => 'Azərbaycan Respublikasının Təhsil Nazirliyi',
            'region_code' => 'BA',
            'institution_code' => 'REG-BA-001',
            'contact_info' => ['phone' => '+994 12 000-01-00', 'email' => 'baku@edu.gov.az'],
            'location' => ['region' => 'Bakı'],
            'address' => 'Bakı şəhəri, Nəsimi rayonu, Fizuli küçəsi 123',
            'metadata' => ['staff_count' => 150],
            'established_date' => '1991-12-01',
            'utis_code' => '',
        ];
    }

    private function getSampleSector(): array
    {
        return [
            'name' => 'Nəsimi Rayon Təhsil Sektoru',
            'short_name' => 'NRTS',
            'type' => 'sector_education_office',
            'parent_name' => 'Bakı Şəhər Təhsil İdarəsi',
            'region_code' => 'BA',
            'institution_code' => 'SEC-BA-NES-001',
            'contact_info' => ['phone' => '+994 12 000-02-00', 'email' => 'nesimi@edu.gov.az'],
            'location' => ['region' => 'Bakı'],
            'address' => 'Bakı şəhəri, Nəsimi rayonu, Azadlıq prospekti 200',
            'metadata' => ['staff_count' => 50],
            'established_date' => '1992-01-15',
            'utis_code' => '',
        ];
    }

    private function getSampleSchool($type): array
    {
        $samples = [
            'secondary_school' => [
                'name' => '1 nömrəli tam orta məktəb',
                'short_name' => 'TOM-001',
                'institution_code' => 'SCH-BA-001',
                'phone' => '+994 12 000-03-01',
                'email' => 'school001@edu.gov.az',
                'student_capacity' => 800,
                'staff_count' => 45,
            ],
            'kindergarten' => [
                'name' => '5 nömrəli uşaq bağçası',
                'short_name' => 'UB-005',
                'institution_code' => 'KG-BA-005',
                'phone' => '+994 12 000-03-05',
                'email' => 'kindergarten005@edu.gov.az',
                'student_capacity' => 150,
                'staff_count' => 20,
            ],
            'lyceum' => [
                'name' => 'Nəsimi rayonu 1 nömrəli lisey',
                'short_name' => 'LIS-001',
                'institution_code' => 'LYC-BA-001',
                'phone' => '+994 12 000-03-10',
                'email' => 'lyceum001@edu.gov.az',
                'student_capacity' => 600,
                'staff_count' => 35,
            ],
            'vocational_school' => [
                'name' => 'Peşə Təhsili Məktəbi №1',
                'short_name' => 'PTM-001',
                'institution_code' => 'VOC-BA-001',
                'phone' => '+994 12 000-03-20',
                'email' => 'vocational001@edu.gov.az',
                'student_capacity' => 400,
                'staff_count' => 30,
            ],
        ];

        $sample = $samples[$type] ?? $samples['secondary_school'];

        return [
            'name' => $sample['name'],
            'short_name' => $sample['short_name'],
            'type' => $type,
            'parent_name' => 'Nəsimi Rayon Təhsil Sektoru',
            'region_code' => 'BA',
            'institution_code' => $sample['institution_code'],
            'contact_info' => ['phone' => $sample['phone'], 'email' => $sample['email']],
            'location' => ['region' => 'Bakı'],
            'address' => 'Bakı şəhəri, Nəsimi rayonu, Nümunə küçəsi 100',
            'metadata' => [
                'student_capacity' => $sample['student_capacity'],
                'staff_count' => $sample['staff_count'],
                'founded_year' => 2005,
            ],
            'established_date' => '2005-09-01',
            'utis_code' => '',
        ];
    }

    public function headings(): array
    {
        return [
            'name (Müəssisə adı)',
            'short_name (Qısa ad)',
            'type (Növ: secondary_school, kindergarten, və s.)',
            'parent_name (Üst müəssisə adı)',
            'region_code (Region kodu)',
            'institution_code (Müəssisə kodu)',
            'phone (Telefon)',
            'email (E-poçt)',
            'region (Region)',
            'address (Ünvan)',
            'student_capacity (Şagird tutumu)',
            'staff_count (İşçi sayı)',
            'founded_year (Təsis ili)',
            'established_date (Təsis tarixi YYYY-MM-DD)',
            'utis_code (UTIS kodu - könüllü, 8 rəqəmli)',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12]],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 35, // name (Müəssisə adı)
            'B' => 20, // short_name (Qısa ad)
            'C' => 35, // type (Növ: secondary_school, kindergarten, və s.)
            'D' => 35, // parent_name (Üst müəssisə adı)
            'E' => 15, // region_code (Region kodu)
            'F' => 20, // institution_code (Müəssisə kodu)
            'G' => 18, // phone (Telefon)
            'H' => 30, // email (E-poçt)
            'I' => 15, // region (Region)
            'J' => 45, // address (Ünvan)
            'K' => 18, // student_capacity (Şagird tutumu)
            'L' => 15, // staff_count (İşçi sayı)
            'M' => 15, // founded_year (Təsis ili)
            'N' => 25, // established_date (Təsis tarixi YYYY-MM-DD)
            'O' => 45, // utis_code (UTIS kodu - boş qoyun, avtomatik yaradılacaq)
        ];
    }
}
