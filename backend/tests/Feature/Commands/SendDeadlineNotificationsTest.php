<?php

namespace Tests\Feature\Commands;

use App\Models\Notification;
use App\Models\Task;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SendDeadlineNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\NotificationTemplateSeeder::class);
    }

    /** @test */
    public function it_sends_notifications_for_approaching_deadlines()
    {
        // Create a user who will receive notifications (simulating staff in target institutions)
        $user = User::factory()->create();
        
        $creator = User::factory()->create();
        
        // Create a task with deadline in 2 days (should trigger "approaching" notification)
        $task = Task::factory()->create([
            'title' => 'Approaching Task',
            'deadline' => now()->addDays(2),
            'created_by' => $creator->id,
            'status' => 'pending'
        ]);

        // Run the command
        Artisan::call('notifications:send-deadline-warnings');

        // Check if a notification was created for the creator
        // The title comes from NotificationTemplate's title_template: "Müddət xatırlatması"
        $this->assertDatabaseHas('notifications', [
            'type' => 'task_deadline',
            'user_id' => $creator->id,
            'title' => 'Müddət xatırlatması'
        ]);
    }

    /** @test */
    public function it_does_not_send_notifications_for_far_deadlines()
    {
        $creator = User::factory()->create();
        
        // Task with deadline in 10 days
        Task::factory()->create([
            'title' => 'Far Task',
            'deadline' => now()->addDays(10),
            'created_by' => $creator->id,
            'status' => 'pending'
        ]);

        Artisan::call('notifications:send-deadline-warnings');

        $this->assertDatabaseMissing('notifications', [
            'type' => 'task_deadline',
            'title' => 'Müddət xatırlatması'
        ]);
    }
}
