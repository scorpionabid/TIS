<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_calendar_events', function (Blueprint $table) {
            $table->unsignedSmallInteger('reminder_minutes')->nullable()->after('link');
            $table->string('recurrence_rule', 20)->nullable()->after('reminder_minutes'); // daily|weekly|monthly
            $table->date('recurrence_end_date')->nullable()->after('recurrence_rule');
        });
    }

    public function down(): void
    {
        Schema::table('user_calendar_events', function (Blueprint $table) {
            $table->dropColumn(['reminder_minutes', 'recurrence_rule', 'recurrence_end_date']);
        });
    }
};
