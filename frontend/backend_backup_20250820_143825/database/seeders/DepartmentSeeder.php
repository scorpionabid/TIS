<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Institution;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Regional Administration Departments (Level 2)
        $this->createRegionalDepartments();
        
        // Sector Departments (Level 3)  
        $this->createSectorDepartments();
        
        // School Departments (Level 4)
        $this->createSchoolDepartments();
    }

    /**
     * Create departments for regional administrations
     */
    private function createRegionalDepartments(): void
    {
        $regionalInstitutions = Institution::where('type', 'region')->get();
        
        foreach ($regionalInstitutions as $institution) {
            $departments = [
                [
                    'name' => 'Maliyyə Şöbəsi',
                    'short_name' => 'Maliyyə',
                    'department_type' => 'maliyyə',
                    'description' => 'Büdcə icrası və maliyyə hesabatları, resurs bölgüsü idarəetməsi',
                    'functional_scope' => 'Maliyyə planlaşdırılması, büdcə nəzarəti, hesabat hazırlanması',
                    'capacity' => 8,
                    'metadata' => [
                        'budget_responsibility' => true,
                        'reporting_frequency' => 'monthly',
                        'audit_required' => true
                    ]
                ],
                [
                    'name' => 'İnzibati Şöbəsi',
                    'short_name' => 'İnzibati',
                    'department_type' => 'inzibati',
                    'description' => 'Kadr idarəetməsi və HR siyasətləri, inzibati qərarlar',
                    'functional_scope' => 'İnsan resursları, sənəd dövriyyəsi, rəsmi yazışmalar',
                    'capacity' => 12,
                    'metadata' => [
                        'hr_authority' => true,
                        'document_management' => true,
                        'policy_creation' => true
                    ]
                ],
                [
                    'name' => 'Təsərrüfat Şöbəsi',
                    'short_name' => 'Təsərrüfat',
                    'department_type' => 'təsərrüfat',
                    'description' => 'Tikinti və saxlama əməliyyatları, əmlak idarəetməsi',
                    'functional_scope' => 'İnfrastruktur inkişafı, saxlama işləri, əmlak idarəetməsi',
                    'capacity' => 10,
                    'metadata' => [
                        'construction_authority' => true,
                        'maintenance_responsibility' => true,
                        'asset_management' => true
                    ]
                ]
            ];

            foreach ($departments as $deptData) {
                Department::create(array_merge($deptData, [
                    'institution_id' => $institution->id,
                    'is_active' => true
                ]));
            }
        }
    }

    /**
     * Create departments for sector administrations
     */
    private function createSectorDepartments(): void
    {
        $sektorInstitutions = Institution::where('type', 'sektor')->get();
        
        foreach ($sektorInstitutions as $institution) {
            $departments = [
                [
                    'name' => 'Maliyyə Şöbəsi',
                    'short_name' => 'Maliyyə',
                    'department_type' => 'maliyyə',
                    'description' => 'Sektor səviyyəsində maliyyə idarəetməsi',
                    'functional_scope' => 'Lokal büdcə nəzarəti, xərc planlaşdırılması',
                    'capacity' => 4,
                    'metadata' => [
                        'budget_responsibility' => true,
                        'reporting_to_region' => true
                    ]
                ],
                [
                    'name' => 'İnzibati Şöbəsi',
                    'short_name' => 'İnzibati',
                    'department_type' => 'inzibati',
                    'description' => 'Sektor inzibati idarəetməsi',
                    'functional_scope' => 'Lokal kadr məsələləri, koordinasiya',
                    'capacity' => 6,
                    'metadata' => [
                        'coordination_role' => true,
                        'local_hr' => true
                    ]
                ],
                [
                    'name' => 'Təsərrüfat Şöbəsi',
                    'short_name' => 'Təsərrüfat',
                    'department_type' => 'təsərrüfat',
                    'description' => 'Sektor təsərrüfat idarəetməsi',
                    'functional_scope' => 'Lokal saxlama işləri, texniki dəstək',
                    'capacity' => 5,
                    'metadata' => [
                        'maintenance_responsibility' => true,
                        'technical_support' => true
                    ]
                ]
            ];

            foreach ($departments as $deptData) {
                Department::create(array_merge($deptData, [
                    'institution_id' => $institution->id,
                    'is_active' => true
                ]));
            }
        }
    }

    /**
     * Create departments for schools
     */
    private function createSchoolDepartments(): void
    {
        $schoolInstitutions = Institution::whereIn('type', ['school', 'vocational'])->limit(10)->get();
        
        foreach ($schoolInstitutions as $institution) {
            $departments = [
                [
                    'name' => 'Müavin Şöbəsi',
                    'short_name' => 'Müavin',
                    'department_type' => 'müavin',
                    'description' => 'Dərs bölgüsü və cədvəl tənzimlənməsi',
                    'functional_scope' => 'Akademik koordinasiya, dərs cədvəli, fənn bölgüsü',
                    'capacity' => 3,
                    'metadata' => [
                        'academic_responsibility' => true,
                        'schedule_management' => true
                    ]
                ],
                [
                    'name' => 'UBR Şöbəsi',
                    'short_name' => 'UBR',
                    'department_type' => 'ubr',
                    'description' => 'Təhsil tədbirləri və fəaliyyətlərin planlaşdırılması',
                    'functional_scope' => 'Təhsil tədbirləri, təqvim planlaşdırılması, koordinasiya',
                    'capacity' => 2,
                    'metadata' => [
                        'event_management' => true,
                        'calendar_planning' => true
                    ]
                ],
                [
                    'name' => 'Təsərrüfat Şöbəsi',
                    'short_name' => 'Təsərrüfat',
                    'department_type' => 'təsərrüfat',
                    'description' => 'İnventarizasiya və resurs idarəetməsi',
                    'functional_scope' => 'İnventar idarəetməsi, saxlama işləri, resurs optimallaşdırılması',
                    'capacity' => 4,
                    'metadata' => [
                        'inventory_management' => true,
                        'resource_optimization' => true
                    ]
                ],
                [
                    'name' => 'Psixoloji Dəstək Şöbəsi',
                    'short_name' => 'Psixoloq',
                    'department_type' => 'psixoloq',
                    'description' => 'Şagird qayğısı və psixoloji dəstək',
                    'functional_scope' => 'Şagird rifahı, məsləhət xidmətləri, inkişaf hesabatları',
                    'capacity' => 2,
                    'metadata' => [
                        'student_support' => true,
                        'counseling_services' => true
                    ]
                ],
                [
                    'name' => 'Fənn Müəllimləri Şöbəsi',
                    'short_name' => 'Müəllim',
                    'department_type' => 'müəllim',
                    'description' => 'Fənn müəllimləri və akademik heyət',
                    'functional_scope' => 'Təhsil keyfiyyəti, fənn tədriyi, akademik inkişaf',
                    'capacity' => 25,
                    'metadata' => [
                        'teaching_responsibility' => true,
                        'subject_expertise' => true,
                        'academic_development' => true
                    ]
                ]
            ];

            foreach ($departments as $deptData) {
                Department::create(array_merge($deptData, [
                    'institution_id' => $institution->id,
                    'is_active' => true
                ]));
            }
        }
    }
}