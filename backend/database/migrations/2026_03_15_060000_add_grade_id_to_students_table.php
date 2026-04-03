<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'grade_id')) {
                $table->foreignId('grade_id')->nullable()->after('institution_id')->constrained('grades')->onDelete('set null');
            }
        });

        // Data migration logic
        $students = DB::table('students')->whereNull('grade_id')->get();

        foreach ($students as $student) {
            $grade = DB::table('grades')
                ->where('institution_id', $student->institution_id)
                ->where('name', $student->class_name)
                ->first();

            if ($grade) {
                DB::table('students')
                    ->where('id', $student->id)
                    ->update(['grade_id' => $grade->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['grade_id']);
            $table->dropColumn('grade_id');
        });
    }
};
