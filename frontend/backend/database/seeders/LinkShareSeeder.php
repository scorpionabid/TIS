<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LinkShare;
use App\Models\User;
use App\Models\Institution;

class LinkShareSeeder extends Seeder
{
    public function run()
    {
        // Get first user and institution for seeding
        $user = User::first();
        $institution = Institution::first();
        
        if (!$user || !$institution) {
            $this->command->warn('No users or institutions found. Skipping LinkShare seeding.');
            return;
        }

        $links = [
            [
                'title' => 'Təhsil Nazirliyi Rəsmi Saytı',
                'description' => 'Azərbaycan Respublikası Təhsil Nazirliyinin rəsmi internet saytı',
                'url' => 'https://edu.gov.az',
                'link_type' => 'external',
                'share_scope' => 'public',
                'is_featured' => true,
            ],
            [
                'title' => 'ASAN Xidmət Portalı',
                'description' => 'ASAN Xidmət mərkəzlərinin elektron xidmətləri və online ərizələr',
                'url' => 'https://asan.gov.az',
                'link_type' => 'external', 
                'share_scope' => 'public',
                'is_featured' => true,
            ],
            [
                'title' => 'Qəbul.edu.az - Ali Təhsil Qəbulu',
                'description' => 'Ali təhsil qəbul sisteminin rəsmi saytı və müraciət formaları',
                'url' => 'https://qebul.edu.az',
                'link_type' => 'form',
                'share_scope' => 'public',
                'is_featured' => false,
            ],
            [
                'title' => 'DIMTƏK - Dövlət İmtahan Mərkəzi',
                'description' => 'Dövlət imtahan mərkəzinin rəsmi saytı və imtahan nəticələri',
                'url' => 'https://dim.gov.az',
                'link_type' => 'external',
                'share_scope' => 'regional',
                'is_featured' => false,
            ],
            [
                'title' => 'E-Gov Azərbaycan',
                'description' => 'Azərbaycan Dövlət Elektron Hökumət Portalı - bütün dövlət xidmətləri',
                'url' => 'https://egov.az',
                'link_type' => 'external',
                'share_scope' => 'public',
                'is_featured' => true,
            ],
            [
                'title' => 'Elektron Kitabxana',
                'description' => 'Azərbaycan Milli Kitabxanasının elektron resursları',
                'url' => 'https://anl.az',
                'link_type' => 'document',
                'share_scope' => 'institutional',
                'is_featured' => false,
            ],
            [
                'title' => 'Təhsil Video Dərsləri',
                'description' => 'Onlayn video dərslər və təhsil materialları',
                'url' => 'https://derslik.edu.az',
                'link_type' => 'video',
                'share_scope' => 'sectoral',
                'is_featured' => false,
            ],
            [
                'title' => 'Müəllim Qeydiyyat Formu',
                'description' => 'Yeni müəllimlər üçün qeydiyyat və sertifikatlaşma formu',
                'url' => 'https://forms.edu.gov.az/teacher-registration',
                'link_type' => 'form',
                'share_scope' => 'institutional',
                'is_featured' => false,
                'requires_login' => true,
            ],
            [
                'title' => 'Şagird Dəftərçəsi Portal',
                'description' => 'Şagird qiymətləri və davamiyyətin izlənməsi üçün portal',
                'url' => 'https://student.edu.az',
                'link_type' => 'external',
                'share_scope' => 'institutional',
                'is_featured' => false,
                'requires_login' => true,
            ],
            [
                'title' => 'Təhsil Statistikaları',
                'description' => 'Təhsil sahəsində statistik məlumatlar və hesabatlar',
                'url' => 'https://stats.edu.gov.az',
                'link_type' => 'document',
                'share_scope' => 'public',
                'is_featured' => false,
            ]
        ];

        foreach ($links as $index => $linkData) {
            LinkShare::create([
                'title' => $linkData['title'],
                'description' => $linkData['description'],
                'url' => $linkData['url'],
                'link_type' => $linkData['link_type'],
                'shared_by' => $user->id,
                'institution_id' => $institution->id,
                'share_scope' => $linkData['share_scope'],
                'requires_login' => $linkData['requires_login'] ?? false,
                'is_featured' => $linkData['is_featured'],
                'status' => 'active',
                'click_count' => rand(5, 150), // Random click counts for testing
                'created_at' => now()->subDays(rand(1, 30)), // Random dates in last 30 days
            ]);
        }

        $this->command->info('Created ' . count($links) . ' sample link shares.');
    }
}