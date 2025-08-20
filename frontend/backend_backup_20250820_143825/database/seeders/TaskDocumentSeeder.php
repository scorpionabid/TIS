<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\Task;
use App\Models\Document;
use Carbon\Carbon;

class TaskDocumentSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📋 Seeding tasks and documents data...');
        
        DB::beginTransaction();
        
        try {
            // 1. Task Management Data
            $this->seedTaskData();
            
            // 2. Document Management Data
            $this->seedDocumentData();
            
            DB::commit();
            
            $this->command->info('✅ Tasks and documents seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ Tasks and documents seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedTaskData()
    {
        $this->command->info('📋 Seeding task data...');
        
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        $regionAdmins = User::whereHas('roles', function($q) { $q->where('name', 'regionadmin'); })->get();
        $schoolAdmins = User::whereHas('roles', function($q) { $q->where('name', 'schooladmin'); })->get();
        $teachers = User::whereHas('roles', function($q) { $q->where('name', 'müəllim'); })->take(3)->get();
        
        if (!$superadmin) {
            $this->command->warn('Skipping task seeding - no superadmin found');
            return;
        }
        
        $tasks = [
            [
                'title' => 'Həftəlik Davamiyyət Hesabatının Hazırlanması',
                'description' => 'Bu həftənin tələbə davamiyyət məlumatlarını toplayıb hesabat hazırlayın',
                'category' => 'hesabat',
                'priority' => 'yuksek',
                'status' => 'in_progress',
                'assigned_to' => $teachers->first()->id ?? $superadmin->id,
                'created_by' => $schoolAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Yeni Dərs Cədvəlinin Baxışı',
                'description' => 'Növbəti həftə üçün hazırlanan dərs cədvəlini nəzərdən keçirin və təsdiq edin',
                'category' => 'tedbir',
                'priority' => 'orta',
                'status' => 'pending',
                'assigned_to' => $schoolAdmins->first()->id ?? $superadmin->id,
                'created_by' => $regionAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Sənəd Təsdiqi - Məktəb Büdcəsi',
                'description' => 'Məktəbin aylıq büdcə xərcləri sənədini yoxlayıb təsdiq edin',
                'category' => 'audit',
                'priority' => 'tecili',
                'status' => 'pending',
                'assigned_to' => $regionAdmins->first()->id ?? $superadmin->id,
                'created_by' => $superadmin->id,
            ],
            [
                'title' => 'Müəllim Məmnuniyyət Sorğusuna Cavab',
                'description' => 'Yayımlanan müəllim məmnuniyyət sorğusunu tamamlayın',
                'category' => 'tedbir',
                'priority' => 'orta',
                'status' => 'completed',
                'assigned_to' => $teachers->get(1)->id ?? $superadmin->id,
                'created_by' => $schoolAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Məktəb Təhlükəsizlik Yoxlaması',
                'description' => 'Məktəbin təhlükəsizlik sistemlərini yoxlayıb nəticələri bildirin',
                'category' => 'audit',
                'priority' => 'yuksek',
                'status' => 'in_progress',
                'assigned_to' => $schoolAdmins->get(1)->id ?? $superadmin->id,
                'created_by' => $regionAdmins->first()->id ?? $superadmin->id,
            ],
        ];
        
        foreach ($tasks as $taskData) {
            $institution = User::find($taskData['assigned_to'])->institution ?? Institution::first();
            
            Task::firstOrCreate([
                'title' => $taskData['title']
            ], [
                'description' => $taskData['description'],
                'category' => $taskData['category'],
                'priority' => $taskData['priority'],
                'status' => $taskData['status'],
                'assigned_to' => $taskData['assigned_to'],
                'created_by' => $taskData['created_by'],
                'assigned_institution_id' => $institution->id,
                'deadline' => now()->addDays(rand(1, 14)),
                'progress' => $taskData['status'] === 'completed' ? 100 : rand(10, 60),
                'target_scope' => 'specific',
            ]);
        }
    }

    private function seedDocumentData()
    {
        $this->command->info('📄 Seeding document data...');
        
        $users = User::whereHas('roles')->take(5)->get();
        $institutions = Institution::take(3)->get();
        
        if ($users->count() === 0 || $institutions->count() === 0) {
            $this->command->warn('Skipping document seeding - insufficient users or institutions');
            return;
        }
        
        $documents = [
            [
                'title' => 'Təhsil Nazirliyi Sirkular Məktubu #2024-157',
                'description' => 'Yeni tədris ili üçün metodiki göstərişlər',
                'original_filename' => 'sirkulyar_2024_157.pdf',
                'stored_filename' => 'sirkulyar_2024_157_' . time() . '.pdf',
                'file_extension' => 'pdf',
                'mime_type' => 'application/pdf',
                'file_size' => 1024 * 500, // 500KB
                'file_type' => 'document',
                'category' => 'official',
                'access_level' => 'institution',
            ],
            [
                'title' => 'Məktəb Daxili Qaydalar',
                'description' => 'Müəllim və tələbələr üçün daxili qaydalar sənədi',
                'original_filename' => 'daxili_qaydalar.docx',
                'stored_filename' => 'daxili_qaydalar_' . time() . '.docx',
                'file_extension' => 'docx',
                'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'file_size' => 1024 * 256, // 256KB
                'file_type' => 'document',
                'category' => 'policy',
                'access_level' => 'institution',
            ],
            [
                'title' => 'Davamiyyət Hesabat Şablonu',
                'description' => 'Həftəlik davamiyyət hesabatı üçün Excel şablonu',
                'original_filename' => 'davamiyyat_sablon.xlsx',
                'stored_filename' => 'davamiyyat_sablon_' . time() . '.xlsx',
                'file_extension' => 'xlsx',
                'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'file_size' => 1024 * 128, // 128KB
                'file_type' => 'spreadsheet',
                'category' => 'template',
                'access_level' => 'public',
            ],
            [
                'title' => 'İllik Statistik Hesabat 2024',
                'description' => 'Məktəbin 2024-cü il statistik göstəriciləri',
                'original_filename' => 'statistik_hesabat_2024.pdf',
                'stored_filename' => 'statistik_hesabat_2024_' . time() . '.pdf',
                'file_extension' => 'pdf',
                'mime_type' => 'application/pdf',
                'file_size' => 1024 * 750, // 750KB
                'file_type' => 'document',
                'category' => 'report',
                'access_level' => 'restricted',
            ],
        ];
        
        foreach ($documents as $docData) {
            $user = $users->random();
            $institution = $institutions->random();
            
            Document::firstOrCreate([
                'title' => $docData['title']
            ], [
                'description' => $docData['description'],
                'original_filename' => $docData['original_filename'],
                'stored_filename' => $docData['stored_filename'],
                'file_path' => 'documents/' . $docData['stored_filename'],
                'file_extension' => $docData['file_extension'],
                'mime_type' => $docData['mime_type'],
                'file_size' => $docData['file_size'],
                'file_type' => $docData['file_type'],
                'category' => $docData['category'],
                'access_level' => $docData['access_level'],
                'uploaded_by' => $user->id,
                'institution_id' => $institution->id,
                'published_at' => now()->subDays(rand(1, 30)),
                'status' => 'active',
                'is_public' => $docData['access_level'] === 'public',
                'is_downloadable' => true,
                'is_viewable_online' => true,
            ]);
        }
    }
}