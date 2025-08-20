<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Notification;
use App\Models\NotificationTemplate;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $admin;
    protected User $user;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->institution = Institution::factory()->create();
        
        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->admin->assignRole('SchoolAdmin');
        
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->user->assignRole('Müəllim');
    }

    public function test_can_list_notifications()
    {
        $this->actingAs($this->user, 'sanctum');

        Notification::factory()->count(3)->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/notifications');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'message',
                            'type',
                            'priority',
                            'is_read',
                            'created_at',
                        ]
                    ]
                ]);
    }

    public function test_can_get_unread_notifications()
    {
        $this->actingAs($this->user, 'sanctum');

        Notification::factory()->count(2)->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => false,
        ]);

        Notification::factory()->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => true,
        ]);

        $response = $this->getJson('/api/notifications/unread');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'message',
                            'type',
                            'is_read',
                        ]
                    ]
                ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_can_mark_notification_as_read()
    {
        $this->actingAs($this->user, 'sanctum');

        $notification = Notification::factory()->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => false,
        ]);

        $response = $this->putJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function test_can_mark_all_notifications_as_read()
    {
        $this->actingAs($this->user, 'sanctum');

        Notification::factory()->count(3)->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => false,
        ]);

        $response = $this->putJson('/api/notifications/mark-all-read');

        $response->assertStatus(200);

        $this->assertDatabaseMissing('notifications', [
            'recipient_id' => $this->user->id,
            'is_read' => false,
        ]);
    }

    public function test_admin_can_send_notification()
    {
        $this->actingAs($this->admin, 'sanctum');

        $notificationData = [
            'title' => 'Important Meeting',
            'message' => 'Please attend the faculty meeting tomorrow at 2 PM.',
            'type' => 'meeting',
            'priority' => 'high',
            'recipient_ids' => [$this->user->id],
            'scheduled_at' => now()->addHour()->format('Y-m-d H:i:s'),
            'expires_at' => now()->addWeek()->format('Y-m-d H:i:s'),
        ];

        $response = $this->postJson('/api/notifications/send', $notificationData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'notification_id',
                        'sent_count',
                        'recipients',
                    ]
                ]);

        $this->assertDatabaseHas('notifications', [
            'title' => $notificationData['title'],
            'recipient_id' => $this->user->id,
            'sender_id' => $this->admin->id,
            'type' => 'meeting',
        ]);
    }

    public function test_admin_can_send_bulk_notification()
    {
        $this->actingAs($this->admin, 'sanctum');

        $recipients = User::factory()->count(3)->create([
            'institution_id' => $this->institution->id,
        ]);
        
        foreach ($recipients as $recipient) {
            $recipient->assignRole('Müəllim');
        }

        $bulkData = [
            'title' => 'System Maintenance',
            'message' => 'System will be down for maintenance on Sunday.',
            'type' => 'system',
            'priority' => 'medium',
            'target_roles' => ['Müəllim'],
            'target_institutions' => [$this->institution->id],
        ];

        $response = $this->postJson('/api/notifications/bulk-send', $bulkData);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'sent_count',
                        'target_users_count',
                        'notification_ids',
                    ]
                ]);

        foreach ($recipients as $recipient) {
            $this->assertDatabaseHas('notifications', [
                'title' => $bulkData['title'],
                'recipient_id' => $recipient->id,
                'sender_id' => $this->admin->id,
            ]);
        }
    }

    public function test_can_delete_notification()
    {
        $this->actingAs($this->user, 'sanctum');

        $notification = Notification::factory()->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->deleteJson("/api/notifications/{$notification->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('notifications', ['id' => $notification->id]);
    }

    public function test_can_get_notification_statistics()
    {
        $this->actingAs($this->user, 'sanctum');

        Notification::factory()->count(5)->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => true,
        ]);

        Notification::factory()->count(3)->create([
            'recipient_id' => $this->user->id,
            'institution_id' => $this->institution->id,
            'is_read' => false,
        ]);

        $response = $this->getJson('/api/notifications/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'total_notifications',
                        'unread_count',
                        'read_count',
                        'today_count',
                        'this_week_count',
                        'by_type',
                        'by_priority',
                    ]
                ]);
    }

    public function test_admin_can_manage_notification_templates()
    {
        $this->actingAs($this->admin, 'sanctum');

        $templateData = [
            'name' => 'Task Assignment',
            'subject' => 'New Task Assigned',
            'template' => 'Hello {recipient_name}, you have been assigned a new task: {task_title}',
            'type' => 'task',
            'variables' => ['recipient_name', 'task_title'],
            'is_active' => true,
        ];

        $response = $this->postJson('/api/notifications/templates', $templateData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'name',
                        'subject',
                        'template',
                        'type',
                        'variables',
                    ]
                ]);

        $this->assertDatabaseHas('notification_templates', [
            'name' => $templateData['name'],
            'type' => 'task',
            'institution_id' => $this->institution->id,
        ]);
    }

    public function test_can_use_notification_template()
    {
        $this->actingAs($this->admin, 'sanctum');

        $template = NotificationTemplate::factory()->create([
            'institution_id' => $this->institution->id,
            'template' => 'Hello {recipient_name}, you have a new task: {task_title}',
            'subject' => 'New Task: {task_title}',
            'variables' => ['recipient_name', 'task_title'],
        ]);

        $templateData = [
            'template_id' => $template->id,
            'recipient_ids' => [$this->user->id],
            'variables' => [
                'recipient_name' => $this->user->username,
                'task_title' => 'Monthly Report Preparation',
            ],
        ];

        $response = $this->postJson('/api/notifications/send-from-template', $templateData);

        $response->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $this->user->id,
            'title' => 'New Task: Monthly Report Preparation',
            'message' => "Hello {$this->user->username}, you have a new task: Monthly Report Preparation",
        ]);
    }

    public function test_cannot_access_other_user_notifications()
    {
        $this->actingAs($this->user, 'sanctum');

        $otherUser = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);

        $otherNotification = Notification::factory()->create([
            'recipient_id' => $otherUser->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson("/api/notifications/{$otherNotification->id}");

        $response->assertStatus(403);
    }

    public function test_validates_notification_sending_data()
    {
        $this->actingAs($this->admin, 'sanctum');

        $invalidData = [
            'title' => '', // Required
            'message' => '', // Required
            'type' => 'invalid-type',
            'priority' => 'invalid-priority',
            'recipient_ids' => [99999], // Non-existent user
        ];

        $response = $this->postJson('/api/notifications/send', $invalidData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['title', 'message', 'type', 'priority', 'recipient_ids.0']);
    }

    public function test_requires_authentication()
    {
        $response = $this->getJson('/api/notifications');
        $response->assertStatus(401);
    }

    public function test_teacher_cannot_send_notifications()
    {
        $this->actingAs($this->user, 'sanctum'); // Regular teacher

        $notificationData = [
            'title' => 'Test Notification',
            'message' => 'This should not be allowed',
            'type' => 'general',
            'recipient_ids' => [$this->admin->id],
        ];

        $response = $this->postJson('/api/notifications/send', $notificationData);

        $response->assertStatus(403);
    }
}