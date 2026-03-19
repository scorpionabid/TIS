<?php

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class PreschoolPhotoCleanupCommandTest extends TestCase
{
    /** @test */
    public function it_is_scheduled_correctly()
    {
        /** @var Schedule $schedule */
        $schedule = app()->make(Schedule::class);

        $events = collect($schedule->events())->filter(function ($event) {
            return stripos($event->command, 'preschool:cleanup-photos') !== false;
        });

        $this->assertEquals(1, $events->count());

        $event = $events->first();
        $this->assertEquals('30 3 * * *', $event->expression); // represents daily at 03:30
    }
}
