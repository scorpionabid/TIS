<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Rename role 'ubr' (Tədris-Bilimlər Referenti) to 'təşkilatçı'
     */
    public function up(): void
    {
        // 1. Update the roles table
        DB::table('roles')
            ->where('name', 'ubr')
            ->update([
                'name' => 'təşkilatçı',
                'display_name' => 'Təşkilatçı',
                'description' => 'Tədbir planlaması, ekskursiyalar və məktəb fəaliyyətləri',
            ]);

        // 2. Update department types in departments table
        DB::table('departments')
            ->where('department_type', 'ubr')
            ->update(['department_type' => 'təşkilatçı']);

        // 3. Update department names that may still say 'UBR Şöbəsi'
        DB::table('departments')
            ->where('name', 'UBR Şöbəsi')
            ->update(['name' => 'Təşkilatçı Şöbəsi']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert roles table
        DB::table('roles')
            ->where('name', 'təşkilatçı')
            ->update([
                'name' => 'ubr',
                'display_name' => 'Tədris-Bilimlər Referenti',
                'description' => 'Tədbir planlaması, ekskursiyalar və məktəb fəaliyyətləri',
            ]);

        // Revert department types
        DB::table('departments')
            ->where('department_type', 'təşkilatçı')
            ->update(['department_type' => 'ubr']);

        // Revert department names
        DB::table('departments')
            ->where('name', 'Təşkilatçı Şöbəsi')
            ->update(['name' => 'UBR Şöbəsi']);
    }
};
