<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\NotificationTemplate;

class EnhancedNotificationTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            // Enhanced Task Deadline Templates
            [
                'key' => 'task_deadline_3_days',
                'name' => 'Tapşırıq 3 Gün Qalıb',
                'type' => 'task_deadline_3_days',
                'priority' => 'medium',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'Tapşırıq Xəbərdarlığı: {{task_title}}',
                'title_template' => '⏰ Tapşırıq Xəbərdarlığı: {{task_title}}',
                'message_template' => '{{creator_name}} tərəfindən təyin edilmiş "{{task_title}}" tapşırığının son müddəti 3 gün qalıb!

🏢 Müəssisə: {{creator_institution}}
📋 Kateqoriya: {{category_label}}
⚡ Prioritet: {{priority_label}}
📅 Son Tarix: {{deadline_formatted}}
🚨 Qalan Müddət: {{deadline_text}}

📝 Təsvir: {{description}}

Bu tapşırığı vaxtında tamamlamaq üçün dərhal fəaliyyətə başlayın.',
                'is_active' => true
            ],

            [
                'key' => 'task_deadline_1_day',
                'name' => 'Tapşırıq 1 Gün Qalıb',
                'type' => 'task_deadline_1_day',
                'priority' => 'high',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'TƏCİLİ: {{task_title}} - 1 gün qalıb!',
                'title_template' => '🚨 TƏCİLİ: {{task_title}} - 1 gün qalıb!',
                'message_template' => '⚠️ DİQQƏT! {{creator_name}} tərəfindən təyin edilmiş "{{task_title}}" tapşırığının son müddəti sabah bitir!

🏢 Müəssisə: {{creator_institution}}
📋 Kateqoriya: {{category_label}}
⚡ Prioritet: {{priority_label}}
📅 Son Tarix: {{deadline_formatted}}
🚨 QALAN MÜDDƏT: {{deadline_text}}

📝 Təsvir: {{description}}

🔥 Bu tapşırığı bu gün tamamlamağınızı tövsiyə edirik!',
                'is_active' => true
            ],

            [
                'key' => 'task_deadline_today',
                'name' => 'Tapşırıq Bu Gün Bitir',
                'type' => 'task_deadline_today',
                'priority' => 'urgent',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'SON FÜRSƏT: {{task_title}}',
                'title_template' => '🔥 SON FÜRSƏT: {{task_title}}',
                'message_template' => '🚨 SON FÜRSƏT! "{{task_title}}" tapşırığının son müddəti BU GÜN bitir!

🏢 Müəssisə: {{creator_institution}}
📋 Kateqoriya: {{category_label}}
⚡ Prioritet: {{priority_label}}
📅 Son Tarix: {{deadline_formatted}}
🔥 STATUSU: {{deadline_text}}

📝 Təsvir: {{description}}

⚠️ Bu tapşırığı bu gün tamamlamasanız, müddət keçəcək!',
                'is_active' => true
            ],

            [
                'key' => 'task_overdue',
                'name' => 'Tapşırıq Müddət Keçib',
                'type' => 'task_overdue',
                'priority' => 'urgent',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'MÜDDƏT KEÇİB: {{task_title}}',
                'title_template' => '🛑 MÜDDƏT KEÇİB: {{task_title}}',
                'message_template' => '🛑 MÜDDƏT KEÇİB! "{{task_title}}" tapşırığının son müddəti keçmişdir!

🏢 Müəssisə: {{creator_institution}}
📋 Kateqoriya: {{category_label}}
⚡ Prioritet: {{priority_label}}
📅 Son Tarix: {{deadline_formatted}}
❌ STATUS: {{deadline_text}}

📝 Təsvir: {{description}}

⚠️ Zəhmət olmasa bu tapşırığı tez bir zamanda tamamlayın və izahat verin.',
                'is_active' => true
            ],

            // Enhanced Survey Deadline Templates
            [
                'key' => 'survey_deadline_3_days',
                'name' => 'Sorğu 3 Gün Qalıb',
                'type' => 'survey_deadline_3_days',
                'priority' => 'medium',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'Sorğu Xəbərdarlığı: {{survey_title}}',
                'title_template' => '📊 Sorğu Xəbərdarlığı: {{survey_title}}',
                'message_template' => '"{{survey_title}}" sorğusunun son müddəti 3 gün qalıb!

📝 Sorğu: {{survey_title}}
📅 Son Tarix: {{deadline_formatted}}
⏰ Qalan Müddət: {{deadline_text}}

📋 Təsvir: {{survey_description}}

Zəhmət olmasa sorğunu 3 gün ərzində tamamlayın.',
                'is_active' => true
            ],

            [
                'key' => 'survey_deadline_1_day',
                'name' => 'Sorğu 1 Gün Qalıb',
                'type' => 'survey_deadline_1_day',
                'priority' => 'high',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'TƏCİLİ: {{survey_title}} - 1 gün qalıb!',
                'title_template' => '🚨 TƏCİLİ: {{survey_title}} - 1 gün qalıb!',
                'message_template' => '⚠️ DİQQƏT! "{{survey_title}}" sorğusunun son müddəti sabah bitir!

📝 Sorğu: {{survey_title}}
📅 Son Tarix: {{deadline_formatted}}
🚨 QALAN MÜDDƏT: {{deadline_text}}

📋 Təsvir: {{survey_description}}

🔥 Bu sorğunu bu gün cavablamağınızı tövsiyə edirik!',
                'is_active' => true
            ],

            [
                'key' => 'survey_deadline_today',
                'name' => 'Sorğu Bu Gün Bitir',
                'type' => 'survey_deadline_today',
                'priority' => 'urgent',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'SON FÜRSƏT: {{survey_title}}',
                'title_template' => '🔥 SON FÜRSƏT: {{survey_title}}',
                'message_template' => '🚨 SON FÜRSƏT! "{{survey_title}}" sorğusunun son müddəti BU GÜN bitir!

📝 Sorğu: {{survey_title}}
📅 Son Tarix: {{deadline_formatted}}
🔥 STATUS: {{deadline_text}}

📋 Təsvir: {{survey_description}}

⚠️ Bu sorğunu bu gün cavablamasanız, müddət keçəcək!',
                'is_active' => true
            ],

            [
                'key' => 'survey_overdue',
                'name' => 'Sorğu Müddət Keçib',
                'type' => 'survey_overdue',
                'priority' => 'urgent',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'MÜDDƏT KEÇİB: {{survey_title}}',
                'title_template' => '🛑 MÜDDƏT KEÇİB: {{survey_title}}',
                'message_template' => '🛑 MÜDDƏT KEÇİB! "{{survey_title}}" sorğusunun son müddəti keçmişdir!

📝 Sorğu: {{survey_title}}
📅 Son Tarix: {{deadline_formatted}}
❌ STATUS: {{deadline_text}}

📋 Təsvir: {{survey_description}}

⚠️ Mümkün olduqca tez bu sorğunu tamamlayın.',
                'is_active' => true
            ],

            // Enhanced Document Notification Template
            [
                'key' => 'document_uploaded',
                'name' => 'Sənəd Yükləndi',
                'type' => 'document_uploaded',
                'priority' => 'normal',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'Yeni Sənəd: {{document_title}}',
                'title_template' => '📄 Yeni Sənəd: {{document_title}}',
                'message_template' => '{{creator_name}} ({{creator_institution}}) tərəfindən yeni sənəd paylaşıldı!

📄 Sənəd: {{document_title}}
📂 Növü: {{document_type}}
📊 Ölçü: {{file_size}}
🏢 Müəssisə: {{creator_institution}}

💬 Mesaj: {{share_message}}

Bu sənədi görüntüləmək və yükləmək üçün aşağıdakı keçidə klikləyin.',
                'is_active' => true
            ],

            // Enhanced Link Notification Template
            [
                'key' => 'link_created',
                'name' => 'Bağlantı Yaradıldı',
                'type' => 'link_created',
                'priority' => 'normal',
                'channels' => ['in_app', 'email'],
                'subject_template' => 'Yeni Bağlantı: {{link_title}}',
                'title_template' => '🔗 Yeni Bağlantı: {{link_title}}',
                'message_template' => '{{creator_name}} ({{creator_institution}}) tərəfindən yeni bağlantı paylaşıldı!

🔗 Başlıq: {{link_title}}
🌐 Növü: {{link_type}}
🎯 Sahə: {{share_scope}}
🏢 Müəssisə: {{creator_institution}}
{{#expires_at}}⏰ Bitmə tarixi: {{expires_at}}{{/expires_at}}

📝 Təsvir: {{description}}

Bu bağlantıya daxil olmaq üçün aşağıdakı düyməni istifadə edin.',
                'is_active' => true
            ]
        ];

        foreach ($templates as $template) {
            NotificationTemplate::updateOrCreate(
                ['key' => $template['key']],
                $template
            );
        }

        $this->command->info('Enhanced notification templates created successfully!');
    }
}
