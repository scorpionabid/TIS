<?php

namespace App\Models;

use App\Models\Traits\HasTypeScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SurveyQuestion extends Model
{
    use HasFactory, HasTypeScope;

    /**
     * Boot the model and set default values for non-nullable fields
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($question) {
            // Set default values for fields that cannot be NULL in SQLite
            if (! isset($question->max_file_size)) {
                $question->max_file_size = 10240; // 10MB default
            }
            if (! isset($question->rating_min)) {
                $question->rating_min = 1;
            }
            if (! isset($question->rating_max)) {
                $question->rating_max = 10;
            }
        });
    }

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
        'table_input' => 'Table Input - Dinamik sətirli cədvəl',
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
     * Get question field as alias for title (frontend compatibility)
     */
    public function getQuestionAttribute(): string
    {
        return $this->title;
    }

    /**
     * Get required field as alias for is_required (frontend compatibility)
     */
    public function getRequiredAttribute(): bool
    {
        return $this->is_required;
    }

    /**
     * Get order field as alias for order_index (frontend compatibility)
     */
    public function getOrderAttribute(): int
    {
        return $this->order_index;
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
    public function validateResponse($responseData, bool $enforceRequired = true): array
    {
        $errors = [];

        if ($enforceRequired && $this->is_required && $this->isEmpty($responseData)) {
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
            case 'table_input':
                $errors = array_merge($errors, $this->validateTableInputResponse($responseData));
                break;
        }

        return $errors;
    }

    /**
     * Check if response is empty
     */
    private function isEmpty($responseData): bool
    {
        if (is_null($responseData)) {
            return true;
        }
        if (is_string($responseData) && trim($responseData) === '') {
            return true;
        }
        if (is_array($responseData) && empty($responseData)) {
            return true;
        }

        return false;
    }

    /**
     * Validate text response
     */
    private function validateTextResponse($response): array
    {
        $errors = [];

        if (! is_string($response)) {
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

        if (! is_numeric($response)) {
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

        if (! is_string($response) && ! is_numeric($response)) {
            $errors[] = 'Seçim cavabı gözlənilir.';

            return $errors;
        }

        // Support both formats: old (string array) and new (object array with id)
        $options = $this->options ?? [];

        // Check if options is array of objects with 'id' key (new format)
        if (! empty($options) && is_array($options[0] ?? null) && isset($options[0]['id'])) {
            // New format: object array with id
            $availableOptions = array_column($options, 'id');
        } else {
            // Old format: simple string array - accept the response value directly
            $availableOptions = $options;
        }

        if (! in_array($response, $availableOptions, true)) {
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

        if (! is_array($response)) {
            $errors[] = 'Çoxseçimli cavab gözlənilir.';

            return $errors;
        }

        // Support both formats: old (string array) and new (object array with id)
        $options = $this->options ?? [];

        // Check if options is array of objects with 'id' key (new format)
        if (! empty($options) && is_array($options[0] ?? null) && isset($options[0]['id'])) {
            // New format: object array with id
            $availableOptions = array_column($options, 'id');
        } else {
            // Old format: simple string array
            $availableOptions = $options;
        }

        foreach ($response as $choice) {
            if (! in_array($choice, $availableOptions, true)) {
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

        if (! is_numeric($response)) {
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

        if (! is_array($response)) {
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

        if (! is_array($response)) {
            $errors[] = 'Cədvəl məlumatları gözlənilir.';

            return $errors;
        }

        $rows = $this->normalizeMatrixRows();

        if (empty($rows)) {
            // Cədvəl strukturu qurulmayıbsa, əlavə validasiya aparmırıq
            return $errors;
        }

        $headers = $this->normalizeMatrixHeaders();

        foreach ($rows as $rowMeta) {
            $rowValue = $this->resolveMatrixRowValue($response, $rowMeta['keys']);

            if ($rowValue === null || $rowValue === '') {
                $errors[] = "\"{$rowMeta['label']}\" sətiri üçün seçim edilməyib.";

                continue;
            }

            if (! empty($headers) && ! $this->isValidMatrixHeaderValue($rowValue, $headers)) {
                $errors[] = 'Seçilən sütun cədvəl strukturu ilə uyğun gəlmir.';
            }
        }

        return $errors;
    }

    private function normalizeMatrixRows(): array
    {
        $rows = $this->table_rows ?? [];
        $normalized = [];

        foreach ($rows as $index => $row) {
            $label = $this->extractMatrixLabel($row, $index, 'Sətir');

            $keys = [$index, (string) $index];

            if (is_array($row)) {
                foreach (['id', 'key', 'value', 'label', 'name'] as $field) {
                    if (isset($row[$field]) && $row[$field] !== '') {
                        $keys[] = (string) $row[$field];
                    }
                }
            } elseif (is_string($row) && $row !== '') {
                $keys[] = $row;
            }

            $normalized[] = [
                'label' => $label,
                'keys' => array_values(array_unique(array_filter($keys, fn ($value) => $value !== '' && $value !== null))),
            ];
        }

        return $normalized;
    }

    private function normalizeMatrixHeaders(): array
    {
        $headers = $this->table_headers ?? [];
        $normalized = [];

        foreach ($headers as $index => $header) {
            $label = $this->extractMatrixLabel($header, $index, 'Sütun');
            $keys = [$index, (string) $index];

            if ($label !== '') {
                $keys[] = $label;
            }

            if (is_array($header)) {
                foreach (['id', 'key', 'value', 'label', 'name'] as $field) {
                    if (isset($header[$field]) && $header[$field] !== '') {
                        $keys[] = (string) $header[$field];
                    }
                }
            }

            $normalized[] = array_values(array_unique(array_filter($keys, fn ($value) => $value !== '' && $value !== null)));
        }

        return $normalized;
    }

    private function resolveMatrixRowValue(array $response, array $keys)
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $response)) {
                $value = $response[$key];

                return $this->extractMatrixCellValue($value);
            }
        }
    }

    private function extractMatrixLabel($item, int $index, string $prefix): string
    {
        if (is_array($item)) {
            foreach (['label', 'value', 'name', 'title'] as $field) {
                if (! empty($item[$field])) {
                    return (string) $item[$field];
                }
            }
        } elseif (is_string($item) && trim($item) !== '') {
            return $item;
        }

        return "{$prefix} " . ($index + 1);
    }

    private function extractMatrixCellValue($value)
    {
        if (is_array($value)) {
            foreach ($value as $cellValue) {
                if ($cellValue !== null && $cellValue !== '') {
                    return $cellValue;
                }
            }

            return;
        }

        return $value;
    }

    private function isValidMatrixHeaderValue($value, array $headers): bool
    {
        $normalizedValue = is_string($value) ? trim($value) : $value;

        foreach ($headers as $headerKeys) {
            foreach ($headerKeys as $headerValue) {
                if ((string) $normalizedValue === (string) $headerValue) {
                    return true;
                }
            }
        }

        return false;
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
                    $count = $ratings->filter(fn ($r) => $r == $i)->count();
                    $summary['rating_stats']['distribution'][$i] = [
                        'count' => $count,
                        'percentage' => $summary['total_responses'] > 0 ? round(($count / $summary['total_responses']) * 100, 2) : 0,
                    ];
                }
                break;
        }

        return $summary;
    }

    /**
     * Validate table_input response
     * Response format: array of rows, each row is associative array with column keys
     */
    private function validateTableInputResponse($response): array
    {
        $errors = [];

        if (! is_array($response)) {
            $errors[] = 'Cədvəl məlumatları gözlənilir.';

            return $errors;
        }

        // Get config from metadata
        $config = $this->metadata['table_input'] ?? [];
        $maxRows = $config['max_rows'] ?? 20;
        $columns = $config['columns'] ?? [];

        // If no columns defined, use table_headers as simple text columns
        if (empty($columns) && ! empty($this->table_headers)) {
            foreach ($this->table_headers as $index => $header) {
                $columns[] = [
                    'key' => 'col_' . ($index + 1),
                    'label' => is_string($header) ? $header : ($header['label'] ?? "Sütun " . ($index + 1)),
                    'type' => 'text',
                ];
            }
        }

        // Validate row count
        if (count($response) > $maxRows) {
            $errors[] = "Maksimum {$maxRows} sətir əlavə edilə bilər.";

            return $errors;
        }

        // Get valid column keys
        $validKeys = array_column($columns, 'key');
        $columnTypes = [];
        foreach ($columns as $col) {
            $columnTypes[$col['key']] = $col['type'] ?? 'text';
        }

        // Validate each row
        foreach ($response as $rowIndex => $row) {
            if (! is_array($row)) {
                $errors[] = "Sətir " . ($rowIndex + 1) . " düzgün formatda deyil.";

                continue;
            }

            // Validate each cell in the row
            foreach ($row as $colKey => $cellValue) {
                if (! in_array($colKey, $validKeys)) {
                    continue; // Skip unknown columns
                }

                $colType = $columnTypes[$colKey] ?? 'text';

                // Skip empty values
                if ($cellValue === null || $cellValue === '') {
                    continue;
                }

                // Validate by column type
                switch ($colType) {
                    case 'number':
                        if (! is_numeric($cellValue)) {
                            $colLabel = $this->getColumnLabel($columns, $colKey);
                            $errors[] = "Sətir " . ($rowIndex + 1) . ", \"{$colLabel}\" sütununda rəqəm gözlənilir.";
                        }
                        break;
                    case 'date':
                        if (! $this->isValidDate($cellValue)) {
                            $colLabel = $this->getColumnLabel($columns, $colKey);
                            $errors[] = "Sətir " . ($rowIndex + 1) . ", \"{$colLabel}\" sütununda düzgün tarix formatı gözlənilir.";
                        }
                        break;
                    case 'text':
                    default:
                        if (! is_string($cellValue) && ! is_numeric($cellValue)) {
                            $colLabel = $this->getColumnLabel($columns, $colKey);
                            $errors[] = "Sətir " . ($rowIndex + 1) . ", \"{$colLabel}\" sütununda mətn gözlənilir.";
                        }
                        break;
                }
            }
        }

        return $errors;
    }

    /**
     * Get column label by key
     */
    private function getColumnLabel(array $columns, string $key): string
    {
        foreach ($columns as $col) {
            if ($col['key'] === $key) {
                return $col['label'] ?? $key;
            }
        }

        return $key;
    }

    /**
     * Check if value is a valid date
     */
    private function isValidDate($value): bool
    {
        if (! is_string($value)) {
            return false;
        }

        try {
            $date = new \DateTime($value);

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
