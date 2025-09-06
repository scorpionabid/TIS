<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\InstitutionType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Exception;

class InstitutionImportExportService extends BaseService
{
    /**
     * Generate import template for institutions
     */
    public function generateImportTemplate($institutions, $fileName): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'ID', 'Ad', 'Qısa Ad', 'Növ', 'Valideyn ID', 'Səviyyə', 
            'Region Kodu', 'Qurum Kodu', 'UTIS Kodu', 'Əlaqə Məlumatları', 
            'Ünvan', 'Qurulma Tarixi', 'Açıqlama', 'Status'
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add sample data
        $sampleData = [
            [
                '', 'Nümunə Məktəb', 'NM', 'secondary_school', '26', '4',
                'BA', 'NM001', '', 'phone:+994501234567;email:info@sample.edu.az',
                'Bakı şəhəri, Nəsimi rayonu', '2020-01-01', 'Nümunə məktəb', 'active'
            ]
        ];

        foreach ($sampleData as $rowIndex => $data) {
            foreach ($data as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }

        // Style the sheet
        $sheet->getColumnDimension('A')->setWidth(8);
        $sheet->getColumnDimension('B')->setWidth(25);
        $sheet->getColumnDimension('C')->setWidth(15);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(12);
        $sheet->getColumnDimension('F')->setWidth(10);
        $sheet->getColumnDimension('G')->setWidth(12);
        $sheet->getColumnDimension('H')->setWidth(15);
        $sheet->getColumnDimension('I')->setWidth(15);
        $sheet->getColumnDimension('J')->setWidth(30);
        $sheet->getColumnDimension('K')->setWidth(25);
        $sheet->getColumnDimension('L')->setWidth(15);
        $sheet->getColumnDimension('M')->setWidth(25);
        $sheet->getColumnDimension('N')->setWidth(10);

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process import file and create institutions
     */
    public function processImportFile($file, $institutionIds): array
    {
        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray();
            
            // Remove header row
            array_shift($data);
            
            $results = [
                'success' => 0,
                'errors' => [],
                'created_institutions' => []
            ];

            foreach ($data as $index => $row) {
                try {
                    $rowNum = $index + 2; // Account for header row
                    
                    // Skip empty rows
                    if (empty(trim($row[1]))) {
                        continue;
                    }
                    
                    // Validate required fields
                    if (empty(trim($row[1])) || empty(trim($row[3]))) {
                        $results['errors'][] = "Sətir {$rowNum}: Ad və növ sahələri tələb olunur";
                        continue;
                    }
                    
                    // Prepare institution data
                    $institutionData = [
                        'name' => trim($row[1]),
                        'short_name' => trim($row[2]) ?: null,
                        'type' => trim($row[3]),
                        'parent_id' => !empty(trim($row[4])) ? (int)trim($row[4]) : null,
                        'level' => !empty(trim($row[5])) ? (int)trim($row[5]) : 1,
                        'region_code' => trim($row[6]) ?: null,
                        'institution_code' => trim($row[7]) ?: null,
                        'utis_code' => trim($row[8]) ?: null,
                        'contact_info' => $this->parseContactInfo(trim($row[9])),
                        'location' => ['address' => trim($row[10])],
                        'established_date' => !empty(trim($row[11])) ? trim($row[11]) : null,
                        'metadata' => ['description' => trim($row[12])],
                        'is_active' => trim($row[13]) === 'active'
                    ];
                    
                    // Validate institution type
                    if (!InstitutionType::where('key', $institutionData['type'])->exists()) {
                        $results['errors'][] = "Sətir {$rowNum}: Keçərsiz qurum növü: {$institutionData['type']}";
                        continue;
                    }
                    
                    // Validate parent if specified
                    if ($institutionData['parent_id']) {
                        if (!Institution::where('id', $institutionData['parent_id'])->exists()) {
                            $results['errors'][] = "Sətir {$rowNum}: Valideyn qurum tapılmadı: {$institutionData['parent_id']}";
                            continue;
                        }
                    }
                    
                    // Create institution
                    $institution = Institution::create($institutionData);
                    
                    $results['success']++;
                    $results['created_institutions'][] = [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'type' => $institution->type
                    ];
                    
                } catch (Exception $e) {
                    $results['errors'][] = "Sətir {$rowNum}: " . $e->getMessage();
                }
            }
            
            return $results;
            
        } catch (Exception $e) {
            throw new Exception("Fayl oxunarkən xəta: " . $e->getMessage());
        }
    }

    /**
     * Generate export file for institutions
     */
    public function generateExportFile($institutions, $fileName): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'ID', 'Ad', 'Qısa Ad', 'Növ', 'Valideyn', 'Səviyyə',
            'Region Kodu', 'Qurum Kodu', 'UTIS Kodu', 'Telefon',
            'Email', 'Ünvan', 'Qurulma Tarixi', 'Status', 'Yaradılma Tarixi'
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add data rows
        foreach ($institutions as $index => $institution) {
            $row = $index + 2;
            $contactInfo = is_string($institution->contact_info) ? 
                json_decode($institution->contact_info, true) : $institution->contact_info;
            $location = is_string($institution->location) ? 
                json_decode($institution->location, true) : $institution->location;

            $sheet->setCellValue('A' . $row, $institution->id);
            $sheet->setCellValue('B' . $row, $institution->name);
            $sheet->setCellValue('C' . $row, $institution->short_name);
            $sheet->setCellValue('D' . $row, $institution->institutionType->name ?? $institution->type);
            $sheet->setCellValue('E' . $row, $institution->parent->name ?? '');
            $sheet->setCellValue('F' . $row, $institution->level);
            $sheet->setCellValue('G' . $row, $institution->region_code);
            $sheet->setCellValue('H' . $row, $institution->institution_code);
            $sheet->setCellValue('I' . $row, $institution->utis_code);
            $sheet->setCellValue('J' . $row, $contactInfo['phone'] ?? '');
            $sheet->setCellValue('K' . $row, $contactInfo['email'] ?? '');
            $sheet->setCellValue('L' . $row, $location['address'] ?? '');
            $sheet->setCellValue('M' . $row, $institution->established_date);
            $sheet->setCellValue('N' . $row, $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            $sheet->setCellValue('O' . $row, $institution->created_at);
        }

        // Auto-size columns
        foreach (range('A', 'O') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Generate template by institution type
     */
    public function generateTemplateByType($institutionType, $fileName): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Get type-specific headers
        $headers = $this->getTypeSpecificHeaders($institutionType);
        
        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add sample data based on type
        $sampleData = $this->getTypeSpecificSampleData($institutionType);
        
        foreach ($sampleData as $rowIndex => $data) {
            foreach ($data as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }

        // Auto-size columns
        foreach (range('A', chr(64 + count($headers))) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process import file by type
     */
    public function processImportFileByType($file, $institutionType)
    {
        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray();
            
            // Remove header row
            array_shift($data);
            
            $results = [
                'success' => 0,
                'errors' => [],
                'created_institutions' => []
            ];

            foreach ($data as $index => $row) {
                try {
                    $rowNum = $index + 2;
                    
                    // Skip empty rows
                    if (empty(trim($row[1]))) {
                        continue;
                    }
                    
                    // Process type-specific data
                    $institutionData = $this->processTypeSpecificData($row, $institutionType, $rowNum);
                    
                    if (!$institutionData) {
                        continue; // Skip if validation failed
                    }
                    
                    // Create institution
                    $institution = Institution::create($institutionData);
                    
                    $results['success']++;
                    $results['created_institutions'][] = [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'type' => $institution->type
                    ];
                    
                } catch (Exception $e) {
                    $results['errors'][] = "Sətir {$rowNum}: " . $e->getMessage();
                }
            }
            
            return $results;
            
        } catch (Exception $e) {
            throw new Exception("Fayl oxunarkən xəta: " . $e->getMessage());
        }
    }

    /**
     * Parse contact info string into array
     */
    private function parseContactInfo($contactString): array
    {
        if (empty($contactString)) {
            return [];
        }
        
        $info = [];
        $parts = explode(';', $contactString);
        
        foreach ($parts as $part) {
            if (strpos($part, ':') !== false) {
                list($key, $value) = explode(':', $part, 2);
                $info[trim($key)] = trim($value);
            }
        }
        
        return $info;
    }

    /**
     * Get type-specific headers
     */
    private function getTypeSpecificHeaders($institutionType): array
    {
        $baseHeaders = ['ID', 'Ad', 'Qısa Ad', 'Valideyn ID', 'Səviyyə', 'Region Kodu', 'Qurum Kodu'];
        
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'primary_school':
                return array_merge($baseHeaders, [
                    'Şagird Sayı', 'Müəllim Sayı', 'Sinif Sayı', 'Direktor', 'Telefon', 'Email', 'Ünvan', 'Status'
                ]);
            case 'kindergarten':
                return array_merge($baseHeaders, [
                    'Uşaq Sayı', 'Tərbiyəçi Sayı', 'Qrup Sayı', 'Müdir', 'Telefon', 'Email', 'Ünvan', 'Status'
                ]);
            default:
                return array_merge($baseHeaders, ['Telefon', 'Email', 'Ünvan', 'Açıqlama', 'Status']);
        }
    }

    /**
     * Get type-specific sample data
     */
    private function getTypeSpecificSampleData($institutionType): array
    {
        switch ($institutionType->key) {
            case 'secondary_school':
                return [
                    ['', 'Nümunə Orta Məktəb', 'NOM', '26', '4', 'BA', 'NOM001', '500', '30', '20', 'Əhməd Əliyev', '+994501234567', 'info@sample.edu.az', 'Bakı şəhəri', 'active']
                ];
            case 'kindergarten':
                return [
                    ['', 'Nümunə Uşaq Bağçası', 'NUB', '26', '4', 'BA', 'NUB001', '80', '8', '4', 'Ayşə Məmmədova', '+994551234567', 'info@kindergarten.az', 'Bakı şəhəri', 'active']
                ];
            default:
                return [
                    ['', 'Nümunə Qurum', 'NQ', '25', '3', 'BA', 'NQ001', '+994501234567', 'info@sample.az', 'Bakı şəhəri', 'Nümunə qurum', 'active']
                ];
        }
    }

    /**
     * Process type-specific data from import row
     */
    private function processTypeSpecificData($row, $institutionType, $rowNum): ?array
    {
        // Get appropriate default parent_id based on institution type level
        $defaultParentId = null;
        if ($institutionType->default_level == 4) {
            // For level 4 institutions (schools), try to find a default sector parent
            $defaultSector = Institution::where('level', 3)->first();
            $defaultParentId = $defaultSector ? $defaultSector->id : null;
        }

        $baseData = [
            'name' => trim($row[1]),
            'short_name' => trim($row[2]) ?: null,
            'type' => $institutionType->key,
            'parent_id' => !empty(trim($row[3])) ? (int)trim($row[3]) : $defaultParentId,
            'level' => !empty(trim($row[4])) ? (int)trim($row[4]) : $institutionType->default_level,
            'region_code' => trim($row[5]) ?: null,
            'institution_code' => trim($row[6]) ?: null,
            'is_active' => true // Default to active
        ];

        // Add type-specific fields
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'primary_school':
                $baseData['metadata'] = [
                    'student_count' => !empty(trim($row[7])) ? (int)trim($row[7]) : 0,
                    'teacher_count' => !empty(trim($row[8])) ? (int)trim($row[8]) : 0,
                    'class_count' => !empty(trim($row[9])) ? (int)trim($row[9]) : 0,
                    'director_name' => trim($row[10]) ?: null
                ];
                $baseData['contact_info'] = [
                    'phone' => trim($row[11]) ?: null,
                    'email' => trim($row[12]) ?: null
                ];
                $baseData['location'] = ['address' => trim($row[13])];
                // Set is_active: default to true if empty or 'active'
                $statusValue = trim($row[14]);
                $baseData['is_active'] = empty($statusValue) || $statusValue === 'active';
                break;

            case 'kindergarten':
                $baseData['metadata'] = [
                    'children_count' => !empty(trim($row[7])) ? (int)trim($row[7]) : 0,
                    'educator_count' => !empty(trim($row[8])) ? (int)trim($row[8]) : 0,
                    'group_count' => !empty(trim($row[9])) ? (int)trim($row[9]) : 0,
                    'director_name' => trim($row[10]) ?: null
                ];
                $baseData['contact_info'] = [
                    'phone' => trim($row[11]) ?: null,
                    'email' => trim($row[12]) ?: null
                ];
                $baseData['location'] = ['address' => trim($row[13])];
                // Set is_active: default to true if empty or 'active'
                $statusValue = trim($row[14]);
                $baseData['is_active'] = empty($statusValue) || $statusValue === 'active';
                break;

            default:
                $baseData['contact_info'] = [
                    'phone' => trim($row[7]) ?: null,
                    'email' => trim($row[8]) ?: null
                ];
                $baseData['location'] = ['address' => trim($row[9])];
                $baseData['metadata'] = ['description' => trim($row[10])];
                // Set is_active: default to true if empty or 'active'
                $statusValue = trim($row[11]);
                $baseData['is_active'] = empty($statusValue) || $statusValue === 'active';
                break;
        }

        return $baseData;
    }
}