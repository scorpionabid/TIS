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
        Schema::create('region_operator_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->boolean('can_manage_surveys')->default(false);
            $table->boolean('can_manage_tasks')->default(false);
            $table->boolean('can_manage_documents')->default(false);
            $table->boolean('can_manage_folders')->default(false);
            $table->boolean('can_manage_links')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('region_operator_permissions');
    }
};
