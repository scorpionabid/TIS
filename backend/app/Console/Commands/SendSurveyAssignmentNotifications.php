<?php

namespace App\Console\Commands;

use App\Models\Survey;
use App\Models\User;
use App\Notifications\SurveyApprovalNotification;
use Illuminate\Console\Command;

/**
 * Send retrospective notifications for already published surveys
 * Bu command köhnə published surveys üçün notification yaradır
 */
class SendSurveyAssignmentNotifications extends Command
{
    protected $signature = 'surveys:send-assignment-notifications 
                           {--survey-id= : Specific survey ID to send notifications for}
                           {--dry-run : Show what would be done without actually sending}';

    protected $description = 'Send assignment notifications for published surveys that haven\'t sent notifications yet';

    public function handle()
    {
        $surveyId = $this->option('survey-id');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - No notifications will be sent');
        }

        // Get published surveys
        $query = Survey::where('status', 'published')
            ->whereNotNull('target_institutions')
            ->with(['creator']);

        if ($surveyId) {
            $query->where('id', $surveyId);
        }

        $surveys = $query->get();

        if ($surveys->isEmpty()) {
            $this->warn('No published surveys found with target institutions');
            return;
        }

        $this->info("Found {$surveys->count()} published survey(s) to process");

        $totalNotificationsSent = 0;

        foreach ($surveys as $survey) {
            $this->info("\n📋 Processing Survey: {$survey->title} (ID: {$survey->id})");
            
            $targetInstitutions = $survey->target_institutions ?? [];
            
            if (empty($targetInstitutions)) {
                $this->warn("  ⚠️  No target institutions found");
                continue;
            }

            $this->info("  🎯 Target institutions: " . implode(', ', $targetInstitutions));

            // Get users from target institutions
            $usersToNotify = User::whereIn('institution_id', $targetInstitutions)
                ->whereHas('roles', function($query) {
                    $query->whereIn('name', ['schooladmin', 'teacher', 'sektoradmin']); 
                })
                ->with(['institution', 'roles'])
                ->get();

            if ($usersToNotify->isEmpty()) {
                $this->warn("  ⚠️  No users found in target institutions");
                continue;
            }

            $this->info("  👥 Users to notify: {$usersToNotify->count()}");

            foreach ($usersToNotify as $user) {
                $roles = $user->roles->pluck('name')->join(', ');
                
                if ($dryRun) {
                    $institutionName = $user->institution ? $user->institution->name : 'N/A';
                    $this->line("    📧 Would notify: {$user->name} ({$user->email}) - {$roles} - {$institutionName}");
                } else {
                    try {
                        // Create mock approval request for notification system compatibility
                        $mockApprovalRequest = (object) [
                            'id' => null,
                            'priority' => 'normal',
                            'deadline' => $survey->end_date,
                            'institution' => $user->institution,
                            'submitter' => $survey->creator,
                        ];

                        $institutionName = $user->institution ? $user->institution->name : '';
                        $creatorName = $survey->creator ? $survey->creator->name : 'Sistem';
                        $deadline = $survey->end_date ? $survey->end_date->toISOString() : null;
                        
                        $additionalData = [
                            'survey_id' => $survey->id,
                            'survey_title' => $survey->title,
                            'survey_category' => $survey->survey_type ?? 'general',
                            'institution_name' => $institutionName,
                            'assigned_by' => $creatorName,
                            'deadline' => $deadline,
                            'priority' => $survey->priority ?? 'normal',
                        ];

                        // Send notification
                        $user->notify(new SurveyApprovalNotification($mockApprovalRequest, 'survey_assigned', $additionalData));
                        
                        $institutionDisplayName = $user->institution ? $user->institution->name : 'N/A';
                        $this->info("    ✅ Notified: {$user->name} ({$user->email}) - {$roles} - {$institutionDisplayName}");
                        $totalNotificationsSent++;
                        
                    } catch (\Exception $e) {
                        $this->error("    ❌ Failed to notify {$user->name}: " . $e->getMessage());
                    }
                }
            }
        }

        if ($dryRun) {
            $this->info("\n🔍 DRY RUN COMPLETE");
            $this->info("Would have sent {$this->countPotentialNotifications($surveys)} notifications");
        } else {
            $this->info("\n✅ NOTIFICATIONS SENT");
            $this->info("Successfully sent {$totalNotificationsSent} notifications");
        }
    }

    private function countPotentialNotifications($surveys)
    {
        $count = 0;
        foreach ($surveys as $survey) {
            $targetInstitutions = $survey->target_institutions ?? [];
            if (!empty($targetInstitutions)) {
                $count += User::whereIn('institution_id', $targetInstitutions)
                    ->whereHas('roles', function($query) {
                        $query->whereIn('name', ['schooladmin', 'teacher', 'sektoradmin']); 
                    })
                    ->count();
            }
        }
        return $count;
    }
}