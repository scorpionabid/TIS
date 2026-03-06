<?php

namespace Tests\Feature\Notifications;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function user_can_list_their_notifications()
    {
        Notification::factory()->count(5)->create(['user_id' => $this->user->id]);
        Notification::factory()->count(3)->create(); // Other user's notifications

        $response = $this->actingAs($this->user)
            ->getJson('/api/notifications');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    /** @test */
    public function user_can_get_unread_count()
    {
        Notification::factory()->count(3)->create(['user_id' => $this->user->id, 'is_read' => false]);
        Notification::factory()->create(['user_id' => $this->user->id, 'is_read' => true]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/notifications/unread-count');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['count' => 3]
            ]);
    }

    /** @test */
    public function user_can_mark_notification_as_read()
    {
        $notification = Notification::factory()->create(['user_id' => $this->user->id, 'is_read' => false]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);
        $this->assertTrue($notification->fresh()->is_read);
    }

    /** @test */
    public function user_can_mark_all_notifications_as_read()
    {
        Notification::factory()->count(3)->create(['user_id' => $this->user->id, 'is_read' => false]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/notifications/mark-all-read');

        $response->assertStatus(200);
        $this->assertEquals(0, Notification::forUser($this->user->id)->unread()->count());
    }

    /** @test */
    public function user_can_get_notification_statistics_with_correct_format()
    {
        // Today
        Notification::factory()->create(['user_id' => $this->user->id, 'created_at' => now()]);
        // Yesterday
        Notification::factory()->create(['user_id' => $this->user->id, 'created_at' => now()->subDay()]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/notifications/statistics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_notifications',
                    'unread_notifications',
                    'new_today',
                    'this_week',
                    'by_type',
                    'by_priority',
                    'recent_activity'
                ]
            ]);
        
        $data = $response->json('data');
        $this->assertEquals(2, $data['total_notifications']);
        $this->assertEquals(1, $data['new_today']);
    }

    /** @test */
    public function user_can_delete_their_notification()
    {
        $notification = Notification::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/notifications/{$notification->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }

    /** @test */
    public function user_cannot_access_others_notifications()
    {
        $otherUser = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/notifications/{$notification->id}");

        $response->assertStatus(404);
    }
}
