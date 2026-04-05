<?php

namespace App\Traits;

use App\Models\Subject;
use Illuminate\Support\Facades\Cache;

trait TeacherSubjectMapper
{
    /**
     * Map a subject name (from Excel) to a subject ID in the database.
     *
     * @param string|null $subjectName
     * @return int|null
     */
    protected function mapSubjectNameToId(?string $subjectName): ?int
    {
        if (empty($subjectName)) {
            return null;
        }

        $normalized = strtolower(trim($subjectName));

        // Hardcoded common mappings for performance and fuzzy matching
        // (ID based on the actual DB state captured in research)
        $mapping = [
            'riyaziyyat'                        => 1,
            'azərbaycan dili'                   => 2,
            'azərbaycan dili və ədəbiyyat'      => 2,
            'azərbaycan dili və ədəbiyyatı'     => 2,
            'fizika'                            => 3,
            'kimya'                             => 4,
            'biologiya'                         => 5,
            'ingilis dili'                      => 6,
            'rus dili'                          => 7,
            'ümumi tarix'                       => 8,
            'coğrafiya'                         => 9,
            'informatika'                       => 10,
            'musiqi'                            => 11,
            'təsviri incəsənət'                 => 12,
            'bədən tərbiyəsi'                   => 13,
            'fiziki tərbiyə'                    => 13,
            'azərbaycan tarixi'                 => 14,
            'zəfər tarixi'                      => 15,
            'fiziki-tərbiyə'                    => 13,
            'gənclərin çağırışaqədərki hazırlığı' => 17,
            'ədəbiyyat'                         => 18,
            'texnologiya'                       => 19,
            'həyat bilgisi'                     => 29,
            'çağırışaqədərki hazırlıq'          => 37,
        ];

        if (isset($mapping[$normalized])) {
            return $mapping[$normalized];
        }

        // Fuzzy match if not exact
        foreach ($mapping as $key => $id) {
            if (str_contains($normalized, $key) || str_contains($key, $normalized)) {
                return $id;
            }
        }

        // Last resort: Query the DB
        return Cache::remember('subject_id_' . md5($normalized), 3600, function () use ($normalized) {
            $subject = Subject::where('name', 'ILIKE', $normalized)
                ->orWhere('short_name', 'ILIKE', $normalized)
                ->first();

            return $subject ? $subject->id : null;
        });
    }
}
