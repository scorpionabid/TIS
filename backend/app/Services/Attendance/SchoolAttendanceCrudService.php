<?php

namespace App\Services\Attendance;

use App\Models\SchoolAttendance;

/**
 * Handles create / update / bulk-create business logic for SchoolAttendance records.
 *
 * Responsibilities:
 *  - Duplicate-record detection
 *  - end_count ≤ start_count invariant
 *  - attendance_rate derivation
 */
class SchoolAttendanceCrudService
{
    public function __construct(
        private readonly SchoolAttendanceCalculator $calculator,
    ) {}

    /**
     * Create a new attendance record.
     *
     * @param  array{school_id: int, class_name: string, date: string, start_count: int, end_count: int, notes?: string|null} $data   Validated input.
     * @param  int                                                                                                            $userId ID of the authenticated user creating the record.
     * @return array{record: SchoolAttendance|null, error: string|null, status: int}
     */
    public function store(array $data, int $userId): array
    {
        if ($data['end_count'] > $data['start_count']) {
            return [
                'record' => null,
                'error' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz',
                'status' => 422,
            ];
        }

        $duplicate = SchoolAttendance::where([
            'school_id' => $data['school_id'],
            'class_name' => $data['class_name'],
            'date' => $data['date'],
        ])->exists();

        if ($duplicate) {
            return [
                'record' => null,
                'error' => 'Bu tarix və sinif üçün artıq davamiyyət qeydi mövcuddur',
                'status' => 409,
            ];
        }

        $data['created_by'] = $userId;
        $data['attendance_rate'] = $this->calculator->simpleRate($data['end_count'], $data['start_count']);

        $record = SchoolAttendance::create($data);
        $record->load('school:id,name,type');

        return ['record' => $record, 'error' => null, 'status' => 201];
    }

    /**
     * Update an existing attendance record.
     *
     * @param  array                                                                 $data Validated input (partial — only changed fields).
     * @return array{record: SchoolAttendance|null, error: string|null, status: int}
     */
    public function update(SchoolAttendance $attendance, array $data): array
    {
        $startCount = $data['start_count'] ?? $attendance->start_count;
        $endCount = $data['end_count'] ?? $attendance->end_count;

        if ($endCount > $startCount) {
            return [
                'record' => null,
                'error' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz',
                'status' => 422,
            ];
        }

        if (isset($data['school_id']) || isset($data['class_name']) || isset($data['date'])) {
            $checkFields = [
                'school_id' => $data['school_id'] ?? $attendance->school_id,
                'class_name' => $data['class_name'] ?? $attendance->class_name,
                'date' => $data['date'] ?? $attendance->date,
            ];

            $duplicate = SchoolAttendance::where($checkFields)
                ->where('id', '!=', $attendance->id)
                ->exists();

            if ($duplicate) {
                return [
                    'record' => null,
                    'error' => 'Bu tarix və sinif üçün artıq davamiyyət qeydi mövcuddur',
                    'status' => 409,
                ];
            }
        }

        if (isset($data['start_count']) || isset($data['end_count'])) {
            $data['attendance_rate'] = $this->calculator->simpleRate($endCount, $startCount);
        }

        $attendance->update($data);
        $attendance->load('school:id,name,type');

        return ['record' => $attendance, 'error' => null, 'status' => 200];
    }

    /**
     * Bulk-create attendance records, skipping (and collecting) individual failures.
     *
     * @param  array<int, array>                                                   $records Each element: validated single-record data.
     * @return array{created: int, errors: list<array{index: int, error: string}>}
     */
    public function bulkStore(array $records, int $userId): array
    {
        $created = 0;
        $errors = [];

        foreach ($records as $index => $item) {
            if ($item['end_count'] > $item['start_count']) {
                $errors[] = ['index' => $index, 'error' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz'];

                continue;
            }

            $exists = SchoolAttendance::where([
                'school_id' => $item['school_id'],
                'class_name' => $item['class_name'],
                'date' => $item['date'],
            ])->exists();

            if ($exists) {
                $errors[] = ['index' => $index, 'error' => 'Bu tarix və sinif üçün artıq qeyd mövcuddur'];

                continue;
            }

            try {
                SchoolAttendance::create([
                    'school_id' => $item['school_id'],
                    'class_name' => $item['class_name'],
                    'date' => $item['date'],
                    'start_count' => $item['start_count'],
                    'end_count' => $item['end_count'],
                    'attendance_rate' => $this->calculator->simpleRate($item['end_count'], $item['start_count']),
                    'notes' => $item['notes'] ?? null,
                    'created_by' => $userId,
                ]);
                $created++;
            } catch (\Exception $e) {
                $errors[] = ['index' => $index, 'error' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'errors' => $errors];
    }
}
