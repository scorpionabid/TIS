<?php

namespace Database\Seeders;

use App\Models\ApprovalTemplate;
use Illuminate\Database\Seeder;

class ApprovalTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            // Survey Templates
            [
                'name' => 'Adi Sorğu Təsdiqi',
                'template_type' => 'survey',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                    ['level' => 2, 'role' => 'regionadmin', 'required' => false, 'title' => 'Regional Təsdiq'],
                ],
                'template_config' => [
                    'auto_approve_after' => null,
                    'require_all_levels' => false,
                    'allow_delegation' => true,
                    'estimated_hours' => 24,
                    'priority' => 'medium',
                ],
                'description' => 'Məktəb sorğularının adi təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Təcili Sorğu Təsdiqi',
                'template_type' => 'survey',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'regionadmin', 'required' => true, 'title' => 'Təcili Regional Təsdiq'],
                ],
                'template_config' => [
                    'auto_approve_after' => '4_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => true,
                    'estimated_hours' => 4,
                    'priority' => 'high',
                ],
                'description' => 'Təcili sorğuların sürətli təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Document Templates
            [
                'name' => 'Sənəd Təsdiqi',
                'template_type' => 'document',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                    ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                ],
                'template_config' => [
                    'auto_approve_after' => '72_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => true,
                    'estimated_hours' => 48,
                    'priority' => 'medium',
                ],
                'description' => 'Rəsmi sənədlərin təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Task Templates
            [
                'name' => 'Tapşırıq Tamamlanma Təsdiqi',
                'template_type' => 'task',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                    ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Yoxlaması'],
                ],
                'template_config' => [
                    'auto_approve_after' => '48_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => false,
                    'estimated_hours' => 24,
                    'priority' => 'medium',
                ],
                'description' => 'Tapşırıq tamamlanmasının təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Assessment Templates
            [
                'name' => 'Qiymətləndirmə Təsdiqi',
                'template_type' => 'assessment',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Yoxlaması'],
                    ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                    ['level' => 3, 'role' => 'regionadmin', 'required' => false, 'title' => 'Regional Təsdiq'],
                ],
                'template_config' => [
                    'auto_approve_after' => '96_hours',
                    'require_all_levels' => false,
                    'allow_delegation' => true,
                    'estimated_hours' => 72,
                    'priority' => 'high',
                ],
                'description' => 'Qiymətləndirmə nəticələrinin təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Schedule Templates
            [
                'name' => 'Cədvəl Təsdiqi',
                'template_type' => 'schedule',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                    ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                ],
                'template_config' => [
                    'auto_approve_after' => '48_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => true,
                    'estimated_hours' => 24,
                    'priority' => 'medium',
                ],
                'description' => 'Dərs cədvəllərinin təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Report Templates
            [
                'name' => 'Aylıq Hesabat Təsdiqi',
                'template_type' => 'report',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Yoxlaması'],
                    ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                    ['level' => 3, 'role' => 'regionadmin', 'required' => true, 'title' => 'Regional Final Təsdiq'],
                ],
                'template_config' => [
                    'auto_approve_after' => '120_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => false,
                    'estimated_hours' => 96,
                    'priority' => 'high',
                ],
                'description' => 'Aylıq hesabatların təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],

            // Attendance Templates
            [
                'name' => 'Davamiyyət Təsdiqi',
                'template_type' => 'attendance',
                'default_approval_chain' => [
                    ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                ],
                'template_config' => [
                    'auto_approve_after' => '24_hours',
                    'require_all_levels' => true,
                    'allow_delegation' => true,
                    'estimated_hours' => 12,
                    'priority' => 'low',
                ],
                'description' => 'Davamiyyət məlumatlarının təsdiq prosesi',
                'is_system_template' => true,
                'is_active' => true,
            ],
        ];

        foreach ($templates as $template) {
            ApprovalTemplate::firstOrCreate(
                [
                    'name' => $template['name'],
                    'template_type' => $template['template_type'],
                ],
                $template
            );
        }
    }
}
