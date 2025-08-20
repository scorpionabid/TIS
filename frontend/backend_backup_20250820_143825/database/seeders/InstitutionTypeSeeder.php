<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\InstitutionType;

class InstitutionTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $institutionTypes = [
            // Level 1: Ministry
            [
                'key' => 'ministry',
                'label' => 'Nazirlik',
                'label_az' => 'Nazirlik',
                'label_en' => 'Ministry',
                'default_level' => 1,
                'allowed_parent_types' => [],
                'icon' => 'Building',
                'color' => '#dc2626',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'description' => 'Ən yüksək səviyyəli dövlət təşkilatı',
                    'responsibilities' => ['Təhsil siyasəti', 'Strateji planlaşdırma', 'Qanunvericilik']
                ],
                'description' => 'Dövlət təhsil sistemi üzərində ümumi nəzarət və rəhbərlik edən nazirlik',
            ],

            // Level 2: Regional Education Departments  
            [
                'key' => 'regional_education_department',
                'label' => 'Regional Təhsil İdarəsi',
                'label_az' => 'Regional Təhsil İdarəsi',
                'label_en' => 'Regional Education Department',
                'default_level' => 2,
                'allowed_parent_types' => ['ministry'],
                'icon' => 'MapPin',
                'color' => '#2563eb',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'description' => 'Regional səviyyədə təhsilin təşkil edilməsi',
                    'responsibilities' => ['Regional koordinasiya', 'Yerli təhsil idarəetmə', 'Statistika toplanması']
                ],
                'description' => 'Müəyyən coğrafi regionda təhsil fəaliyyətini koordinasiya edən təşkilat',
            ],

            // Level 3: Sector Education Offices
            [
                'key' => 'sector_education_office', 
                'label' => 'Sektor Təhsil Şöbəsi',
                'label_az' => 'Sektor Təhsil Şöbəsi',
                'label_en' => 'Sector Education Office',
                'default_level' => 3,
                'allowed_parent_types' => ['regional_education_department'],
                'icon' => 'Users',
                'color' => '#059669',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'description' => 'Yerli səviyyədə təhsil müəssisələrinin birbaşa idarəetməsi',
                    'responsibilities' => ['Yerli məktəblərin idarəsi', 'Kadr təminatı', 'Maliyyə nəzarəti']
                ],
                'description' => 'Müəyyən sektorda təhsil müəssisələrinin birbaşa idarə edilməsi',
            ],

            // Level 4: School Types
            [
                'key' => 'secondary_school',
                'label' => 'Tam Orta Məktəb', 
                'label_az' => 'Tam Orta Məktəb',
                'label_en' => 'Secondary School',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'School',
                'color' => '#7c3aed',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'grade_levels' => ['1-11'],
                    'age_range' => '6-17',
                    'curriculum_type' => 'standard',
                    'capacity_range' => [100, 1500]
                ],
                'description' => 'Ümumi orta təhsil verən əsas təhsil müəssisəsi',
            ],

            [
                'key' => 'lyceum',
                'label' => 'Lisey',
                'label_az' => 'Lisey', 
                'label_en' => 'Lyceum',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'School',
                'color' => '#db2777',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'grade_levels' => ['10-11'],
                    'age_range' => '15-17',
                    'curriculum_type' => 'academic_specialized',
                    'specializations' => ['Təbiət-riyazi', 'Humanitar', 'İctimai-iqtisadi']
                ],
                'description' => 'Ali təhsilə hazırlıq məqsədilə ixtisaslaşmış orta təhsil',
            ],

            [
                'key' => 'gymnasium',
                'label' => 'Gimnaziya',
                'label_az' => 'Gimnaziya',
                'label_en' => 'Gymnasium', 
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'School',
                'color' => '#ea580c',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'grade_levels' => ['5-9'],
                    'age_range' => '10-15',
                    'curriculum_type' => 'enhanced_general',
                    'focus_areas' => ['Dil təhsili', 'Elm təhsili', 'İncəsənət']
                ],
                'description' => 'Gücləndirilmiş proqramla orta təhsil verən müəssisə',
            ],

            // NEW: Preschool Education Types
            [
                'key' => 'kindergarten',
                'label' => 'Uşaq Bağçası',
                'label_az' => 'Uşaq Bağçası', 
                'label_en' => 'Kindergarten',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'Baby',
                'color' => '#f59e0b',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'age_groups' => ['2-3', '3-4', '4-5', '5-6'],
                    'capacity_per_group' => 20,
                    'staff_child_ratio' => '1:10',
                    'services' => ['Qidalanma', 'Yataq', 'Oyun', 'Təhsil fəaliyyəti'],
                    'operating_hours' => '07:00-19:00'
                ],
                'description' => 'Məktəbəqədər yaşlı uşaqların baxım və təhsili üçün müəssisə',
            ],

            [
                'key' => 'preschool_center',
                'label' => 'Məktəbəqədər Təhsil Mərkəzi',
                'label_az' => 'Məktəbəqədər Təhsil Mərkəzi',
                'label_en' => 'Preschool Education Center', 
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'GraduationCap',
                'color' => '#10b981',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'age_groups' => ['3-4', '4-5', '5-6'],
                    'capacity_per_group' => 15,
                    'staff_child_ratio' => '1:8',
                    'services' => ['Məktəbə hazırlıq', 'İnkişaf proqramları', 'Psixoloq dəstəyi'],
                    'operating_hours' => '08:00-17:00',
                    'specializations' => ['Kreativ inkişaf', 'Dil inkişafı', 'Riyazi təfəkkür']
                ],
                'description' => 'Uşaqları məktəbə hazırlayan ixtisaslaşmış təhsil mərkəzi',
            ],

            [
                'key' => 'nursery',
                'label' => 'Uşaq Evi (Körpələr Evi)',
                'label_az' => 'Uşaq Evi (Körpələr Evi)',
                'label_en' => 'Nursery',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'Heart',
                'color' => '#f97316',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'age_groups' => ['0-1', '1-2', '2-3'],
                    'capacity_per_group' => 12,
                    'staff_child_ratio' => '1:6',
                    'services' => ['Tibbi baxım', 'Qidalanma', 'İnkişaf stimullaşdırması'],
                    'operating_hours' => '07:00-19:00',
                    'special_requirements' => ['Tibbi heyət', 'İxtisas avadanlıqları']
                ],
                'description' => 'Kiçik yaşlı uşaqlar üçün baxım və ilkin inkişaf müəssisəsi',
            ],

            // Additional Education Types
            [
                'key' => 'vocational_school',
                'label' => 'Peşə Məktəbi',
                'label_az' => 'Peşə Məktəbi',
                'label_en' => 'Vocational School',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'Wrench',
                'color' => '#6b7280',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'education_duration' => '2-4 years',
                    'specializations' => ['Texniki', 'İqtisadi', 'Xidmət', 'Kənd təsərrüfatı'],
                    'certification' => 'Peşə sertifikatı',
                    'practicum_required' => true
                ],
                'description' => 'Peşə hazırlığı və ixtisaslaşma təmin edən təhsil müəssisəsi',
            ],

            [
                'key' => 'special_education_school',
                'label' => 'Xüsusi Təhsil Məktəbi',
                'label_az' => 'Xüsusi Təhsil Məktəbi',
                'label_en' => 'Special Education School',
                'default_level' => 4,
                'allowed_parent_types' => ['sector_education_office'],
                'icon' => 'UserCheck',
                'color' => '#8b5cf6',
                'is_active' => true,
                'is_system' => true,
                'metadata' => [
                    'target_groups' => ['Eşitmə problemi', 'Görme problemi', 'İntellektual inkişaf', 'Fiziki əlillk'],
                    'specialized_staff' => ['Xüsusi pedaqoq', 'Psixoloq', 'Loqoped', 'Reabilitasiya mütəxəssisi'],
                    'adaptive_equipment' => true,
                    'individual_programs' => true
                ],
                'description' => 'Xüsusi ehtiyaclı uşaqlar üçün adaptasiya edilmiş təhsil müəssisəsi',
            ]
        ];

        foreach ($institutionTypes as $type) {
            InstitutionType::create($type);
        }
    }
}