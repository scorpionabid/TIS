<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;

class TableLabelService
{
    /**
     * İngilis texniki sözlər → Azərbaycan dili sözlüyü.
     * Snake_case hissələrini avtomatik çevirmək üçün istifadə olunur.
     */
    private const WORD_DICTIONARY = [
        'user'             => 'İstifadəçi',
        'users'            => 'İstifadəçilər',
        'student'          => 'Şagird',
        'students'         => 'Şagirdlər',
        'teacher'          => 'Müəllim',
        'teachers'         => 'Müəllimlər',
        'class'            => 'Sinif',
        'classes'          => 'Siniflər',
        'subject'          => 'Fənn',
        'subjects'         => 'Fənlər',
        'grade'            => 'Qiymət',
        'grades'           => 'Qiymətlər',
        'attendance'       => 'Davamiyyət',
        'schedule'         => 'Cədvəl',
        'schedules'        => 'Cədvəllər',
        'institution'      => 'Qurum',
        'institutions'     => 'Qurumlar',
        'region'           => 'Region',
        'regions'          => 'Regionlar',
        'sector'           => 'Sektor',
        'sectors'          => 'Sektorlar',
        'school'           => 'Məktəb',
        'assessment'       => 'Qiymətləndirmə',
        'survey'           => 'Sorğu',
        'surveys'          => 'Sorğular',
        'task'             => 'Tapşırıq',
        'tasks'            => 'Tapşırıqlar',
        'document'         => 'Sənəd',
        'documents'        => 'Sənədlər',
        'report'           => 'Hesabat',
        'reports'          => 'Hesabatlar',
        'notification'     => 'Bildiriş',
        'message'          => 'Mesaj',
        'messages'         => 'Mesajlar',
        'role'             => 'Rol',
        'roles'            => 'Rollar',
        'permission'       => 'İcazə',
        'permissions'      => 'İcazələr',
        'log'              => 'Jurnal',
        'logs'             => 'Jurnallar',
        'audit'            => 'Audit',
        'config'           => 'Konfiqurasiya',
        'setting'          => 'Tənzimləmə',
        'settings'         => 'Tənzimləmələr',
        'type'             => 'Tip',
        'types'            => 'Tiplər',
        'template'         => 'Şablon',
        'templates'        => 'Şablonlar',
        'history'          => 'Tarixçə',
        'record'           => 'Qeyd',
        'records'          => 'Qeydlər',
        'result'           => 'Nəticə',
        'results'          => 'Nəticələr',
        'profile'          => 'Profil',
        'profiles'         => 'Profillər',
        'session'          => 'Sessiya',
        'sessions'         => 'Sessiyalar',
        'analytics'        => 'Analitika',
        'summary'          => 'Xülasə',
        'item'             => 'Element',
        'items'            => 'Elementlər',
        'entry'            => 'Giriş',
        'entries'          => 'Girişlər',
        'response'         => 'Cavab',
        'responses'        => 'Cavablar',
        'comment'          => 'Şərh',
        'comments'         => 'Şərhlər',
        'action'           => 'Əməliyyat',
        'actions'          => 'Əməliyyatlar',
        'approval'         => 'Təsdiqləmə',
        'workflow'         => 'İş Axışı',
        'delegate'         => 'Nümayəndə',
        'delegation'       => 'Nümayəndəlik',
        'rating'           => 'Reytinq',
        'ratings'          => 'Reytinqlər',
        'performance'      => 'Performans',
        'inventory'        => 'Anbar',
        'transaction'      => 'Əməliyyat',
        'transactions'     => 'Əməliyyatlar',
        'maintenance'      => 'Texniki Xidmət',
        'psychology'       => 'Psixologiya',
        'academic'         => 'Akademik',
        'year'             => 'İl',
        'years'            => 'İllər',
        'term'             => 'Semestr',
        'terms'            => 'Semestrlər',
        'calendar'         => 'Təqvim',
        'category'         => 'Kateqoriya',
        'department'       => 'Şöbə',
        'departments'      => 'Şöbələr',
        'room'             => 'Otaq',
        'rooms'            => 'Otaqlar',
        'slot'             => 'Xana',
        'slots'            => 'Xanalar',
        'load'             => 'Yük',
        'quota'            => 'Kvota',
        'share'            => 'Paylaşım',
        'shares'           => 'Paylaşımlar',
        'download'         => 'Yükləmə',
        'downloads'        => 'Yükləmələr',
        'upload'           => 'Yükləmə',
        'uploads'          => 'Yükləmələr',
        'access'           => 'Giriş',
        'tracking'         => 'İzləmə',
        'view'             => 'Baxış',
        'views'            => 'Baxışlar',
        'resource'         => 'Resurs',
        'resources'        => 'Resurslar',
        'link'             => 'Link',
        'links'            => 'Linklər',
        'security'         => 'Təhlükəsizlik',
        'alert'            => 'Xəbərdarlıq',
        'alerts'           => 'Xəbərdarlıqlar',
        'event'            => 'Hadisə',
        'events'           => 'Hadisələr',
        'incident'         => 'İnkident',
        'incidents'        => 'İnkidentlər',
        'monitoring'       => 'Monitorinq',
        'indicator'        => 'Göstərici',
        'indicators'       => 'Göstəricilər',
        'metric'           => 'Metrik',
        'metrics'          => 'Metriklər',
        'trend'            => 'Tendensiya',
        'trends'           => 'Tendensiyalar',
        'statistic'        => 'Statistika',
        'statistics'       => 'Statistika',
        'bulk'             => 'Toplu',
        'enrollment'       => 'Qeydiyyat',
        'enrollments'      => 'Qeydiyyatlar',
        'certificate'      => 'Sertifikat',
        'certificates'     => 'Sertifikatlar',
        'achievement'      => 'Nailiyyət',
        'achievements'     => 'Nailiyyətlər',
        'evaluation'       => 'Qiymətləndirmə',
        'evaluations'      => 'Qiymətləndirmələr',
        'availability'     => 'Mövcudluq',
        'workplace'        => 'İş Yeri',
        'workplaces'       => 'İş Yerləri',
        'development'      => 'İnkişaf',
        'verification'     => 'Yoxlama',
        'verifications'    => 'Yoxlamalar',
        'staff'            => 'Heyət',
        'preschool'        => 'Məktəbəqədər',
        'photo'            => 'Foto',
        'photos'           => 'Fotolar',
        'system'           => 'Sistem',
        'cache'            => 'Keş',
        'job'              => 'Tapşırıq Növbəsi',
        'jobs'             => 'Tapşırıq Növbəsi',
        'batch'            => 'Toplu İş',
        'batches'          => 'Toplu İşlər',
        'failed'           => 'Uğursuz',
        'device'           => 'Cihaz',
        'devices'          => 'Cihazlar',
        'visibility'       => 'Görünürlük',
        'data'             => 'Məlumat',
        'framework'        => 'Çərçivə',
        'competency'       => 'Səriştə',
        'bonus'            => 'Bonus',
        'growth'           => 'Artım',
        'olympiad'         => 'Olimpiada',
        'level'            => 'Səviyyə',
        'compliance'       => 'Uyğunluq',
        'lockout'          => 'Bloklama',
        'lockouts'         => 'Bloklamalar',
        'folder'           => 'Qovluq',
        'folders'          => 'Qovluqlar',
        'collection'       => 'Kolleksiya',
        'collections'      => 'Kolleksiyalar',
        'question'         => 'Sual',
        'questions'        => 'Suallar',
        'conflict'         => 'Ziddiyyət',
        'conflicts'        => 'Ziddiyyətlər',
        'generation'       => 'Generasiya',
        'matrix'           => 'Matris',
        'dependency'       => 'Asılılıq',
        'dependencies'     => 'Asılılıqlar',
        'checklist'        => 'Yoxlama Siyahısı',
        'progress'         => 'İrəliləyiş',
        'sub'              => 'Alt',
        'has'              => '',
        'model'            => 'Model',
        'absence'          => 'Qayıb',
        'request'          => 'Ərizə',
        'requests'         => 'Ərizələr',
        'daily'            => 'Günlük',
        'pattern'          => 'Nümunə',
        'patterns'         => 'Nümunələr',
        'authority'        => 'Səlahiyyət',
        'import'           => 'İdxal',
        'excel'            => 'Excel',
        'comparison'       => 'Müqayisə',
        'comparisons'      => 'Müqayisələr',
        'participant'      => 'İştirakçı',
        'participants'     => 'İştirakçılar',
        'field'            => 'Sahə',
        'fields'           => 'Sahələr',
        'stage'            => 'Mərhələ',
        'stages'           => 'Mərhələlər',
        'target'           => 'Hədəf',
        'targets'          => 'Hədəflər',
        'deadline'         => 'Son Tarix',
        'version'          => 'Versiya',
        'versions'         => 'Versiyalar',
        'ai'               => 'AI',
        'llm'              => 'LLM',
        'analysis'         => 'Analiz',
        'recipient'        => 'Alıcı',
        'recipients'       => 'Alıcılar',
        'period'           => 'Dövr',
        'activity'         => 'Fəaliyyət',
        'activities'       => 'Fəaliyyətlər',
        'migration'        => 'Miqrasiya',
        'migrations'       => 'Miqrasiyalar',
        'personal'         => 'Şəxsi',
        'token'            => 'Token',
        'tokens'           => 'Tokenlər',
        'password'         => 'Şifrə',
        'reset'            => 'Sıfırlama',
        'telescope'        => 'Telescope',
    ];

    /**
     * Ümumi sütun adları üçün Azərbaycan dilli etiketlər.
     */
    private const COLUMN_LABELS = [
        'id'                  => 'ID',
        'name'                => 'Ad',
        'first_name'          => 'Ad',
        'last_name'           => 'Soyad',
        'middle_name'         => 'Ata adı',
        'full_name'           => 'Tam ad',
        'email'               => 'E-poçt',
        'phone'               => 'Telefon',
        'username'            => 'İstifadəçi adı',
        'status'              => 'Status',
        'is_active'           => 'Aktiv',
        'created_at'          => 'Yaradılma tarixi',
        'updated_at'          => 'Yenilənmə tarixi',
        'deleted_at'          => 'Silinmə tarixi',
        'institution_id'      => 'Qurum',
        'region_id'           => 'Region',
        'sector_id'           => 'Sektor',
        'school_id'           => 'Məktəb',
        'user_id'             => 'İstifadəçi',
        'student_id'          => 'Şagird',
        'teacher_id'          => 'Müəllim',
        'class_id'            => 'Sinif',
        'subject_id'          => 'Fənn',
        'grade_id'            => 'Qiymət',
        'role_id'             => 'Rol',
        'type'                => 'Tip',
        'description'         => 'Açıqlama',
        'notes'               => 'Qeydlər',
        'note'                => 'Qeyd',
        'date'                => 'Tarix',
        'start_date'          => 'Başlanğıc tarixi',
        'end_date'            => 'Bitmə tarixi',
        'year'                => 'İl',
        'month'               => 'Ay',
        'academic_year'       => 'Tədris ili',
        'score'               => 'Bal',
        'total_score'         => 'Ümumi bal',
        'max_score'           => 'Maksimal bal',
        'percentage'          => 'Faiz',
        'count'               => 'Say',
        'total'               => 'Cəmi',
        'present_count'       => 'İştirak sayı',
        'absent_count'        => 'Qayıb sayı',
        'title'               => 'Başlıq',
        'content'             => 'Məzmun',
        'file_path'           => 'Fayl yolu',
        'file_name'           => 'Fayl adı',
        'file_size'           => 'Fayl ölçüsü',
        'file_type'           => 'Fayl tipi',
        'ip_address'          => 'IP ünvan',
        'is_read'             => 'Oxunub',
        'is_published'        => 'Dərc edilib',
        'published_at'        => 'Dərc tarixi',
        'expires_at'          => 'Bitmə tarixi',
        'approved_at'         => 'Təsdiq tarixi',
        'approved_by'         => 'Təsdiq edən',
        'rejected_at'         => 'Rədd tarixi',
        'rejected_by'         => 'Rədd edən',
        'created_by'          => 'Yaradan',
        'updated_by'          => 'Yeniləyən',
        'deleted_by'          => 'Silən',
        'order'               => 'Sıra',
        'sort_order'          => 'Sıralama',
        'priority'            => 'Prioritet',
        'level'               => 'Səviyyə',
        'parent_id'           => 'Üst element',
        'category'            => 'Kateqoriya',
        'metadata'            => 'Metadata',
        'settings'            => 'Tənzimləmələr',
        'data'                => 'Məlumat',
        'response'            => 'Cavab',
        'message'             => 'Mesaj',
        'reason'              => 'Səbəb',
        'comments'            => 'Şərhlər',
        'slug'                => 'Slug',
        'code'                => 'Kod',
        'value'               => 'Dəyər',
        'is_required'         => 'Məcburidir',
        'is_deleted'          => 'Silinib',
        'is_verified'         => 'Təsdiq edilib',
        'verified_at'         => 'Təsdiq tarixi',
        'birth_date'          => 'Doğum tarixi',
        'gender'              => 'Cins',
        'address'             => 'Ünvan',
    ];

    /**
     * Cədvəl adının insan tərəfindən oxunaqlı Azərbaycan etiketini qaytarır.
     *
     * Prioritet:
     *   1. config/table_labels.php
     *   2. Cache (dinamik / avtomatik yaradılan)
     *   3. Avtomatik snake_case → Azərbaycan humanize
     */
    public function getTableLabel(string $tableName): string
    {
        // 1. Konfiq faylından yoxla
        $labels = config('table_labels', []);
        if (isset($labels[$tableName])) {
            return $labels[$tableName];
        }

        // 2. Cache-dən yoxla
        $cacheKey = 'table_label_' . $tableName;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        // 3. Avtomatik humanize et
        $label = $this->autoHumanize($tableName);

        // Yeni cədvəllər üçün 24 saat cache-lə
        Cache::put($cacheKey, $label, 86400);

        return $label;
    }

    /**
     * Sütun adının Azərbaycan dilli etiketini qaytarır.
     */
    public function getColumnLabel(string $columnName): string
    {
        if (isset(self::COLUMN_LABELS[$columnName])) {
            return self::COLUMN_LABELS[$columnName];
        }

        return $this->autoHumanize($columnName);
    }

    /**
     * Snake_case adı sözlük əsasında Azərbaycan dilinə çevirir.
     *
     * Misal: student_attendance_records → Şagird Davamiyyət Qeydləri
     */
    private function autoHumanize(string $name): string
    {
        $words = explode('_', strtolower($name));
        $translated = [];

        foreach ($words as $word) {
            if ($word === '') {
                continue;
            }

            if (isset(self::WORD_DICTIONARY[$word])) {
                $translation = self::WORD_DICTIONARY[$word];
                // Boş string olan sözləri (məs. 'has') skip et
                if ($translation !== '') {
                    $translated[] = $translation;
                }
            } else {
                // Sözlükdə tapılmadıqda böyük hərflə yaz (texniki söz kimi saxla)
                $translated[] = ucfirst($word);
            }
        }

        return implode(' ', $translated);
    }

    /**
     * Cədvəl etiket cache-ni təmizlə.
     *
     * @param string|null $tableName Verilmədikdə heç nə etmir (toplu sıfırlama üçün Cache::flush istifadə et)
     */
    public function clearCache(?string $tableName = null): void
    {
        if ($tableName !== null) {
            Cache::forget('table_label_' . $tableName);
        }
    }
}
