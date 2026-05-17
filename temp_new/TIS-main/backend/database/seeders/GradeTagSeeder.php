<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GradeTagSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Seeds 70+ grade type tags across 11 categories:
     * - School Types (Orta məktəb, Gimnaziya, Lisey)
     * - Languages (Avar, Gürcü, Saxur, Udi, Ləzgi, Rus)
     * - Specializations (Texniki, Humanitar, Təbiət, Riyaziyyat)
     * - Programs (Rəqəmsal bacarıq, STEAM, Şahmat, İnformatika)
     * - Special Needs (Xüsusi əqli, Xüsusi fiziki, Fərdi təhsil)
     * - Vocational (Xidmət, Tikinti, Kənd təsərrüfatı, İncəsənət, Texnika)
     * - Pilot Programs
     * - Experimental Programs
     * - Subject Focus
     * - Location Types
     * - Other
     */
    public function run(): void
    {
        $timestamp = now();
        $tags = [];

        // 1. SCHOOL TYPES (məktəb növü)
        $schoolTypes = [
            ['name' => 'Orta məktəb', 'description' => 'Ümumi orta məktəb sinfi', 'color' => 'blue', 'icon' => 'School'],
            ['name' => 'Gimnaziya', 'description' => 'Gimnaziya sinfi', 'color' => 'purple', 'icon' => 'GraduationCap'],
            ['name' => 'Lisey', 'description' => 'Lisey sinfi', 'color' => 'indigo', 'icon' => 'BookOpen'],
            ['name' => 'İbtidai məktəb', 'description' => '1-4-cü siniflər', 'color' => 'green', 'icon' => 'Users'],
        ];

        foreach ($schoolTypes as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'school_type',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 2. LANGUAGE SECTIONS (dil bölmələri)
        $languages = [
            ['name' => 'Azərbaycan dili', 'description' => 'Azərbaycan dilində təhsil', 'color' => 'red', 'icon' => 'Languages'],
            ['name' => 'Rus dili', 'description' => 'Rus dilində təhsil', 'color' => 'blue', 'icon' => 'Languages'],
            ['name' => 'Avar dili', 'description' => 'Avar dilində təhsil', 'color' => 'orange', 'icon' => 'Languages'],
            ['name' => 'Gürcü dili', 'description' => 'Gürcü dilində təhsil', 'color' => 'pink', 'icon' => 'Languages'],
            ['name' => 'Saxur dili', 'description' => 'Saxur dilində təhsil', 'color' => 'teal', 'icon' => 'Languages'],
            ['name' => 'Udi dili', 'description' => 'Udi dilində təhsil', 'color' => 'cyan', 'icon' => 'Languages'],
            ['name' => 'Ləzgi dili', 'description' => 'Ləzgi dilində təhsil', 'color' => 'lime', 'icon' => 'Languages'],
            ['name' => 'İngilis dili', 'description' => 'İngilis dilində təhsil', 'color' => 'violet', 'icon' => 'Languages'],
        ];

        foreach ($languages as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'language',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 3. SPECIALIZATIONS (ixtisaslaşma)
        $specializations = [
            ['name' => 'Texniki', 'description' => 'Texniki ixtisaslaşma', 'color' => 'slate', 'icon' => 'Cpu'],
            ['name' => 'Humanitar', 'description' => 'Humanitar ixtisaslaşma', 'color' => 'amber', 'icon' => 'BookHeart'],
            ['name' => 'Təbiət', 'description' => 'Təbiət elmləri ixtisaslaşma', 'color' => 'emerald', 'icon' => 'Leaf'],
            ['name' => 'Riyaziyyat', 'description' => 'Riyazi ixtisaslaşma', 'color' => 'blue', 'icon' => 'Calculator'],
            ['name' => 'Fizika', 'description' => 'Fizika ixtisaslaşma', 'color' => 'indigo', 'icon' => 'Atom'],
            ['name' => 'Kimya', 'description' => 'Kimya ixtisaslaşma', 'color' => 'purple', 'icon' => 'FlaskConical'],
            ['name' => 'Biologiya', 'description' => 'Biologiya ixtisaslaşma', 'color' => 'green', 'icon' => 'Dna'],
            ['name' => 'Ədəbiyyat', 'description' => 'Ədəbiyyat ixtisaslaşma', 'color' => 'rose', 'icon' => 'BookA'],
            ['name' => 'Tarix', 'description' => 'Tarix ixtisaslaşma', 'color' => 'yellow', 'icon' => 'Landmark'],
        ];

        foreach ($specializations as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'specialization',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 4. SPECIAL PROGRAMS (xüsusi proqramlar)
        $programs = [
            ['name' => 'Rəqəmsal bacarıq', 'description' => 'Rəqəmsal bacarıqlar proqramı', 'color' => 'cyan', 'icon' => 'Laptop'],
            ['name' => 'STEAM', 'description' => 'STEAM təhsil proqramı', 'color' => 'violet', 'icon' => 'Lightbulb'],
            ['name' => 'Şahmat', 'description' => 'Şahmat proqramı', 'color' => 'gray', 'icon' => 'Trophy'],
            ['name' => 'İnformatika', 'description' => 'Dərin İnformatika proqramı', 'color' => 'blue', 'icon' => 'Code'],
            ['name' => 'İdman', 'description' => 'İdman proqramı', 'color' => 'red', 'icon' => 'Activity'],
            ['name' => 'Musiqi', 'description' => 'Musiqi proqramı', 'color' => 'purple', 'icon' => 'Music'],
            ['name' => 'Rəssamlıq', 'description' => 'Rəssamlıq proqramı', 'color' => 'pink', 'icon' => 'Palette'],
            ['name' => 'Rəqs', 'description' => 'Rəqs proqramı', 'color' => 'fuchsia', 'icon' => 'Sparkles'],
        ];

        foreach ($programs as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'program',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 5. SPECIAL NEEDS (xüsusi ehtiyaclar)
        $specialNeeds = [
            ['name' => 'Xüsusi (əqli)', 'description' => 'Əqli inkişaf məhdudiyyətli şagirdlər', 'color' => 'orange', 'icon' => 'Heart'],
            ['name' => 'Xüsusi (fiziki)', 'description' => 'Fiziki məhdudiyyətli şagirdlər', 'color' => 'blue', 'icon' => 'Accessibility'],
            ['name' => 'Fərdi təhsil (məktəbdə)', 'description' => 'Məktəbdə fərdi təhsil', 'color' => 'purple', 'icon' => 'UserCheck'],
            ['name' => 'Fərdi təhsil (evdə)', 'description' => 'Evdə fərdi təhsil', 'color' => 'indigo', 'icon' => 'Home'],
            ['name' => 'İnklyuziv', 'description' => 'İnklyuziv təhsil sinfi', 'color' => 'green', 'icon' => 'Users'],
        ];

        foreach ($specialNeeds as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'special_needs',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 6. VOCATIONAL PROFILES (peşə profilləri)
        $vocational = [
            ['name' => 'Xidmət profili', 'description' => 'Xidmət sahəsi peşə təhsili', 'color' => 'teal', 'icon' => 'Briefcase'],
            ['name' => 'Tikinti təmir', 'description' => 'Tikinti və təmir peşə təhsili', 'color' => 'orange', 'icon' => 'Hammer'],
            ['name' => 'Kənd təsərrüfatı', 'description' => 'Kənd təsərrüfatı peşə təhsili', 'color' => 'green', 'icon' => 'Tractor'],
            ['name' => 'İncəsənət', 'description' => 'İncəsənət peşə təhsili', 'color' => 'pink', 'icon' => 'Palette'],
            ['name' => 'Texnika', 'description' => 'Texniki peşə təhsili', 'color' => 'gray', 'icon' => 'Wrench'],
            ['name' => 'İnformasiya texnologiyaları', 'description' => 'İT peşə təhsili', 'color' => 'blue', 'icon' => 'Monitor'],
            ['name' => 'Turizm', 'description' => 'Turizm və qonaqpərvərlik', 'color' => 'sky', 'icon' => 'Plane'],
            ['name' => 'Tibb', 'description' => 'Tibbi peşə təhsili', 'color' => 'red', 'icon' => 'Cross'],
        ];

        foreach ($vocational as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'vocational',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 7. PILOT PROGRAMS (pilot layihələr)
        $pilot = [
            ['name' => 'Pilot sinif', 'description' => 'Pilot layihə sinfi', 'color' => 'yellow', 'icon' => 'Rocket'],
            ['name' => 'Innovativ', 'description' => 'İnnovativ təhsil sinfi', 'color' => 'violet', 'icon' => 'Sparkles'],
        ];

        foreach ($pilot as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'pilot',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 8. EXPERIMENTAL (eksperimental)
        $experimental = [
            ['name' => 'Eksperimental', 'description' => 'Eksperimental təhsil proqramı', 'color' => 'amber', 'icon' => 'FlaskConical'],
        ];

        foreach ($experimental as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'experimental',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 9. SUBJECT FOCUS (fənn fokus)
        $subjectFocus = [
            ['name' => 'İngilis dili fokus', 'description' => 'İngilis dilinə fokuslanmış təhsil', 'color' => 'blue', 'icon' => 'Languages'],
            ['name' => 'Riyaziyyat fokus', 'description' => 'Riyaziyyata fokuslanmış təhsil', 'color' => 'indigo', 'icon' => 'Calculator'],
            ['name' => 'Elm fokus', 'description' => 'Elm fənlərinə fokuslanmış təhsil', 'color' => 'green', 'icon' => 'Microscope'],
        ];

        foreach ($subjectFocus as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'subject_focus',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 10. LOCATION TYPE (yerləşmə növü)
        $locationType = [
            ['name' => 'Şəhər', 'description' => 'Şəhər məktəbi', 'color' => 'gray', 'icon' => 'Building'],
            ['name' => 'Kənd', 'description' => 'Kənd məktəbi', 'color' => 'green', 'icon' => 'TreePine'],
            ['name' => 'Dağlıq', 'description' => 'Dağlıq ərazi məktəbi', 'color' => 'slate', 'icon' => 'Mountain'],
        ];

        foreach ($locationType as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'location_type',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // 11. OTHER (digər)
        $other = [
            ['name' => 'İnteqrasiya sinfi', 'description' => 'Müxtəlif səviyyəli şagirdlərin inteqrasiyası', 'color' => 'purple', 'icon' => 'Network'],
            ['name' => 'Sürətləndirilmiş', 'description' => 'Sürətləndirilmiş təhsil proqramı', 'color' => 'red', 'icon' => 'Zap'],
            ['name' => 'İkili dil', 'description' => 'İkidilli təhsil proqramı', 'color' => 'blue', 'icon' => 'Languages'],
        ];

        foreach ($other as $index => $tag) {
            $tags[] = array_merge([
                'category' => 'other',
                'sort_order' => $index + 1,
                'is_active' => true,
                'metadata' => '{}',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ], $tag);
        }

        // Insert all tags
        DB::table('grade_tags')->insert($tags);

        $this->command->info('✅ Created ' . count($tags) . ' grade tags across 11 categories');
    }
}
