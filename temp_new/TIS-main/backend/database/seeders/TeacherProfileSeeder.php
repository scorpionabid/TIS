<?php

namespace Database\Seeders;

use App\Models\TeacherAchievement;
use App\Models\TeacherCertificate;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TeacherProfileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Mövcud müəllim user-larını tapaq
        $teachers = User::whereHas('roles', function ($query) {
            $query->where('name', 'müəllim');
        })->get();

        if ($teachers->isEmpty()) {
            // Əgər müəllim yoxdursa, test müəllim yaradaq
            $teacher = User::create([
                'name' => 'Test Müəllim',
                'username' => 'teacher',
                'email' => 'teacher@atis.az',
                'password' => Hash::make('teacher123'),
                'email_verified_at' => now(),
                'remember_token' => Str::random(10),
            ]);

            // Müəllim rolunu təyin et
            $teacher->assignRole('müəllim');
            $teachers = collect([$teacher]);
        }

        foreach ($teachers as $teacher) {
            // Teacher profile yaradaq
            $profile = TeacherProfile::create([
                'user_id' => $teacher->id,
                'phone' => '+994 50 123 45 67',
                'bio' => 'Təcrübəli riyaziyyat müəllimi. 8 ildir tədris fəaliyyətindəyəm. Şagirdlərin riyaziyyat sevgisini aşıltmaq və müasir tədris metodlarındən istifadə etmək məqsədim güdürəm.',
                'qualifications' => [
                    'Ali təhsil (Magistr)',
                    'Pedaqoji təcrübə (8 il)',
                    'İxtisasartırma kursları (Google Certified Educator)',
                    'Riyaziyyat olimpiadaları məsləhətçisi',
                ],
                'experience_years' => 8,
                'specialization' => 'Riyaziyyat və Cəbr',
                'photo' => 'https://ui-avatars.com/api/?name=' . urlencode($teacher->name) . '&background=random',
                'school' => 'Bakı Şəhər 123 nömrəli tam orta məktəb',
                'subject' => 'Riyaziyyat',
                'address' => 'Bakı şəhəri, Nəsimani rayonu, Əhmədli Cəfərova küçəsi 25',
                'emergency_contact_name' => 'Xəyalı Müəllimova',
                'emergency_contact_phone' => '+994 55 987 65 43',
                'emergency_contact_email' => 'emergency@atis.az',
                'social_links' => [
                    'linkedin' => 'https://linkedin.com/in/' . Str::slug($teacher->name),
                    'twitter' => 'https://twitter.com/' . Str::slug($teacher->name),
                ],
                'preferences' => [
                    'theme' => 'light',
                    'language' => 'az',
                    'notifications' => true,
                    'public_profile' => true,
                ],
            ]);

            // Nailiyyətlər əlavə edək
            $achievements = [
                [
                    'title' => 'İlin Müəllimi - 2023',
                    'description' => '2023-cü ildə Azərbaycanda ilin müəllimi seçildi. Şagirdlərin yüksək nəticələri və innovativ tədris metodları üçün mükafatlandırıldı.',
                    'date' => '2023-06-15',
                    'type' => 'award',
                    'impact_level' => 'high',
                    'institution' => 'Təhsil Nazirliyi',
                    'verification_status' => true,
                    'notes' => 'Beynəlxalq müəllimlər konfransında iştirak etmişdir.',
                    'category' => 'Akademik',
                    'tags' => ['mükafat', 'ilin müəllimi', 'təhsil nazirliyi'],
                ],
                [
                    'title' => 'Google Certified Educator Level 2',
                    'description' => 'Google tərəfindən təşkil edilən peşəkar inkişaf proqramını uğurla tamamladı. Dijital tədris alətlərindən istifadə bacarıqları təsdiqləndi.',
                    'date' => '2023-03-20',
                    'type' => 'certification',
                    'impact_level' => 'medium',
                    'institution' => 'Google for Education',
                    'certificate_url' => 'https://edu.google.com',
                    'verification_status' => true,
                    'category' => 'Peşəkar',
                    'tags' => ['google', 'sertifikat', 'dijital tədris'],
                ],
                [
                    'title' => '1000 Dərs Saatı',
                    'description' => 'Karyerası ərzində 1000 dərs saatı həyata keçirərək bu mühüm mərhələyə çatdı. Şagirdlərinə dərin təhsil verib onların inkişafına töhfələdi.',
                    'date' => '2022-12-01',
                    'type' => 'milestone',
                    'impact_level' => 'low',
                    'verification_status' => true,
                    'category' => 'Karyera',
                    'tags' => ['mərhələ', 'dərs saatı', 'karyera'],
                ],
                [
                    'title' => 'Riyaziyyat Olimpiadası Məsləhətçisi',
                    'description' => 'Azərbaycan Riyaziyyat Olimpiadası Komitəsi tərəfindən rəsmi məsləhətçi təyin edildi. Şagirdlərin olimpiadalara hazırlanmasında mühüm rol oynadı.',
                    'date' => '2023-09-10',
                    'type' => 'recognition',
                    'impact_level' => 'medium',
                    'institution' => 'Azərbaycan Riyaziyyat Olimpiadası Komitəsi',
                    'verification_status' => true,
                    'category' => 'İctimai',
                    'tags' => ['olimpiada', 'riyaziyyat', 'məsləhətçi'],
                ],
                [
                    'title' => 'İnteraktiv Tədris Metodları Nəşri',
                    'description' => '"Müasir Tədris Metodları" adlı kitabın müəllifi kimi nəşr edildi. Kitab müəllimlər üçün praktik tövsiyələr və metodlar ehtiva edir.',
                    'date' => '2023-07-25',
                    'type' => 'publication',
                    'impact_level' => 'medium',
                    'institution' => 'Təhsil Nəşriyyatı',
                    'certificate_url' => 'https://example.com/book',
                    'verification_status' => true,
                    'category' => 'Elmi',
                    'tags' => ['nəşr', 'kitab', 'tədris metodları'],
                ],
                [
                    'title' => 'EDUCA 2023 Konfransı Təqdimatı',
                    'description' => 'Beynəlxalq Təhsil Konfransında "AI-dən İstifadə edərək Tədris Keyfiyyətlərinin Yaxşılaşdırılması" mövzusunda təqdimat etdi.',
                    'date' => '2023-11-15',
                    'type' => 'presentation',
                    'impact_level' => 'high',
                    'institution' => 'EDUCA International',
                    'verification_status' => true,
                    'category' => 'Beynəlxalq',
                    'tags' => ['konfrans', 'AI', 'tədris keyfiyyətləri'],
                ],
            ];

            foreach ($achievements as $achievement) {
                TeacherAchievement::create([
                    'user_id' => $teacher->id,
                    'teacher_profile_id' => $profile->id,
                    'title' => $achievement['title'],
                    'description' => $achievement['description'],
                    'date' => $achievement['date'],
                    'type' => $achievement['type'],
                    'impact_level' => $achievement['impact_level'],
                    'institution' => $achievement['institution'] ?? null,
                    'certificate_url' => $achievement['certificate_url'] ?? null,
                    'verification_status' => $achievement['verification_status'],
                    'notes' => $achievement['notes'] ?? null,
                    'category' => $achievement['category'] ?? null,
                    'tags' => json_encode($achievement['tags'] ?? []),
                ]);
            }

            // Sertifikatlar əlavə edək
            $certificates = [
                [
                    'name' => 'Google Certified Educator Level 2',
                    'issuer' => 'Google for Education',
                    'date' => '2023-03-20',
                    'expiry_date' => '2025-03-20',
                    'credential_id' => 'GCE-L2-2023-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Google Workspace', 'Google Classroom', 'Digital Teaching', 'Online Assessment'],
                    'level' => 'advanced',
                    'category' => 'technical',
                ],
                [
                    'name' => 'Microsoft Innovative Educator Expert',
                    'issuer' => 'Microsoft Corporation',
                    'date' => '2022-08-15',
                    'expiry_date' => '2024-08-15',
                    'credential_id' => 'MIEE-2022-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Microsoft 365', 'OneNote', 'Teams', 'PowerPoint', 'Digital Literacy'],
                    'level' => 'expert',
                    'category' => 'technical',
                ],
                [
                    'name' => 'Advanced Teaching Methods Certificate',
                    'issuer' => 'Azərbaycan Təhsil İnstitutu',
                    'date' => '2021-12-10',
                    'expiry_date' => null, // Lifetime certificate
                    'credential_id' => 'ATM-2021-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Project-Based Learning', 'Differentiated Instruction', 'Assessment Strategies', 'Classroom Management'],
                    'level' => 'advanced',
                    'category' => 'teaching',
                ],
                [
                    'name' => 'IELTS Academic - Band 7.5',
                    'issuer' => 'British Council',
                    'date' => '2020-06-01',
                    'expiry_date' => '2025-06-01',
                    'credential_id' => 'IELTS-2020-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Academic English', 'Reading', 'Writing', 'Speaking', 'Listening'],
                    'level' => 'advanced',
                    'category' => 'language',
                ],
                [
                    'name' => 'Data Analysis for Educators',
                    'issuer' => 'Coursera - University of Michigan',
                    'date' => '2023-01-15',
                    'expiry_date' => null,
                    'credential_id' => 'COURSERA-DAE-2023-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Excel', 'Data Visualization', 'Statistical Analysis', 'Educational Analytics'],
                    'level' => 'intermediate',
                    'category' => 'technical',
                ],
                [
                    'name' => 'Project Management Professional (PMP)',
                    'issuer' => 'PMI - Project Management Institute',
                    'date' => '2022-09-20',
                    'expiry_date' => '2025-09-20',
                    'credential_id' => 'PMP-2022-' . $teacher->id,
                    'status' => 'active',
                    'skills' => ['Project Planning', 'Risk Management', 'Team Leadership', 'Budget Management'],
                    'level' => 'expert',
                    'category' => 'management',
                ],
            ];

            foreach ($certificates as $certificate) {
                TeacherCertificate::create([
                    'user_id' => $teacher->id,
                    'teacher_profile_id' => $profile->id,
                    'name' => $certificate['name'],
                    'issuer' => $certificate['issuer'],
                    'date' => $certificate['date'],
                    'expiry_date' => $certificate['expiry_date'],
                    'credential_id' => $certificate['credential_id'],
                    'status' => $certificate['status'],
                    'skills' => $certificate['skills'],
                    'level' => $certificate['level'],
                    'category' => $certificate['category'],
                ]);
            }
        }

        $this->command->info('✅ Teacher profile test data successfully seeded!');
        $this->command->info('📊 Created profiles for ' . $teachers->count() . ' teachers');
        $this->command->info('🏆 Added 6 achievements per teacher');
        $this->command->info('📜 Added 6 certificates per teacher');
    }
}
