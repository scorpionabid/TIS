<?php

namespace App\Exceptions;

use Exception;

class GradeBookException extends Exception
{
    protected array $details = [];

    protected string $errorCode;

    public function __construct(string $message, string $errorCode = 'GRADEBOOK_ERROR', array $details = [], int $code = 422)
    {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getDetails(): array
    {
        return $this->details;
    }

    public function toArray(): array
    {
        return [
            'success' => false,
            'error_code' => $this->errorCode,
            'message' => $this->getMessage(),
            'details' => $this->details,
        ];
    }

    // Pre-defined error types
    public static function invalidScore(string $details = ''): self
    {
        return new self('Yanlış bal dəyəri.', 'INVALID_SCORE', ['details' => $details]);
    }

    public static function cellNotFound(int $cellId): self
    {
        return new self("Hüceyrə tapılmadı: #{$cellId}", 'CELL_NOT_FOUND', ['cell_id' => $cellId]);
    }

    public static function gradeBookClosed(): self
    {
        return new self('Bu jurnal bağlanmışdır və dəyişdirilə bilməz.', 'GRADEBOOK_CLOSED', [], 403);
    }

    public static function unauthorized(string $action = 'perform this action'): self
    {
        return new self("Bu əməliyyat üçün icazəniz yoxdur: {$action}", 'UNAUTHORIZED', [], 403);
    }

    public static function validationFailed(array $errors): self
    {
        return new self('Validasiya xətası.', 'VALIDATION_FAILED', ['errors' => $errors]);
    }

    public static function studentNotEnrolled(int $studentId): self
    {
        return new self("Şagird aktiv qeydiyyatda deyil: #{$studentId}", 'STUDENT_NOT_ENROLLED', ['student_id' => $studentId]);
    }

    public static function duplicateEntry(string $field): self
    {
        return new self("Bu {$field} artıq mövcuddur.", 'DUPLICATE_ENTRY', ['field' => $field]);
    }

    public static function excelImportFailed(array $errors): self
    {
        return new self('Excel import xətası.', 'EXCEL_IMPORT_FAILED', ['import_errors' => $errors]);
    }

    public static function calculationError(string $message): self
    {
        return new self("Hesablama xətası: {$message}", 'CALCULATION_ERROR', ['message' => $message]);
    }
}
