<?php

namespace App\Services\Import\Domains\Processing;

use App\Models\Institution;
use App\Models\InstitutionType;

/**
 * Institution Creator Service
 *
 * Creates institution records from parsed row data.
 * Handles complex JSON field validation and type assignment.
 */
class InstitutionCreator
{
    /**
     * Create institution from row data
     *
     * Handles:
     * - JSON field validation for contact_info and location
     * - Dynamic field assignment based on institution type
     * - School-specific fields (class_count, student_count, teacher_count)
     * - Parent hierarchy linkage
     *
     * @param array $rowData
     * @param InstitutionType $institutionType
     * @return Institution
     */
    public function createInstitution(array $rowData, InstitutionType $institutionType): Institution
    {
        // Handle empty contact_info and location - ensure valid JSON
        $contactInfo = !empty($rowData['contact_info']) ? $rowData['contact_info'] : '{}';
        $location = !empty($rowData['location']) ? $rowData['location'] : '{}';

        // Decode JSON if it's a string, otherwise use as-is
        if (is_string($contactInfo)) {
            $contactInfoData = json_decode($contactInfo, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $contactInfoData = []; // Default to empty array if invalid JSON
            }
        } else {
            $contactInfoData = $contactInfo ?: [];
        }

        if (is_string($location)) {
            $locationData = json_decode($location, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $locationData = []; // Default to empty array if invalid JSON
            }
        } else {
            $locationData = $location ?: [];
        }

        $institutionData = [
            'name' => $rowData['name'],
            'short_name' => $rowData['short_name'],
            'institution_code' => $rowData['institution_code'],
            'utis_code' => $rowData['utis_code'],
            'region_code' => $rowData['region_code'] ?: '',
            'contact_info' => $contactInfoData,
            'location' => $locationData,
            'established_date' => $rowData['established_date'],
            'is_active' => $rowData['is_active'],
            'type' => $institutionType->key, // CRITICAL: Missing type field added!
            'institution_type_id' => $institutionType->id,
            'level' => $institutionType->level ?? $institutionType->default_level,
        ];

        // Add parent_id if provided
        if (isset($rowData['parent_id'])) {
            $institutionData['parent_id'] = $rowData['parent_id'];
        }

        // Add school-specific fields
        if (isset($rowData['class_count'])) {
            $institutionData['class_count'] = $rowData['class_count'];
            $institutionData['student_count'] = $rowData['student_count'];
            $institutionData['teacher_count'] = $rowData['teacher_count'];
        }

        return Institution::create($institutionData);
    }
}
