<?php

namespace App\Services\Import;

use App\Models\InstitutionType;
use App\Services\Import\Domains\Parsing\DataTypeParser;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * CSV Parser Service for Institution Import
 *
 * ExcelDataParser ilə eyni çıxış formatını təmin edir.
 * Sütun sırası InstitutionExcelTemplateService-dəki getEnhancedHeaders() ilə uyğundur:
 *   A=name, B=short_name, C=institution_code, D=utis_code, E=region_code,
 *   F=contact_info, G=location, H=established_date, I=is_active,
 *   J=parent_id (level>=2),
 *   K=class/group_count, L=student/child_count, M=teacher/educator_count (məktəb/bağça),
 *   N=admin_username, O=admin_email, P=admin_password, Q=first_name, R=last_name,
 *   S=phone, T=department
 */
class InstitutionCsvParserService
{
    public function __construct(
        protected DataTypeParser $dataTypeParser
    ) {}

    /**
     * CSV faylını analiz et və strukturlaşdırılmış massiv qaytar.
     *
     * @param  string  $delimiter  ',' və ya ';'
     */
    public function parseCsvFile(UploadedFile $file, InstitutionType $institutionType, string $delimiter = ','): array
    {
        $content = file_get_contents($file->getPathname());

        // UTF-8 BOM sil
        $content = $this->stripBom($content);

        // Əgər delimiter göstərilməyibsə avtomatik aşkar et
        if ($delimiter === 'auto') {
            $delimiter = $this->detectDelimiter($content);
        }

        Log::info('CSV parse başladı', [
            'file'          => $file->getClientOriginalName(),
            'delimiter'     => $delimiter,
            'size'          => $file->getSize(),
            'institution'   => $institutionType->key,
        ]);

        $rows = $this->parseRawRows($content, $delimiter);

        if (empty($rows)) {
            Log::warning('CSV faylı boşdur', ['file' => $file->getClientOriginalName()]);

            return [];
        }

        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        $data = [];
        $headerRow = 0; // İlk sətir həmişə başlıqdır

        // Sətir 0 başlıqdır → data sətir 1-dən başlayır
        foreach ($rows as $rowIndex => $row) {
            if ($rowIndex === $headerRow) {
                continue; // başlıq sətirini keç
            }

            $csvRowNumber = $rowIndex + 1; // 1-based, başlıq=1 olduğu üçün data 2-dən

            // Tam boş sətirləri keç
            if ($this->isEmptyRow($row)) {
                continue;
            }

            // Minimum sütun sayını təmin et (ən azı 9 sütun olmalıdır)
            $row = array_pad($row, 20, null);

            $rowData = [
                'row'              => $csvRowNumber,
                'name'             => $this->cell($row, 0),
                'short_name'       => $this->cell($row, 1),
                'institution_code' => $this->cell($row, 2),
                'utis_code'        => $this->cell($row, 3),
                'region_code'      => $this->cell($row, 4),
                'contact_info'     => $this->cell($row, 5),
                'location'         => $this->cell($row, 6),
                'established_date' => $this->dataTypeParser->parseDateFromString($this->cell($row, 7)),
                'is_active'        => $this->dataTypeParser->parseActiveStatus($this->cell($row, 8)),
            ];

            // parent_id — level 2+ üçün
            if ($institutionLevel >= 2) {
                $rowData['parent_id'] = $this->dataTypeParser->parseParentId($this->cell($row, 9));
            }

            // Məktəb / bağça xüsusi sahələri
            if (in_array($institutionType->key, [
                'secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb',
                'kindergarten', 'preschool_center', 'nursery', 'primary_school',
            ])) {
                $rowData['class_count']   = (int) $this->cell($row, 10);
                $rowData['student_count'] = (int) $this->cell($row, 11);
                $rowData['teacher_count'] = (int) $this->cell($row, 12);
            }

            // SchoolAdmin — level 4
            if ($institutionLevel === 4) {
                $rowData['schooladmin'] = $this->parseAdminColumns($row, 13);
            }

            // PreschoolAdmin — level 5
            if ($institutionLevel === 5) {
                $rowData['preschooladmin'] = $this->parseAdminColumns($row, 13);
            }

            $data[] = $rowData;
        }

        Log::info('CSV parse tamamlandı', [
            'total_data_rows' => count($data),
            'institution'     => $institutionType->key,
        ]);

        return $data;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Köməkçi metodlar
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Məzmundan xam sətirləri çıxar.
     */
    private function parseRawRows(string $content, string $delimiter): array
    {
        $lines = explode("\n", str_replace("\r\n", "\n", $content));
        $rows  = [];

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $rows[] = str_getcsv($line, $delimiter);
        }

        return $rows;
    }

    /**
     * Admin sütunlarını (N-T, index 13-19) parse et.
     */
    private function parseAdminColumns(array $row, int $startIndex): array
    {
        return [
            'username'   => $this->cell($row, $startIndex),
            'email'      => $this->cell($row, $startIndex + 1),
            'password'   => $this->cell($row, $startIndex + 2),
            'first_name' => $this->cell($row, $startIndex + 3),
            'last_name'  => $this->cell($row, $startIndex + 4),
            'phone'      => $this->cell($row, $startIndex + 5),
            'department' => $this->cell($row, $startIndex + 6),
        ];
    }

    /**
     * Sətirin tam boş olub olmadığını yoxla.
     */
    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim($cell ?? '') !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Hüceyrə dəyərini təmizlənmiş şəkildə qaytar.
     */
    private function cell(array $row, int $index): string
    {
        return trim($row[$index] ?? '');
    }

    /**
     * UTF-8 BOM-u sil.
     */
    public function stripBom(string $content): string
    {
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            return substr($content, 3);
        }

        return $content;
    }

    /**
     * İlk sətirə baxaraq delimiter-i aşkar et.
     *
     * MS Excel AZ versiyası adətən `;` istifadə edir.
     */
    public function detectDelimiter(string $content): string
    {
        $firstLine = strtok($content, "\n");

        $commaCount     = substr_count($firstLine, ',');
        $semicolonCount = substr_count($firstLine, ';');

        return $semicolonCount > $commaCount ? ';' : ',';
    }

    /**
     * Faylın strukturunu (başlıq, sütun sayı) yoxla.
     */
    public function validateFileStructure(UploadedFile $file, string $delimiter): array
    {
        $errors = [];

        $content  = file_get_contents($file->getPathname());
        $content  = $this->stripBom($content);
        $firstLine = strtok($content, "\n");
        $headers  = str_getcsv($firstLine, $delimiter);

        if (count($headers) < 5) {
            $errors[] = "CSV faylında kifayət qədər sütun tapılmadı (ən azı 5 tələb olunur, {$this->count($headers)} tapıldı).";
        }

        return [
            'valid'          => empty($errors),
            'errors'         => $errors,
            'column_count'   => count($headers),
            'detected_delim' => $delimiter,
        ];
    }

    private function count(array $arr): int
    {
        return count($arr);
    }
}
