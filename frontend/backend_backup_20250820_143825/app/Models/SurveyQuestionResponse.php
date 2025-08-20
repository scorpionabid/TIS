<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyQuestionResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_response_id',
        'survey_question_id',
        'text_response',
        'number_response',
        'date_response',
        'choice_response',
        'rating_response',
        'table_response',
        'file_response',
        'metadata',
    ];

    protected $casts = [
        'number_response' => 'decimal:2',
        'date_response' => 'date',
        'choice_response' => 'array',
        'table_response' => 'array',
        'file_response' => 'array',
        'metadata' => 'array',
    ];

    /**
     * Survey response relationship
     */
    public function surveyResponse(): BelongsTo
    {
        return $this->belongsTo(SurveyResponse::class);
    }

    /**
     * Survey question relationship
     */
    public function surveyQuestion(): BelongsTo
    {
        return $this->belongsTo(SurveyQuestion::class);
    }

    /**
     * Get the actual response value based on question type
     */
    public function getResponseValue()
    {
        $question = $this->surveyQuestion;

        switch ($question->type) {
            case 'text':
                return $this->text_response;
            case 'number':
                return $this->number_response;
            case 'date':
                return $this->date_response;
            case 'single_choice':
            case 'multiple_choice':
                return $this->choice_response;
            case 'rating':
                return $this->rating_response;
            case 'table_matrix':
                return $this->table_response;
            case 'file_upload':
                return $this->file_response;
            default:
                return null;
        }
    }

    /**
     * Set response value based on question type
     */
    public function setResponseValue($value): void
    {
        $question = $this->surveyQuestion;

        // Clear all response fields first
        $this->text_response = null;
        $this->number_response = null;
        $this->date_response = null;
        $this->choice_response = null;
        $this->rating_response = null;
        $this->table_response = null;
        $this->file_response = null;

        // Set the appropriate field based on question type
        switch ($question->type) {
            case 'text':
                $this->text_response = $value;
                break;
            case 'number':
                $this->number_response = is_numeric($value) ? (float) $value : null;
                break;
            case 'date':
                $this->date_response = $value;
                break;
            case 'single_choice':
            case 'multiple_choice':
                $this->choice_response = $value;
                break;
            case 'rating':
                $this->rating_response = is_numeric($value) ? (int) $value : null;
                break;
            case 'table_matrix':
                $this->table_response = $value;
                break;
            case 'file_upload':
                $this->file_response = $value;
                break;
        }
    }

    /**
     * Get formatted response for display
     */
    public function getFormattedResponse(): string
    {
        $question = $this->surveyQuestion;
        $value = $this->getResponseValue();

        if (is_null($value) || $value === '') {
            return 'Cavab verilməyib';
        }

        switch ($question->type) {
            case 'text':
                return (string) $value;
                
            case 'number':
                return number_format($value, 2);
                
            case 'date':
                return $value->format('d.m.Y');
                
            case 'single_choice':
                $option = collect($question->options)->firstWhere('id', $value);
                return $option['label'] ?? 'Naməlum seçim';
                
            case 'multiple_choice':
                if (!is_array($value)) return 'Naməlum seçim';
                $labels = [];
                foreach ($value as $choiceId) {
                    $option = collect($question->options)->firstWhere('id', $choiceId);
                    if ($option) {
                        $labels[] = $option['label'];
                    }
                }
                return implode(', ', $labels);
                
            case 'rating':
                $min_label = $question->rating_min_label ?? '';
                $max_label = $question->rating_max_label ?? '';
                return "{$value} / {$question->rating_max}" . 
                       ($min_label || $max_label ? " ({$min_label} - {$max_label})" : '');
                
            case 'table_matrix':
                if (!is_array($value)) return 'Cədvəl məlumatı';
                $formatted = '';
                foreach ($value as $rowIndex => $row) {
                    $rowLabel = $question->table_rows[$rowIndex]['label'] ?? "Sətir " . ($rowIndex + 1);
                    $formatted .= "{$rowLabel}: " . implode(', ', array_values($row)) . "\n";
                }
                return trim($formatted);
                
            case 'file_upload':
                if (!is_array($value)) return 'Fayl yüklənməyib';
                $fileNames = array_map(function($file) {
                    return basename($file['path'] ?? $file);
                }, $value);
                return implode(', ', $fileNames);
                
            default:
                return 'Naməlum cavab növü';
        }
    }

    /**
     * Check if response is valid for the question
     */
    public function isValid(): bool
    {
        $question = $this->surveyQuestion;
        $value = $this->getResponseValue();
        
        $errors = $question->validateResponse($value);
        return empty($errors);
    }

    /**
     * Get validation errors for response
     */
    public function getValidationErrors(): array
    {
        $question = $this->surveyQuestion;
        $value = $this->getResponseValue();
        
        return $question->validateResponse($value);
    }
}