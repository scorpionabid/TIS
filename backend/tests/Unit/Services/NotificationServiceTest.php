<?php

namespace Tests\Unit\Services;

use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $notificationService;
    protected $user;
    protected $template;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->notificationService = new NotificationService();
        
        // Create a test user
        $this->user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        
        // Ensure the notification template exists in the test database
        $this->template = NotificationTemplate::firstOrCreate(
            ['key' => 'test_notification'],
            [
                'name' => 'Test Notification',
                'type' => 'system_alert',
                'subject_template' => 'Test Subject: {{title}}',
                'title_template' => 'Test Title: {{title}}',
                'message_template' => 'Hello {{name}}! This is a test notification.',
                'email_template' => '<p>Hello {{name}}!</p><p>This is a test notification.</p>',
                'channels' => ['in_app', 'email'],
                'is_active' => true,
                'available_variables' => [
                    'name' => 'User\'s full name',
                    'title' => 'Notification title',
                    'message' => 'The main message content'
                ]
            ]
        );
        
        // Fake mail sending
        Mail::fake();
    }
    
    /** @test */
    public function it_creates_a_basic_notification()
    {
        $notificationData = [
            'user_id' => $this->user->id,
            'title' => 'Test Notification',
            'message' => 'This is a test notification',
            'type' => 'system_alert',
            'channel' => 'in_app',
        ];
        
        $notification = $this->notificationService->send($notificationData);
        
        $this->assertNotNull($notification);
        $this->assertInstanceOf(Notification::class, $notification);
        $this->assertEquals('Test Notification', $notification->title);
        $this->assertEquals($this->user->id, $notification->user_id);
    }
    
    /** @test */
    public function it_sends_notification_using_template()
    {
        $variables = [
            'name' => 'Test User',
            'title' => 'Welcome',
            'message' => 'Thank you for signing up!'
        ];
        
        $recipients = [
            'users' => [$this->user->id],
        ];
        
        $options = [
            'language' => 'en',
            'channels' => ['in_app'],
            'metadata' => ['test' => 'data'],
        ];
        
        $notifications = $this->notificationService->sendFromTemplate(
            'test_notification',
            $recipients,
            $variables,
            $options
        );
        
        $this->assertCount(1, $notifications);
        $notification = $notifications[0];
        
        $this->assertInstanceOf(Notification::class, $notification);
        $this->assertStringContainsString('Welcome', $notification->title);
        $this->assertStringContainsString('Test User', $notification->message);
        $this->assertEquals($this->user->id, $notification->user_id);
        $this->assertEquals('in_app', $notification->channel);
    }
    
    /** @test */
    public function it_handles_email_notification_channel()
    {
        $recipients = [
            'users' => [$this->user->id],
        ];
        
        $options = [
            'channels' => ['email'],
            'subject' => 'Test Email Notification',
        ];
        
        $notifications = $this->notificationService->sendFromTemplate(
            'test_notification',
            $recipients,
            [],
            $options
        );
        
        $this->assertCount(1, $notifications);
        
        // Assert that an email was queued to be sent to the user
        Mail::assertQueued(\App\Mail\NotificationEmail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });
    }
    
    /** @test */
    public function it_handles_scheduled_notifications()
    {
        $scheduledTime = now()->addDay();
        
        $notificationData = [
            'user_id' => $this->user->id,
            'title' => 'Scheduled Notification',
            'message' => 'This is a scheduled notification',
            'type' => 'system_alert',
            'channel' => 'in_app',
            'scheduled_at' => $scheduledTime,
        ];
        
        $notification = $this->notificationService->send($notificationData);
        
        $this->assertNotNull($notification);
        $this->assertEquals($scheduledTime->format('Y-m-d H:i:s'), 
                          $notification->scheduled_at->format('Y-m-d H:i:s'));
    }
    
    /** @test */
    public function it_handles_notification_with_related_entity()
    {
        $task = \App\Models\Task::factory()->create([
            'title' => 'Test Task',
            'description' => 'This is a test task',
            'deadline' => now()->addWeek(),
        ]);
        
        $recipients = [
            'users' => [$this->user->id],
        ];
        
        $options = [
            'channels' => ['in_app'],
            'related' => $task,
        ];
        
        $notifications = $this->notificationService->sendFromTemplate(
            'test_notification',
            $recipients,
            [],
            $options
        );
        
        $this->assertCount(1, $notifications);
        $notification = $notifications[0];
        
        $this->assertEquals(get_class($task), $notification->related_type);
        $this->assertEquals($task->id, $notification->related_id);
    }
    
    /** @test */
    public function it_handles_invalid_template_gracefully()
    {
        $recipients = [
            'users' => [$this->user->id],
        ];
        
        $notifications = $this->notificationService->sendFromTemplate(
            'non_existent_template',
            $recipients,
            []
        );
        
        $this->assertEmpty($notifications);
    }
}
