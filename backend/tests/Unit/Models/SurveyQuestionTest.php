<?php

namespace Tests\Unit\Models;

use App\Models\SurveyQuestion;
use Tests\TestCase;

class SurveyQuestionTest extends TestCase
{
    public function test_table_matrix_accepts_label_based_responses(): void
    {
        $question = new SurveyQuestion([
            'type' => 'table_matrix',
            'is_required' => true,
            'table_rows' => ['Row A', 'Row B'],
            'table_headers' => ['Option 1', 'Option 2'],
        ]);

        $errors = $question->validateResponse([
            'Row A' => 'Option 1',
            'Row B' => 'Option 2',
        ], true);

        $this->assertEmpty($errors);
    }

    public function test_table_matrix_accepts_index_based_responses(): void
    {
        $question = new SurveyQuestion([
            'type' => 'table_matrix',
            'is_required' => true,
            'table_rows' => ['Row A', 'Row B'],
            'table_headers' => ['Option 1', 'Option 2'],
        ]);

        $errors = $question->validateResponse([
            0 => 'Option 1',
            1 => 'Option 2',
        ], true);

        $this->assertEmpty($errors);
    }

    public function test_table_matrix_accepts_array_row_values(): void
    {
        $question = new SurveyQuestion([
            'type' => 'table_matrix',
            'is_required' => true,
            'table_rows' => ['Row A', 'Row B'],
            'table_headers' => ['Option 1', 'Option 2'],
        ]);

        $errors = $question->validateResponse([
            'Row A' => ['Option 1'],
            'Row B' => ['Option 2'],
        ], true);

        $this->assertEmpty($errors);
    }

    public function test_table_matrix_requires_all_rows(): void
    {
        $question = new SurveyQuestion([
            'type' => 'table_matrix',
            'is_required' => true,
            'table_rows' => ['Row A', 'Row B'],
            'table_headers' => ['Option 1', 'Option 2'],
        ]);

        $errors = $question->validateResponse([
            'Row A' => 'Option 1',
        ], true);

        $this->assertNotEmpty($errors);
    }

    public function test_table_matrix_rejects_invalid_headers(): void
    {
        $question = new SurveyQuestion([
            'type' => 'table_matrix',
            'is_required' => true,
            'table_rows' => ['Row A', 'Row B'],
            'table_headers' => ['Option 1', 'Option 2'],
        ]);

        $errors = $question->validateResponse([
            'Row A' => 'Invalid',
            'Row B' => 'Option 1',
        ], true);

        $this->assertNotEmpty($errors);
    }
}
