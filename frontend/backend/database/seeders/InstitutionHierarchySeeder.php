<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Institution;
use Illuminate\Support\Facades\DB;

class InstitutionHierarchySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Ministry of Education (Level 1 - National)
        $ministry = Institution::create([
            'name' => 'Azərbaycan Respublikası Təhsil Nazirliyi',
            'short_name' => 'Təhsil Nazirliyi',
            'type' => 'ministry',
            'parent_id' => null,
            'level' => 1,
            'institution_code' => 'MoE-AZ',
            'contact_info' => json_encode([
                'address' => 'Bakı şəhəri, Səbail rayonu, Ü.Hacıbəyli küçəsi 49',
                'phone' => '+994 12 493-83-84',
                'email' => 'info@edu.gov.az',
                'website' => 'https://edu.gov.az'
            ]),
            'location' => json_encode([
                'city' => 'Bakı',
                'district' => 'Səbail',
                'coordinates' => ['lat' => 40.3755, 'lng' => 49.8375]
            ]),
            'established_date' => '1991-10-18',
        ]);

        // Create Regional Education Departments (Level 2 - Regional)
        $regions = [
            ['name' => 'Bakı Şəhər Təhsil İdarəsi', 'code' => 'BSTI', 'region_code' => 'BA'],
            ['name' => 'Gəncə Şəhər Təhsil İdarəsi', 'code' => 'GSTI', 'region_code' => 'GA'],
            ['name' => 'Şəki Rayon Təhsil İdarəsi', 'code' => 'SRTI', 'region_code' => 'SA'],
            ['name' => 'Şamaxı Rayon Təhsil İdarəsi', 'code' => 'SMRTI', 'region_code' => 'SMX'],
            ['name' => 'Quba Rayon Təhsil İdarəsi', 'code' => 'QRTI', 'region_code' => 'QU'],
        ];

        $regionInstitutions = [];
        foreach ($regions as $region) {
            $regionInst = Institution::create([
                'name' => $region['name'],
                'short_name' => $region['code'],
                'type' => 'regional_education_department',
                'parent_id' => $ministry->id,
                'level' => 2,
                'region_code' => $region['region_code'],
                'institution_code' => $region['code'],
                'contact_info' => json_encode([
                    'phone' => '+994 12 000-00-00',
                    'email' => strtolower($region['code']) . '@edu.gov.az'
                ]),
                'location' => json_encode([
                    'region' => $region['region_code']
                ])
            ]);
            $regionInstitutions[] = $regionInst;
        }

        // Create Sector Education Offices (Level 3 - Sector)
        $sectors = [
            // Bakı şəhəri sektorları
            ['name' => 'Səbail Rayon Təhsil Sektoru', 'code' => 'SRTS', 'parent_code' => 'BSTI', 'region_code' => 'BA'],
            ['name' => 'Nəsimi Rayon Təhsil Sektoru', 'code' => 'NRTS', 'parent_code' => 'BSTI', 'region_code' => 'BA'],
            ['name' => 'Yasamal Rayon Təhsil Sektoru', 'code' => 'YRTS', 'parent_code' => 'BSTI', 'region_code' => 'BA'],
            
            // Gəncə şəhəri sektorları
            ['name' => 'Gəncə Mərkəz Təhsil Sektoru', 'code' => 'GMTS', 'parent_code' => 'GSTI', 'region_code' => 'GA'],
            ['name' => 'Gəncə Kəpəz Təhsil Sektoru', 'code' => 'GKTS', 'parent_code' => 'GSTI', 'region_code' => 'GA'],
            
            // Digər rayonlar üçün sektorlar
            ['name' => 'Şəki Mərkəz Təhsil Sektoru', 'code' => 'SMTS', 'parent_code' => 'SRTI', 'region_code' => 'SA'],
            ['name' => 'Şamaxı Mərkəz Təhsil Sektoru', 'code' => 'SMMTS', 'parent_code' => 'SMRTI', 'region_code' => 'SMX'],
            ['name' => 'Quba Mərkəz Təhsil Sektoru', 'code' => 'QMTS', 'parent_code' => 'QRTI', 'region_code' => 'QU'],
        ];

        $sectorInstitutions = [];
        foreach ($sectors as $sector) {
            $parentRegion = collect($regionInstitutions)->firstWhere('institution_code', $sector['parent_code']);
            
            $sectorInst = Institution::create([
                'name' => $sector['name'],
                'short_name' => $sector['code'],
                'type' => 'sector_education_office',
                'parent_id' => $parentRegion->id,
                'level' => 3,
                'region_code' => $sector['region_code'],
                'institution_code' => $sector['code'],
                'contact_info' => json_encode([
                    'phone' => '+994 12 000-00-00',
                    'email' => strtolower($sector['code']) . '@edu.gov.az'
                ]),
                'location' => json_encode([
                    'region' => $sector['region_code']
                ])
            ]);
            $sectorInstitutions[] = $sectorInst;
        }

        // Create Sample Schools (Level 4 - Institution)
        $schools = [
            // Bakı məktəbləri
            [
                'name' => '1 nömrəli tam orta məktəb',
                'code' => 'BSTI-M001',
                'sector_code' => 'SRTS',
                'type' => 'secondary_school',
                'region_code' => 'BA'
            ],
            [
                'name' => '5 nömrəli tam orta məktəb',
                'code' => 'BSTI-M005',
                'sector_code' => 'NRTS',
                'type' => 'secondary_school',
                'region_code' => 'BA'
            ],
            [
                'name' => 'Bakı Fizika-Riyaziyyat Lisey',
                'code' => 'BSTI-L001',
                'sector_code' => 'YRTS',
                'type' => 'lyceum',
                'region_code' => 'BA'
            ],
            
            // Gəncə məktəbləri
            [
                'name' => 'Gəncə 12 nömrəli tam orta məktəb',
                'code' => 'GSTI-M012',
                'sector_code' => 'GMTS',
                'type' => 'secondary_school',
                'region_code' => 'GA'
            ],
            [
                'name' => 'Gəncə Humanitar Gimnasiya',
                'code' => 'GSTI-G001',
                'sector_code' => 'GKTS',
                'type' => 'gymnasium',
                'region_code' => 'GA'
            ],
            
            // Digər rayon məktəbləri
            [
                'name' => 'Şəki 3 nömrəli tam orta məktəb',
                'code' => 'SRTI-M003',
                'sector_code' => 'SMTS',
                'type' => 'secondary_school',
                'region_code' => 'SA'
            ],
            [
                'name' => 'Şamaxı 2 nömrəli tam orta məktəb',
                'code' => 'SMRTI-M002',
                'sector_code' => 'SMMTS',
                'type' => 'secondary_school',
                'region_code' => 'SMX'
            ],
            [
                'name' => 'Quba 4 nömrəli tam orta məktəb',
                'code' => 'QRTI-M004',
                'sector_code' => 'QMTS',
                'type' => 'secondary_school',
                'region_code' => 'QU'
            ],
        ];

        foreach ($schools as $school) {
            $parentSector = collect($sectorInstitutions)->firstWhere('institution_code', $school['sector_code']);
            
            Institution::create([
                'name' => $school['name'],
                'short_name' => $school['code'],
                'type' => $school['type'],
                'parent_id' => $parentSector->id,
                'level' => 4,
                'region_code' => $school['region_code'],
                'institution_code' => $school['code'],
                'contact_info' => json_encode([
                    'phone' => '+994 12 000-00-00',
                    'email' => strtolower(str_replace('-', '_', $school['code'])) . '@edu.gov.az'
                ]),
                'location' => json_encode([
                    'region' => $school['region_code']
                ]),
                'metadata' => json_encode([
                    'student_capacity' => rand(200, 1000),
                    'staff_count' => rand(20, 80),
                    'founded_year' => rand(1990, 2020)
                ])
            ]);
        }

        // Create Regions table entries
        foreach ($regionInstitutions as $regionInst) {
            DB::table('regions')->insert([
                'institution_id' => $regionInst->id,
                'code' => $regionInst->region_code,
                'name' => $regionInst->name,
                'area_km2' => rand(1000, 5000),
                'population' => rand(100000, 2000000),
                'metadata' => json_encode([
                    'administrative_center' => $regionInst->region_code === 'BA' ? 'Bakı' : 'Mərkəz',
                    'districts_count' => rand(5, 20)
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        // Create Sectors table entries
        foreach ($sectorInstitutions as $sectorInst) {
            $parentRegion = collect($regionInstitutions)->firstWhere('id', $sectorInst->parent_id);
            $regionEntry = DB::table('regions')->where('institution_id', $parentRegion->id)->first();
            
            DB::table('sectors')->insert([
                'institution_id' => $sectorInst->id,
                'region_id' => $regionEntry->id,
                'code' => $sectorInst->institution_code,
                'name' => $sectorInst->name,
                'area_km2' => rand(100, 1000),
                'population' => rand(10000, 200000),
                'metadata' => json_encode([
                    'schools_count' => rand(5, 25),
                    'students_count' => rand(500, 5000)
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        $this->command->info('Institution hierarchy created successfully:');
        $this->command->info('- 1 Ministry (Level 1)');
        $this->command->info('- ' . count($regions) . ' Regional Education Departments (Level 2)');
        $this->command->info('- ' . count($sectors) . ' Sector Education Offices (Level 3)');
        $this->command->info('- ' . count($schools) . ' Schools (Level 4)');
    }
}