<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class SurveyQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_id',
        'title',
        'description',
        'type',
        'order_index',
        'is_required',
        'is_active',
        'options',
        'validation_rules',
        'metadata',
        'min_value',
        'max_value',
        'min_length',
        'max_length',
        'allowed_file_types',
        'max_file_size',
        'rating_min',
        'rating_max',
        'rating_min_label',
        'rating_max_label',
        'table_headers',
        'table_rows',
        'translations',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'options' => 'array',
        'validation_rules' => 'array',
        'metadata' => 'array',
        'min_value' => 'decimal:2',
        'max_value' => 'decimal:2',
        'allowed_file_types' => 'array',
        'table_headers' => 'array',
        'table_rows' => 'array',
        'translations' => 'array',
    ];

    // Constants for question types from PRD-2
    const TYPES = [
        'text' => 'Text Input - Açıq cavab sahələri',
        'number' => 'Number Input - Rəqəmsal məlumatlar',
        'date' => 'Date Picker - Tarix seçimi',
        'single_choice' => 'Single Choice - Radio button seçimlər',
        'multiple_choice' => 'Multiple Choice - Checkbox seçimlər',
        'file_upload' => 'File Upload - PDF, Excel (max 10MB)',
        'rating' => 'Rating Scale - 1-10 qiymətləndirmə',
        'table_matrix' => 'Table/Matrix - Strukturlaşdırılmış cədvəl',
    ];

    /**
     * Survey relationship
     */
    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    /**
     * Question responses relationship
     */
    public function responses(): HasMany
    {
        return $this->hasMany(SurveyQuestionResponse::class);
    }

    /**
     * Scope: Active questions
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Required questions
     */
    public function scopeRequired(Builder $query): Builder
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope: By type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Ordered questions
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order_index', 'asc');
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    /**
     * Get translated title
     */
    public function getTranslatedTitle(string $language = 'az'): string
    {
        if ($this->translations && isset($this->translations[$language]['title'])) {
            return $this->translations[$language]['title'];
        }
        
        return $this->title;
    }

    /**
     * Get translated description
     */
    public function getTranslatedDescription(string $language = 'az'): ?string
    {
        if ($this->translations && isset($this->translations[$language]['description'])) {
            return $this->translations[$language]['description'];
        }
        
        return $this->description;
    }

    /**
     * Validate response data
     */
    public function validateResponse($responseData): array
    {
        $errors = [];

        if ($this->is_required && $this->isEmpty($responseData)) {
            $errors[] = 'Bu sual mütləqdir və cavablandırılmalıdır.';
            return $errors;
        }

        if ($this->isEmpty($responseData)) {
            return $errors; // No further validation for empty optional questions
        }

        switch ($this->type) {
            case 'text':
                $errors = array_merge($errors, $this->validateTextResponse($responseData));
                break;
            case 'number':
                $errors = array_merge($errors, $this->validateNumberResponse($responseData));
                break;
            case 'date':
                $errors = array_merge($errors, $this->validateDateResponse($responseData));
                break;
            case 'single_choice':
                $errors = array_merge($errors, $this->validateSingleChoiceResponse($responseData));
                break;
            case 'multiple_choice':
                $errors = array_merge($errors, $this->validateMultipleChoiceResponse($responseData));
                break;
            case 'rating':
                $errors = array_merge($errors, $this->validateRatingResponse($responseData));
                break;
            case 'file_upload':
                $errors = array_merge($errors, $this->validateFileResponse($responseData));
                break;
            case 'table_matrix':
                $errors = array_merge($errors, $this->validateTableResponse($responseData));
                break;
        }

        return $errors;
    }

    /**
     * Check if response is empty
     */
    private function isEmpty($responseData): bool
    {
        if (is_null($responseData)) return true;
        if (is_string($responseData) && trim($responseData) === '') return true;
        if (is_array($responseData) && empty($responseData)) return true;
        
        return false;
    }

    /**
     * Validate text response
     */
    private function validateTextResponse($response): array
    {
        $errors = [];
        
        if (!is_string($response)) {
            $errors[] = 'Mətn cavabı gözlənilir.';
            return $errors;
        }

        $length = mb_strlen($response);

        if ($this->min_length && $length < $this->min_length) {
            $errors[] = "Minimum {$this->min_length} xarakter olmalıdır.";
        }

        if ($this->max_length && $length > $this->max_length) {
            $errors[] = "Maksimum {$this->max_length} xarakter ola bilər.";
        }

        return $errors;
    }

    /**
     * Validate number response
     */
    private function validateNumberResponse($response): array
    {
        $errors = [];
        
        if (!is_numeric($response)) {
            $errors[] = 'Rəqəm gözlənilir.';
            return $errors;
        }

        $number = (float) $response;

        if ($this->min_value && $number < $this->min_value) {
            $errors[] = "Minimum dəyər {$this->min_value} olmalıdır.";
        }

        if ($this->max_value && $number > $this->max_value) {
            $errors[] = "Maksimum dəyər {$this->max_value} ola bilər.";
        }

        return $errors;
    }

    /**
     * Validate date response
     */
    private function validateDateResponse($response): array
    {
        $errors = [];
        
        try {
            $date = new \DateTime($response);
        } catch (\Exception $e) {
            $errors[] = 'Düzgün tarix formatı gözlənilir (YYYY-MM-DD).';
        }

        return $errors;
    }

    /**
     * Validate single choice response
     */
    private function validateSingleChoiceResponse($response): array
    {
        $errors = [];
        
        if (!is_string($response) && !is_numeric($response)) {
            $errors[] = 'Seçim cavabı gözlənilir.';
            return $errors;
        }

        $availableOptions = array_column($this->options ?? [], 'id');
        if (!in_array($response, $availableOptions)) {
            $errors[] = 'Mövcud seçimlərdən birini seçin.';
        }

        return $errors;
    }

    /**
     * Validate multiple choice response
     */
    private function validateMultipleChoiceResponse($response): array
    {
        $errors = [];
        
        if (!is_array($response)) {
            $errors[] = 'Çoxseçimli cavab gözlənilir.';
            return $errors;
        }

        $availableOptions = array_column($this->options ?? [], 'id');
        foreach ($response as $choice) {
            if (!in_array($choice, $availableOptions)) {
                $errors[] = 'Bütün seçimlər mövcud seçimlərdən olmalıdır.';
                break;
            }
        }

        return $errors;
    }

    /**
     * Validate rating response
     */
    private function validateRatingResponse($response): array
    {
        $errors = [];
        
        if (!is_numeric($response)) {
            $errors[] = 'Qiymətləndirmə rəqəmi gözlənilir.';
            return $errors;
        }

        $rating = (int) $response;
        $min = $this->rating_min ?? 1;
        $max = $this->rating_max ?? 10;

        if ($rating < $min || $rating > $max) {
            $errors[] = "Qiymətləndirmə {$min} və {$max} arasında olmalıdır.";
        }

        return $errors;
    }

    /**
     * Validate file response
     */
    private function validateFileResponse($response): array
    {
        $errors = [];
        
        if (!is_array($response)) {
            $errors[] = 'Fayl məlumatları gözlənilir.';
            return $errors;
        }

        // File validation would be done during upload
        // This is just structural validation

        return $errors;
    }

    /**
     * Validate table response
     */
    private function validateTableResponse($response): array
    {
        $errors = [];
        
        if (!is_array($response)) {
            $errors[] = 'Cədvəl məlumatları gözlənilir.';
            return $errors;
        }

        // Validate that all required table cells are filled
        $headers = $this->table_headers ?? [];
        $rows = $this->table_rows ?? [];

        foreach ($rows as $rowIndex => $row) {
            foreach ($headers as $headerIndex => $header) {
                if (!isset($response[$rowIndex][$headerIndex])) {
                    $errors[] = "Cədvəldə bütün xanalar doldurulmalıdır.";
                    return $errors;
                }
            }
        }

        return $errors;
    }

    /**
     * Get response summary for analytics
     */
    public function getResponseSummary(): array
    {
        $summary = [
            'total_responses' => $this->responses()->count(),
            'response_rate' => 0,
        ];

        if ($this->survey->estimated_recipients > 0) {
            $summary['response_rate'] = round(
                ($summary['total_responses'] / $this->survey->estimated_recipients) * 100, 
                2
            );
        }

        switch ($this->type) {
            case 'text':
                $summary['text_responses'] = $this->responses()
                    ->whereNotNull('text_response')
                    ->pluck('text_response')
                    ->take(10); // Sample responses
                break;

            case 'number':
                $numbers = $this->responses()
                    ->whereNotNull('number_response')
                    ->pluck('number_response');
                
                $summary['number_stats'] = [
                    'count' => $numbers->count(),
                    'average' => $numbers->avg(),
                    'min' => $numbers->min(),
                    'max' => $numbers->max(),
                ];
                break;

            case 'single_choice':
            case 'multiple_choice':
                $choices = $this->responses()
                    ->whereNotNull('choice_response')
                    ->pluck('choice_response');
                
                $summary['choice_distribution'] = [];
                foreach ($this->options ?? [] as $option) {
                    $count = 0;
                    foreach ($choices as $choice) {
                        if ($this->type === 'single_choice' && $choice === $option['id']) {
                            $count++;
                        } elseif ($this->type === 'multiple_choice' && is_array($choice) && in_array($option['id'], $choice)) {
                            $count++;
                        }
                    }
                    $summary['choice_distribution'][$option['id']] = [
                        'label' => $option['label'],
                        'count' => $count,
                        'percentage' => $summary['total_responses'] > 0 ? round(($count / $summary['total_responses']) * 100, 2) : 0,
                    ];
                }
                break;

            case 'rating':
                $ratings = $this->responses()
                    ->whereNotNull('rating_response')
                    ->pluck('rating_response');
                
                $summary['rating_stats'] = [
                    'count' => $ratings->count(),
                    'average' => round($ratings->avg(), 2),
                    'distribution' => [],
                ];

                for ($i = $this->rating_min; $i <= $this->rating_max; $i++) {
                    $count = $ratings->filter(fn($r) => $r == $i)->count();
                    $summary['rating_stats']['distribution'][$i] = [
                        'count' => $count,
                        'percentage' => $summary['total_responses'] > 0 ? round(($count / $summary['total_responses']) * 100, 2) : 0,
                    ];
                }
                break;
        }

        return $summary;
    }
}