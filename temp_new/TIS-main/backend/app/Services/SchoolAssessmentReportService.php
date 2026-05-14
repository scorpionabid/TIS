<?php

namespace App\Services;

use App\Models\AssessmentResultField;
use App\Models\ClassAssessmentResult;
use Illuminate\Support\Collection;

class SchoolAssessmentReportService
{
    public function generateReport(int $assessmentTypeId, int $assessmentStageId, array $filters = []): array
    {
        $fields = AssessmentResultField::where('assessment_type_id', $assessmentTypeId)
            ->orderBy('display_order')
            ->get();

        $query = ClassAssessmentResult::with([
            'schoolAssessment.institution.region',
            'schoolAssessment.stage',
            'schoolAssessment.assessmentType',
        ])->whereHas('schoolAssessment', function ($q) use ($assessmentTypeId, $assessmentStageId, $filters) {
            $q->where('assessment_type_id', $assessmentTypeId)
                ->where('assessment_stage_id', $assessmentStageId);

            if (! empty($filters['institution_id'])) {
                $q->where('institution_id', $filters['institution_id']);
            }

            if (! empty($filters['region_id'])) {
                $q->whereHas('institution', function ($sub) use ($filters) {
                    $sub->where('region_id', $filters['region_id']);
                });
            }

            if (! empty($filters['status'])) {
                $q->where('status', $filters['status']);
            }
        });

        if (! empty($filters['class_label'])) {
            $query->where('class_label', $filters['class_label']);
        }

        if (! empty($filters['subject'])) {
            $query->where('subject', $filters['subject']);
        }

        // Pagination support
        $perPage = $filters['per_page'] ?? null;
        $page = $filters['page'] ?? 1;

        if ($perPage) {
            $paginated = $query->paginate($perPage, ['*'], 'page', $page);
            $results = collect($paginated->items());
            $paginationMeta = [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ];
        } else {
            $results = collect($query->get());
            $paginationMeta = null;
        }

        $rows = $results->map(function (ClassAssessmentResult $result) use ($fields) {
            $schoolAssessment = $result->schoolAssessment;
            $institution = $schoolAssessment?->institution;

            $row = [
                'institution_id' => $institution?->id,
                'institution_name' => $institution?->name,
                'region_id' => $institution?->region_id,
                'region_name' => $institution?->region?->name ?? null,
                'class_label' => $result->class_label,
                'grade_level' => $result->grade_level,
                'subject' => $result->subject,
                'scheduled_date' => optional($schoolAssessment?->scheduled_date)?->format('Y-m-d'),
                'recorded_at' => optional($result->recorded_at)?->toDateTimeString(),
                'student_count' => $result->student_count,
                'participant_count' => $result->participant_count,
                'metadata' => [],
            ];

            foreach ($fields as $field) {
                $row['metadata'][$field->field_key] = $result->metadata[$field->field_key] ?? null;
            }

            return $row;
        });

        $response = [
            'fields' => $fields->map(fn ($field) => [
                'key' => $field->field_key,
                'label' => $field->label,
                'input_type' => $field->input_type,
                'scope' => $field->scope,
                'aggregation' => $field->aggregation,
            ]),
            'rows' => $rows,
            'summary' => $this->buildSummary($rows, $fields),
        ];

        if ($paginationMeta) {
            $response['pagination'] = $paginationMeta;
        }

        return $response;
    }

    private function buildSummary(Collection $rows, Collection $fields): array
    {
        $summary = [
            'total_classes' => $rows->count(),
            'total_students' => $rows->sum('student_count'),
            'total_participants' => $rows->sum('participant_count'),
            'fields' => [],
        ];

        foreach ($fields as $field) {
            $values = $rows->pluck("metadata.{$field->field_key}")
                ->filter(fn ($value) => $value !== null && $value !== '');

            if ($values->isEmpty()) {
                $summary['fields'][$field->field_key] = null;

                continue;
            }

            switch ($field->aggregation) {
                case 'average':
                    $summary['fields'][$field->field_key] = round($values->avg(), 2);
                    break;
                case 'max':
                    $summary['fields'][$field->field_key] = $values->max();
                    break;
                case 'min':
                    $summary['fields'][$field->field_key] = $values->min();
                    break;
                case 'sum':
                default:
                    $summary['fields'][$field->field_key] = $values->sum();
                    break;
            }
        }

        return $summary;
    }
}
