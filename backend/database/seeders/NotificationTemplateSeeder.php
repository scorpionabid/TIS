<?php

namespace Database\Seeders;

use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        $templates = [
            [
                'key' => 'task_assigned',
                'name' => 'Task Assigned',
                'type' => 'task_assigned',
                'subject_template' => 'Yeni tapşırıq təyin edildi: {task_title}',
                'title_template' => 'Yeni tapşırıq',
                'message_template' => '{creator_name} tərəfindən sizə "{task_title}" tapşırığı təyin edildi. Kateqoriya: {task_category}. Son tarix: {deadline}',
                'email_template' => 'Hörmətli {user_name},

Sizə yeni tapşırıq təyin edildi:

Tapşırıq: {task_title}
Kateqoriya: {task_category}
Təyin edən: {creator_name}
Son tarix: {deadline}

Tapşırığı görüntüləmək üçün sistemə daxil olun.

Hörmətlə,
ATİS Sistemi',
                'sms_template' => 'Yeni tapşırıq: {task_title}. Son tarix: {deadline}. ATİS',
                'channels' => ['in_app', 'email', 'sms'],
                'priority' => 'normal',
                'available_variables' => [
                    'task_title', 'task_category', 'creator_name', 'deadline', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'New task assigned: {task_title}',
                        'title_template' => 'New Task',
                        'message_template' => 'You have been assigned a new task "{task_title}" by {creator_name}. Category: {task_category}. Deadline: {deadline}',
                        'email_template' => 'Dear {user_name},

You have been assigned a new task:

Task: {task_title}
Category: {task_category}
Assigned by: {creator_name}
Deadline: {deadline}

Please log into the system to view the task.

Best regards,
ATIS System',
                        'sms_template' => 'New task: {task_title}. Deadline: {deadline}. ATIS'
                    ],
                    'ru' => [
                        'subject_template' => 'Новая задача назначена: {task_title}',
                        'title_template' => 'Новая задача',
                        'message_template' => 'Вам назначена новая задача "{task_title}" пользователем {creator_name}. Категория: {task_category}. Срок: {deadline}',
                        'email_template' => 'Уважаемый {user_name},

Вам назначена новая задача:

Задача: {task_title}
Категория: {task_category}
Назначил: {creator_name}
Срок: {deadline}

Войдите в систему для просмотра задачи.

С уважением,
Система АТИС',
                        'sms_template' => 'Новая задача: {task_title}. Срок: {deadline}. АТИС'
                    ]
                ]
            ],
            [
                'key' => 'task_deadline',
                'name' => 'Task Deadline Warning',
                'type' => 'task_deadline',
                'subject_template' => 'Tapşırıq müddəti yaxınlaşır: {task_title}',
                'title_template' => 'Müddət xatırlatması',
                'message_template' => '"{task_title}" tapşırığının son tarixi yaxınlaşır. Qalan vaxt: {hours_remaining} saat. Son tarix: {deadline}',
                'email_template' => 'Hörmətli {user_name},

Tapşırığınızın son tarixi yaxınlaşır:

Tapşırıq: {task_title}
Son tarix: {deadline}
Qalan vaxt: {hours_remaining} saat

Zəhmət olmasa, tapşırığı vaxtında tamamlayın.

Hörmətlə,
ATİS Sistemi',
                'sms_template' => 'Xatırlatma: {task_title} - Son tarix {deadline}. ATİS',
                'channels' => ['in_app', 'email', 'sms'],
                'priority' => 'high',
                'available_variables' => [
                    'task_title', 'deadline', 'hours_remaining', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'Task deadline approaching: {task_title}',
                        'title_template' => 'Deadline Reminder',
                        'message_template' => 'The deadline for task "{task_title}" is approaching. Time remaining: {hours_remaining} hours. Deadline: {deadline}',
                        'email_template' => 'Dear {user_name},

Your task deadline is approaching:

Task: {task_title}
Deadline: {deadline}
Time remaining: {hours_remaining} hours

Please complete the task on time.

Best regards,
ATIS System',
                        'sms_template' => 'Reminder: {task_title} - Deadline {deadline}. ATIS'
                    ]
                ]
            ],
            [
                'key' => 'survey_published',
                'name' => 'Survey Published',
                'type' => 'survey_published',
                'subject_template' => 'Yeni sorğu: {survey_title}',
                'title_template' => 'Yeni sorğu',
                'message_template' => '{creator_name} tərəfindən yeni sorğu dərc edildi: "{survey_title}". {survey_description}',
                'email_template' => 'Hörmətli {user_name},

Sizin üçün yeni sorğu mövcuddur:

Sorğu: {survey_title}
Təsvir: {survey_description}
Dərc edən: {creator_name}
Son tarix: {deadline}

Sorğuda iştirak etmək üçün sistemə daxil olun.

Hörmətlə,
ATİS Sistemi',
                'sms_template' => 'Yeni sorğu: {survey_title}. Son tarix: {deadline}. ATİS',
                'channels' => ['in_app', 'email'],
                'priority' => 'normal',
                'available_variables' => [
                    'survey_title', 'survey_description', 'creator_name', 'deadline', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'New survey: {survey_title}',
                        'title_template' => 'New Survey',
                        'message_template' => 'A new survey has been published by {creator_name}: "{survey_title}". {survey_description}',
                        'email_template' => 'Dear {user_name},

A new survey is available for you:

Survey: {survey_title}
Description: {survey_description}
Published by: {creator_name}
Deadline: {deadline}

Please log into the system to participate in the survey.

Best regards,
ATIS System'
                    ]
                ]
            ],
            [
                'key' => 'survey_approved',
                'name' => 'Survey Response Approved',
                'type' => 'survey_approved',
                'subject_template' => 'Sorğu cavabınız təsdiqləndi',
                'title_template' => 'Cavab təsdiqləndi',
                'message_template' => '"{survey_title}" sorğusuna verdiyiniz cavab təsdiqləndi.',
                'email_template' => 'Hörmətli {user_name},

"{survey_title}" sorğusuna verdiyiniz cavab rəsmi olaraq təsdiqləndi.

Təşəkkür edirik.

Hörmətlə,
ATİS Sistemi',
                'channels' => ['in_app', 'email'],
                'priority' => 'normal',
                'available_variables' => ['survey_title', 'user_name']
            ],
            [
                'key' => 'survey_assigned',
                'name' => 'Survey Assigned',
                'type' => 'survey_assigned',
                'subject_template' => 'Sizə sorğu təyin edildi: {survey_title}',
                'title_template' => 'Yeni sorğu tapşırığı',
                'message_template' => '{creator_name} tərəfindən sizə "{survey_title}" sorğusu təyin edildi. {survey_description} Son tarix: {deadline}',
                'email_template' => 'Hörmətli {user_name},

Sizə yeni sorğu təyin edildi:

Sorğu: {survey_title}
Təsvir: {survey_description}
Təyin edən: {creator_name}
Son tarix: {deadline}

Sorğunu tamamlamaq üçün sistemə daxil olun.

Hörmətlə,
ATİS Sistemi',
                'sms_template' => 'Yeni sorğu təyin edildi: {survey_title}. Son tarix: {deadline}. ATİS',
                'channels' => ['in_app', 'email', 'sms'],
                'priority' => 'normal',
                'available_variables' => [
                    'survey_title', 'survey_description', 'creator_name', 'deadline', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'Survey assigned to you: {survey_title}',
                        'title_template' => 'New Survey Assignment',
                        'message_template' => 'You have been assigned the survey "{survey_title}" by {creator_name}. {survey_description} Deadline: {deadline}',
                        'email_template' => 'Dear {user_name},

You have been assigned a new survey:

Survey: {survey_title}
Description: {survey_description}
Assigned by: {creator_name}
Deadline: {deadline}

Please log into the system to complete the survey.

Best regards,
ATIS System',
                        'sms_template' => 'New survey assigned: {survey_title}. Deadline: {deadline}. ATIS'
                    ]
                ]
            ],
            [
                'key' => 'link_shared',
                'name' => 'Link Shared',
                'type' => 'link_shared',
                'subject_template' => 'Sizə link paylaşıldı: {link_title}',
                'title_template' => 'Yeni link',
                'message_template' => '{creator_name} sizə "{link_title}" linkini paylaşdı. Təsvir: {link_description}',
                'email_template' => 'Hörmətli {user_name},

Sizə yeni link paylaşıldı:

Başlıq: {link_title}
Təsvir: {link_description}
Paylaşan: {creator_name}
Link: {link_url}

Linka daxil olmaq üçün sistemə daxil olun.

Hörmətlə,
ATİS Sistemi',
                'channels' => ['in_app', 'email'],
                'priority' => 'normal',
                'available_variables' => [
                    'link_title', 'link_description', 'creator_name', 'link_url', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'Link shared with you: {link_title}',
                        'title_template' => 'New Link',
                        'message_template' => '{creator_name} shared the link "{link_title}" with you. Description: {link_description}',
                        'email_template' => 'Dear {user_name},

A new link has been shared with you:

Title: {link_title}
Description: {link_description}
Shared by: {creator_name}
Link: {link_url}

Please log into the system to access the link.

Best regards,
ATIS System'
                    ]
                ]
            ],
            [
                'key' => 'document_shared',
                'name' => 'Document Shared',
                'type' => 'document_shared',
                'subject_template' => 'Sizə sənəd paylaşıldı: {document_title}',
                'title_template' => 'Yeni sənəd',
                'message_template' => '{creator_name} sizə "{document_title}" sənədini paylaşdı. Qeyd: {share_message}',
                'email_template' => 'Hörmətli {user_name},

Sizə yeni sənəd paylaşıldı:

Sənəd: {document_title}
Paylaşan: {creator_name}
Qeyd: {share_message}

Sənədə baxmaq üçün sistemə daxil olun.

Hörmətlə,
ATİS Sistemi',
                'channels' => ['in_app', 'email'],
                'priority' => 'normal',
                'available_variables' => [
                    'document_title', 'creator_name', 'share_message', 'user_name'
                ],
                'translations' => [
                    'en' => [
                        'subject_template' => 'Document shared with you: {document_title}',
                        'title_template' => 'New Document',
                        'message_template' => '{creator_name} shared the document "{document_title}" with you. Note: {share_message}',
                        'email_template' => 'Dear {user_name},

A new document has been shared with you:

Document: {document_title}
Shared by: {creator_name}
Note: {share_message}

Please log into the system to view the document.

Best regards,
ATIS System'
                    ]
                ]
            ],
            [
                'key' => 'system_alert',
                'name' => 'System Alert',
                'type' => 'system_alert',
                'subject_template' => 'Sistem bildirişi: {title}',
                'title_template' => 'Sistem bildirişi',
                'message_template' => '{message}',
                'email_template' => 'Hörmətli {user_name},

Sistem bildirişi:

{message}

{sender_name}
ATİS Sistemi',
                'sms_template' => 'Sistem bildirişi: {message}. ATİS',
                'channels' => ['in_app', 'email', 'sms'],
                'priority' => 'high',
                'available_variables' => ['title', 'message', 'sender_name', 'user_name']
            ],
            [
                'key' => 'maintenance',
                'name' => 'System Maintenance',
                'type' => 'maintenance',
                'subject_template' => 'Sistem təmiri bildirişi',
                'title_template' => 'Sistem təmiri',
                'message_template' => 'Sistem təmiri planlaşdırılır. Tarix: {maintenance_date}. Müddət: {duration}',
                'email_template' => 'Hörmətli {user_name},

Sistem təmiri haqqında məlumat:

Tarix: {maintenance_date}
Müddət: {duration}
Təsvir: {message}

Bu müddət ərzində sistemə giriş mümkün olmayacaq.

Hörmətlə,
ATİS Sistemi',
                'channels' => ['in_app', 'email'],
                'priority' => 'normal',
                'available_variables' => ['maintenance_date', 'duration', 'message', 'user_name']
            ]
        ];

        foreach ($templates as $template) {
            NotificationTemplate::updateOrCreate(
                ['key' => $template['key']],
                $template
            );
        }

        $this->command->info('Notification templates seeded successfully!');
    }
}