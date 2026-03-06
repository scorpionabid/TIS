<?php

namespace App\Imports;

use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class InstitutionsImport implements ToModel, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation
{
    protected $errors = [];

    protected $successCount = 0;

    /**
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        try {
            Log::info('Processing institution import row:', $row);

            // Validate required fields
            if (empty($row['name']) || empty($row['type'])) {
                Log::warning('Skipping row due to missing required fields:', $row);

                return;
            }

            // Check if institution already exists
            if (Institution::where('name', $row['name'])->exists()) {
                Log::warning('Skipping row due to duplicate institution name:', $row);

                return;
            }

            // Find institution type
            $institutionType = InstitutionType::where('key', $row['type'])->first();
            if (! $institutionType) {
                Log::warning('Institution type not found:', ['type' => $row['type']]);

                return;
            }

            // Find parent institution if specified
            $parent = null;
            if (! empty($row['parent_name'])) {
                $parent = Institution::where('name', $row['parent_name'])->first();
                if (! $parent) {
                    Log::warning('Parent institution not found:', ['parent_name' => $row['parent_name']]);
                }
            }

            // Handle UTIS code (optional)
            $utisCode = null;
            if (! empty($row['utis_code'])) {
                $utisCode = trim($row['utis_code']);

                // Validate UTIS code format (must be 7-10 digits)
                if (! preg_match('/^\d{7,10}$/', $utisCode)) {
                    Log::warning('Invalid UTIS code format (must be 7-10 digits):', ['utis_code' => $utisCode, 'row' => $row]);
                    $this->errors[] = "Row {$row['name']}: UTIS kod 7-10 rəqəmli olmalıdır ({$utisCode})";

                    return;
                }

                // Check if UTIS code already exists
                if (Institution::where('utis_code', $utisCode)->exists()) {
                    Log::warning('UTIS code already exists:', ['utis_code' => $utisCode, 'row' => $row]);
                    $this->errors[] = "Row {$row['name']}: UTIS kod artıq mövcuddur ({$utisCode})";

                    return;
                }
            }

            // Generate institution code if not provided
            $institutionCode = ! empty($row['institution_code'])
                ? $row['institution_code']
                : $this->generateInstitutionCode($row['name'], $row['type']);

            // Determine level based on type and parent
            $level = $this->determineLevel($institutionType, $parent);

            // Create institution
            $institution = Institution::create([
                'name' => trim($row['name']),
                'short_name' => ! empty($row['short_name']) ? trim($row['short_name']) : $this->generateShortName($row['name']),
                'type' => $row['type'],
                'utis_code' => $utisCode,
                'parent_id' => $parent ? $parent->id : null,
                'level' => $level,
                'region_code' => ! empty($row['region_code']) ? $row['region_code'] : 'AZ',
                'institution_code' => $institutionCode,
                'contact_info' => json_encode([
                    'phone' => ! empty($row['phone']) ? $row['phone'] : null,
                    'email' => ! empty($row['email']) ? $row['email'] : null,
                ]),
                'location' => json_encode([
                    'region' => ! empty($row['region']) ? $row['region'] : null,
                    'address' => ! empty($row['address']) ? $row['address'] : null,
                ]),
                'metadata' => json_encode([
                    'student_capacity' => ! empty($row['student_capacity']) ? intval($row['student_capacity']) : null,
                    'staff_count' => ! empty($row['staff_count']) ? intval($row['staff_count']) : null,
                    'founded_year' => ! empty($row['founded_year']) ? intval($row['founded_year']) : null,
                ]),
                'is_active' => true,
                'established_date' => ! empty($row['established_date']) ? $row['established_date'] : null,
            ]);

            $this->successCount++;
            Log::info('Successfully imported institution:', ['institution_id' => $institution->id, 'utis_code' => $utisCode]);

            return $institution;
        } catch (\Exception $e) {
            Log::error('Error importing institution:', [
                'row' => $row,
                'error' => $e->getMessage(),
            ]);
            $this->errors[] = 'Row error: ' . $e->getMessage();

            return;
        }
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:institutions,name',
            'short_name' => 'nullable|string|max:100',
            'type' => 'required|string|exists:institution_types,key',
            'parent_name' => 'nullable|string',
            'region_code' => 'nullable|string|max:10',
            'institution_code' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'region' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'student_capacity' => 'nullable|integer|min:1',
            'staff_count' => 'nullable|integer|min:1',
            'founded_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'established_date' => 'nullable|date',
            'utis_code' => 'nullable|string|regex:/^\d{7,10}$/|unique:institutions,utis_code',
        ];
    }

    /**
     * Generate institution code
     */
    private function generateInstitutionCode($name, $type)
    {
        $words = explode(' ', $name);
        $code = '';

        foreach ($words as $word) {
            if (strlen($word) > 0) {
                $code .= strtoupper(substr($word, 0, 1));
            }
        }

        // Add type prefix
        $typePrefix = [
            'ministry' => 'M',
            'regional_office' => 'RO',
            'sector' => 'S',
            'secondary_school' => 'SS',
            'kindergarten' => 'KG',
            'preschool_center' => 'PC',
        ];

        $prefix = $typePrefix[$type] ?? 'IN';

        return $prefix . '-' . $code . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
    }

    /**
     * Generate short name
     */
    private function generateShortName($name)
    {
        $words = explode(' ', $name);
        if (count($words) <= 2) {
            return $name;
        }

        $shortName = '';
        foreach ($words as $word) {
            if (strlen($word) > 2) {
                $shortName .= strtoupper(substr($word, 0, 1));
            }
        }

        return $shortName;
    }

    /**
     * Determine institution level
     */
    private function determineLevel($institutionType, $parent)
    {
        if (! $parent) {
            return 1; // Root level
        }

        return $parent->level + 1;
    }

    public function batchSize(): int
    {
        return 25;
    }

    public function chunkSize(): int
    {
        return 25;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function getSuccessCount()
    {
        return $this->successCount;
    }
}
