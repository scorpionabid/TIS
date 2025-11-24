<?php

namespace App\Services\Import\Domains\FileOperations;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Excel File Loading Service
 *
 * Handles file validation and loading for Excel imports.
 * Validates file size, extension, and loads spreadsheet.
 */
class ExcelFileLoader
{
    /**
     * Maximum file size in bytes (10MB)
     */
    protected const MAX_FILE_SIZE = 10485760;

    /**
     * Allowed file extensions
     */
    protected const ALLOWED_EXTENSIONS = ['xlsx', 'xls'];

    /**
     * Load and validate Excel file structure
     *
     * @throws \Exception
     */
    public function loadExcelFile(UploadedFile $file): Spreadsheet
    {
        // Validate file
        if (! $file->isValid()) {
            throw new \Exception('Fayl yüklənmədi və ya zədələnib');
        }

        // Check file size (10MB limit)
        if ($file->getSize() > self::MAX_FILE_SIZE) {
            throw new \Exception('Fayl ölçüsü 10MB-dan böyük ola bilməz');
        }

        // Check file extension
        $extension = $file->getClientOriginalExtension();
        if (! in_array(strtolower($extension), self::ALLOWED_EXTENSIONS)) {
            throw new \Exception('Yalnız Excel faylları (.xlsx, .xls) qəbul edilir');
        }

        // Load spreadsheet
        try {
            return IOFactory::load($file->getPathname());
        } catch (\Exception $e) {
            throw new \Exception('Excel faylı oxuna bilmədi: ' . $e->getMessage());
        }
    }
}
