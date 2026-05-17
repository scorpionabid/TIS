<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Support\Facades\Log;

/**
 * CSV Template Generator for Institution Import
 *
 * InstitutionExcelTemplateService ilə eyni header strukturunu CSV formatında
 * UTF-8 BOM ilə export edir.
 */
class InstitutionCsvTemplateService
{
    /**
     * Müəssisə növünə görə CSV template yarat
     *
     * @param  string $institutionTypeKey  Məs: 'secondary_school'
     * @param  string $delimiter           ',' və ya ';'
     * @return string                      Faylın tam yolu (storage/app/temp/)
     */
    public function generateTemplateByType(string $institutionTypeKey, string $delimiter = ','): string
    {
        $institutionType = InstitutionType::where('key', $institutionTypeKey)->firstOrFail();
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        $headers = $this->buildHeaders($institutionType, $institutionLevel);
        $sampleRow = $this->buildSampleRow($institutionType, $institutionLevel, $delimiter);

        $fileName = "muessise_csv_sablonu_{$institutionTypeKey}_" . date('Y-m-d_H-i-s') . '.csv';
        $filePath = storage_path('app/temp/' . $fileName);

        if (! is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $handle = fopen($filePath, 'w');

        // UTF-8 BOM — Excel-də Azərbaycan simvolları düzgün görünsün
        fwrite($handle, "\xEF\xBB\xBF");

        // Başlıq sətiri
        fputcsv($handle, $headers, $delimiter, '"', '\\');

        // Nümunə sətir
        fputcsv($handle, $sampleRow, $delimiter, '"', '\\');

        fclose($handle);

        Log::info('CSV template yaradıldı', [
            'institution_type' => $institutionTypeKey,
            'delimiter'        => $delimiter,
            'file'             => $fileName,
            'columns'          => count($headers),
        ]);

        return $filePath;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Başlıq sütunları
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Müəssisə növünə uyğun sütun başlıqlarını qaytar.
     *
     * Sütun sırası InstitutionCsvParserService::parseCsvFile() ilə
     * tam uyğun olmalıdır (A→0, B→1, ..., T→19).
     */
    private function buildHeaders(InstitutionType $institutionType, int $level): array
    {
        $base = [
            'Ad (name)*',
            'Qısa Ad (short_name)',
            'Müəssisə Kodu (institution_code)',
            'UTIS Kod (utis_code)' . ($level === 5 ? '*' : ''),
            'Region Kodu (region_code)',
            'Əlaqə Məlumatları (contact_info)',
            'Yer Məlumatları (location)',
            'Təsis Tarixi (established_date)',
            'Status (is_active): aktiv/qeyri-aktiv',
        ];

        if ($level >= 2) {
            $base[] = 'Üst Müəssisə ID (parent_id)';
        }

        // Məktəb / bağça xüsusi sütunlar
        if (in_array($institutionType->key, [
            'secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb', 'primary_school',
        ])) {
            $base[] = 'Sinif Sayı';
            $base[] = 'Şagird Sayı';
            $base[] = 'Müəllim Sayı';
        } elseif (in_array($institutionType->key, [
            'kindergarten', 'preschool_center', 'nursery',
        ])) {
            $base[] = 'Qrup Sayı';
            $base[] = 'Uşaq Sayı';
            $base[] = 'Tərbiyəçi Sayı';
        } else {
            // Digər növlər — sütun yerini qorumaq üçün boş başlıq
            $base[] = '';
            $base[] = '';
            $base[] = '';
        }

        // Admin sütunları (level 4 = SchoolAdmin, level 5 = PreschoolAdmin)
        if ($level === 4 || $level === 5) {
            $adminPrefix = $level === 4 ? 'SchoolAdmin' : 'PreschoolAdmin';
            $base[] = "{$adminPrefix} İstifadəçi Adı*";
            $base[] = "{$adminPrefix} Email*";
            $base[] = "{$adminPrefix} Şifrə*";
            $base[] = "{$adminPrefix} Ad";
            $base[] = "{$adminPrefix} Soyad";
            $base[] = "{$adminPrefix} Telefon";
            $base[] = "{$adminPrefix} Şöbə";
        }

        return $base;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Nümunə sətir
    // ──────────────────────────────────────────────────────────────────────────

    private function buildSampleRow(InstitutionType $institutionType, int $level, string $delimiter): array
    {
        $parentId = '';
        if ($level >= 2) {
            $parent = Institution::where('level', '<', $level)->where('is_active', true)->first();
            $parentId = $parent ? (string) $parent->id : '';
        }

        $base = [
            'Nümunə ' . ($institutionType->label_az ?? $institutionType->name),
            'NM001',
            'INST001',
            '123456789',
            'BAK',
            '{"phone":"+994501234567","email":"info@example.com"}',
            '{"address":"Bakı şəhəri, Nəsimi rayonu"}',
            '2000-01-01',
            'aktiv',
        ];

        if ($level >= 2) {
            $base[] = $parentId;
        }

        if (in_array($institutionType->key, [
            'secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb', 'primary_school',
            'kindergarten', 'preschool_center', 'nursery',
        ])) {
            $base[] = '10';
            $base[] = '300';
            $base[] = '25';
        } else {
            $base[] = '';
            $base[] = '';
            $base[] = '';
        }

        if ($level === 4 || $level === 5) {
            $base[] = 'admin001';
            $base[] = 'admin@example.edu.az';
            $base[] = 'SecurePass123!';
            $base[] = 'Admin';
            $base[] = 'Nümunəvi';
            $base[] = '+994501234567';
            $base[] = 'İdarəetmə';
        }

        return $base;
    }
}
