<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ApprovalWorkflow;
use App\Models\DataApprovalRequest;
use App\Models\User;
use App\Models\Institution;

class ApprovalDemoSeeder extends Seeder
{
    public function run(): void
    {
        // Get a user to be the creator
        $creator = User::first();
        if (!$creator) {
            $this->command->warn('No users found for creating workflows');
            return;
        }

        // Create some demo approval workflows
        $surveyWorkflow = ApprovalWorkflow::create([
            'name' => 'Adi Sorğu Təsdiqi',
            'workflow_type' => 'survey',
            'status' => 'active',
            'approval_chain' => [
                ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi'],
                ['level' => 3, 'role' => 'regionadmin', 'required' => false, 'title' => 'Regional Təsdiq']
            ],
            'workflow_config' => [
                'auto_approve_after' => null,
                'require_all_levels' => false,
                'allow_delegation' => true,
                'estimated_hours' => 24,
                'priority' => 'medium'
            ],
            'description' => 'Məktəb sorğularının adi təsdiq prosesi',
            'created_by' => $creator->id,
        ]);

        $documentWorkflow = ApprovalWorkflow::create([
            'name' => 'Sənəd Təsdiqi',
            'workflow_type' => 'document',
            'status' => 'active',
            'approval_chain' => [
                ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'Məktəb Təsdiqi'],
                ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sektor Təsdiqi']
            ],
            'workflow_config' => [
                'auto_approve_after' => '72_hours',
                'require_all_levels' => true,
                'allow_delegation' => true,
                'estimated_hours' => 48,
                'priority' => 'medium'
            ],
            'description' => 'Rəsmi sənədlərin təsdiq prosesi',
            'created_by' => $creator->id,
        ]);

        // Get some demo institutions and users
        $institution = Institution::first(); // Any institution
        $submitter = User::first(); // Any user

        if (!$institution || !$submitter) {
            $this->command->warn('No suitable institutions or users found for demo data');
            return;
        }

        // Create demo approval requests
        $demoRequests = [
            [
                'workflow_id' => $surveyWorkflow->id,
                'institution_id' => $institution->id,
                'approvalable_type' => 'App\\Models\\Survey',
                'approvalable_id' => 1,
                'submitted_by' => $submitter->id,
                'submitted_at' => now()->subDays(2),
                'current_status' => 'pending',
                'current_approval_level' => 1,
                'submission_notes' => 'Şagird davamiyyəti ilə bağlı sorğu təsdiqi tələb olunur',
                'deadline' => now()->addDays(7),
                'request_metadata' => [
                    'survey_title' => 'Şagird Davamiyyəti Sorğusu',
                    'target_count' => 150,
                    'estimated_duration' => '15 dəqiqə'
                ]
            ],
            [
                'workflow_id' => $documentWorkflow->id,
                'institution_id' => $institution->id,
                'approvalable_type' => 'App\\Models\\Document',
                'approvalable_id' => 1,
                'submitted_by' => $submitter->id,
                'submitted_at' => now()->subDays(1),
                'current_status' => 'pending',
                'current_approval_level' => 1,
                'submission_notes' => 'Aylıq hesabat sənədinin təsdiqi',
                'deadline' => now()->addDays(3),
                'request_metadata' => [
                    'document_type' => 'monthly_report',
                    'period' => '2024-01',
                    'file_size' => '2.5MB'
                ]
            ],
            [
                'workflow_id' => $surveyWorkflow->id,
                'institution_id' => $institution->id,
                'approvalable_type' => 'App\\Models\\Survey',
                'approvalable_id' => 2,
                'submitted_by' => $submitter->id,
                'submitted_at' => now()->subHours(6),
                'current_status' => 'pending',
                'current_approval_level' => 2,
                'submission_notes' => 'Müəllim performansı qiymətləndirməsi sorğusu',
                'deadline' => now()->addDays(10),
                'request_metadata' => [
                    'survey_title' => 'Müəllim Performans Qiymətləndirməsi',
                    'target_count' => 50,
                    'estimated_duration' => '20 dəqiqə'
                ]
            ],
            [
                'workflow_id' => $documentWorkflow->id,
                'institution_id' => $institution->id,
                'approvalable_type' => 'App\\Models\\Document',
                'approvalable_id' => 2,
                'submitted_by' => $submitter->id,
                'submitted_at' => now()->subDays(5),
                'current_status' => 'approved',
                'current_approval_level' => 2,
                'submission_notes' => 'Dərs cədvəli yeniləməsi',
                'deadline' => now()->addDays(1),
                'completed_at' => now()->subDays(1),
                'request_metadata' => [
                    'document_type' => 'schedule_update',
                    'term' => '2024-spring',
                    'classes_affected' => 12
                ]
            ],
            [
                'workflow_id' => $surveyWorkflow->id,
                'institution_id' => $institution->id,
                'approvalable_type' => 'App\\Models\\Survey',
                'approvalable_id' => 3,
                'submitted_by' => $submitter->id,
                'submitted_at' => now()->subDays(3),
                'current_status' => 'rejected',
                'current_approval_level' => 1,
                'submission_notes' => 'Valideyn məmnuniyyəti sorğusu',
                'deadline' => now()->addDays(14),
                'completed_at' => now()->subDays(1),
                'request_metadata' => [
                    'survey_title' => 'Valideyn Məmnuniyyəti',
                    'target_count' => 300,
                    'estimated_duration' => '10 dəqiqə'
                ]
            ]
        ];

        foreach ($demoRequests as $requestData) {
            DataApprovalRequest::create($requestData);
        }

        $this->command->info('Demo approval data created successfully!');
        $this->command->info("Created workflows: {$surveyWorkflow->name}, {$documentWorkflow->name}");
        $this->command->info('Created 5 demo approval requests with various statuses');
    }
}