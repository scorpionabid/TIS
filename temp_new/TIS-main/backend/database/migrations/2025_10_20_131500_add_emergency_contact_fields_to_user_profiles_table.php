<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('user_profiles', 'emergency_contact_name')) {
                $table->string('emergency_contact_name', 150)->nullable()->after('emergency_contact');
            }

            if (! Schema::hasColumn('user_profiles', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone', 50)->nullable()->after('emergency_contact_name');
            }

            if (! Schema::hasColumn('user_profiles', 'emergency_contact_email')) {
                $table->string('emergency_contact_email', 150)->nullable()->after('emergency_contact_phone');
            }

            if (! Schema::hasColumn('user_profiles', 'notes')) {
                $table->text('notes')->nullable()->after('special_needs');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'notes')) {
                $table->dropColumn('notes');
            }

            if (Schema::hasColumn('user_profiles', 'emergency_contact_email')) {
                $table->dropColumn('emergency_contact_email');
            }

            if (Schema::hasColumn('user_profiles', 'emergency_contact_phone')) {
                $table->dropColumn('emergency_contact_phone');
            }

            if (Schema::hasColumn('user_profiles', 'emergency_contact_name')) {
                $table->dropColumn('emergency_contact_name');
            }
        });
    }
};
