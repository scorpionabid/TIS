<?php

namespace Tests\Feature\Notifications;

use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserNotificationPreferenceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function user_can_get_their_notification_preferences()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/notification-preferences');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email_enabled' => true, // default
                    'task_deadline_reminder' => true // default
                ]
            ]);
    }

    /** @test */
    public function user_can_update_their_notification_preferences()
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/user/notification-preferences', [
                'email_enabled' => false,
                'task_reminder_days' => 5
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email_enabled' => false,
                    'task_reminder_days' => 5
                ]
            ]);

        $prefs = UserNotificationPreference::getForUser($this->user->id);
        $this->assertFalse($prefs->email_enabled);
        $this->assertEquals(5, $prefs->task_reminder_days);
    }

    /** @test */
    public function user_can_reset_preferences_implicitly_matching_defaults()
    {
        // Just verify our controller returns what is expected after reset (if we had a reset endpoint)
        // Since we don't have a dedicated reset endpoint yet, we just test update with all defaults.
        $defaults = [
            'email_enabled' => true,
            'task_deadline_reminder' => true,
            'task_reminder_days' => 3
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/user/notification-preferences', $defaults);

        $response->assertStatus(200);
        $prefs = UserNotificationPreference::getForUser($this->user->id);
        $this->assertTrue($prefs->email_enabled);
        $this->assertEquals(3, $prefs->task_reminder_days);
    }
}
