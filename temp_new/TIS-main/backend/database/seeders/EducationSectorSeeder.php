<?php

namespace Database\Seeders;

use App\Models\EducationSector;
use App\Models\Institution;
use Illuminate\Database\Seeder;

class EducationSectorSeeder extends Seeder
{
    public function run(): void
    {
        // Get regional institutions (level 2 in hierarchy)
        $regions = Institution::where('level', 2)->get();

        if ($regions->isEmpty()) {
            $this->command->warn('Regional institutions not found. Please run InstitutionHierarchySeeder first.');

            return;
        }

        $sectors = [
            // Bakı regionu sektorları
            [
                'name' => 'Orta təhsil sektoru',
                'code' => 'OTS-BAK-001',
                'description' => 'Bakı regionunun orta təhsil müəssisələrini əhatə edən sektor',
                'type' => 'secondary',
                'address' => 'Bakı, Yasamal rayonu, Atatürk prospekti 123',
                'phone' => '+994 12 555-0123',
                'email' => 'orta.tehsil.baki@edu.az',
                'region_name_like' => 'Bakı',
            ],
            [
                'name' => 'İbtidai təhsil sektoru',
                'code' => 'İTS-BAK-002',
                'description' => 'Bakı regionunun ibtidai təhsil müəssisələri',
                'type' => 'primary',
                'address' => 'Bakı, Nəsimi rayonu, Zərifə Əliyeva küçəsi 45',
                'phone' => '+994 12 555-0124',
                'email' => 'ibtidai.tehsil.baki@edu.az',
                'region_name_like' => 'Bakı',
            ],
            [
                'name' => 'Məktəbəqədər sektoru',
                'code' => 'MQS-BAK-003',
                'description' => 'Bakı regionunun məktəbəqədər təhsil müəssisələri',
                'type' => 'preschool',
                'address' => 'Bakı, Səbail rayonu, Nizami küçəsi 78',
                'phone' => '+994 12 555-0125',
                'email' => 'mektebeqeder.baki@edu.az',
                'region_name_like' => 'Bakı',
            ],

            // Gəncə regionu sektorları
            [
                'name' => 'Gəncə orta təhsil sektoru',
                'code' => 'OTS-GNC-001',
                'description' => 'Gəncə regionunun orta təhsil müəssisələri',
                'type' => 'secondary',
                'address' => 'Gəncə, Kəpəz rayonu, Heydər Əliyev prospekti 45',
                'phone' => '+994 22 444-0234',
                'email' => 'orta.tehsil.gence@edu.az',
                'region_name_like' => 'Gəncə',
            ],
            [
                'name' => 'Gəncə məktəbəqədər sektoru',
                'code' => 'MQS-GNC-002',
                'description' => 'Gəncə regionunun məktəbəqədər təhsil müəssisələri',
                'type' => 'preschool',
                'address' => 'Gəncə, Nizami rayonu, Cavadxan küçəsi 23',
                'phone' => '+994 22 444-0235',
                'email' => 'mektebeqeder.gence@edu.az',
                'region_name_like' => 'Gəncə',
            ],

            // Sumqayıt regionu sektorları
            [
                'name' => 'Peşə təhsili sektoru',
                'code' => 'PTS-SUM-001',
                'description' => 'Sumqayıt regionunun peşə təhsili və texniki kollecləri',
                'type' => 'vocational',
                'address' => 'Sumqayıt, 1-ci mikrorayon, Vətən küçəsi 78',
                'phone' => '+994 18 333-0345',
                'email' => 'pese.tehsil.sumqayit@edu.az',
                'region_name_like' => 'Sumqayıt',
            ],
            [
                'name' => 'Sumqayıt orta təhsil sektoru',
                'code' => 'OTS-SUM-002',
                'description' => 'Sumqayıt regionunun orta təhsil müəssisələri',
                'type' => 'secondary',
                'address' => 'Sumqayıt, 2-ci mikrorayon, Azadlıq prospekti 156',
                'phone' => '+994 18 333-0346',
                'email' => 'orta.tehsil.sumqayit@edu.az',
                'region_name_like' => 'Sumqayıt',
            ],

            // Mingəçevir regionu sektorları
            [
                'name' => 'Xüsusi ehtiyaclı təhsil sektoru',
                'code' => 'XTS-MNZ-001',
                'description' => 'Mingəçevir regionunun xüsusi ehtiyaclı uşaqlar üçün təhsil müəssisələri',
                'type' => 'special',
                'address' => 'Mingəçevir, Azadlıq prospekti 23',
                'phone' => '+994 25 222-0456',
                'email' => 'xususi.tehsil.mingecevir@edu.az',
                'region_name_like' => 'Mingəçevir',
                'is_active' => false,
            ],
            [
                'name' => 'Mingəçevir qarışıq təhsil sektoru',
                'code' => 'QTS-MNZ-002',
                'description' => 'Mingəçevir regionunun müxtəlif təhsil müəssisələri',
                'type' => 'mixed',
                'address' => 'Mingəçevir, Şəhər mərkəzi, Mərkəz küçəsi 67',
                'phone' => '+994 25 222-0457',
                'email' => 'qarısıq.tehsil.mingecevir@edu.az',
                'region_name_like' => 'Mingəçevir',
            ],
        ];

        foreach ($sectors as $sectorData) {
            // Find region by name pattern
            $region = $regions->first(function ($r) use ($sectorData) {
                return str_contains($r->name, $sectorData['region_name_like']);
            });

            if (! $region) {
                $this->command->warn("Region not found for: {$sectorData['region_name_like']}");

                continue;
            }

            // Remove the search helper field
            unset($sectorData['region_name_like']);

            // Add region_id
            $sectorData['region_id'] = $region->id;

            // Set default values
            $sectorData['is_active'] = $sectorData['is_active'] ?? true;

            EducationSector::create($sectorData);

            $this->command->info("Created sector: {$sectorData['name']}");
        }

        $this->command->info('Education sectors seeded successfully!');
    }
}
