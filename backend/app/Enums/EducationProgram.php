<?php

namespace App\Enums;

enum EducationProgram: string
{
    case UMUMI = 'umumi';
    case XUSUSI = 'xususi';
    case MEKTEBDE_FERDI = 'mektebde_ferdi';
    case EVDE_FERDI = 'evde_ferdi';

    /**
     * Get the display name for the education program.
     */
    public function label(): string
    {
        return match($this) {
            self::UMUMI => 'Ümumi təhsil',
            self::XUSUSI => 'Xüsusi təhsil',
            self::MEKTEBDE_FERDI => 'Məktəbdə fərdi təhsil',
            self::EVDE_FERDI => 'Evdə fərdi təhsil',
        };
    }

    /**
     * Get the description for the education program.
     */
    public function description(): string
    {
        return match($this) {
            self::UMUMI => 'Standart ümumi təhsil proqramı',
            self::XUSUSI => 'Xüsusi ehtiyacları olan şagirdlər üçün təhsil',
            self::MEKTEBDE_FERDI => 'Məktəbdə fərdi təhsil proqramı',
            self::EVDE_FERDI => 'Evdə fərdi təhsil proqramı',
        };
    }

    /**
     * Get all education programs as array.
     */
    public static function toArray(): array
    {
        return array_map(
            fn(self $program) => [
                'value' => $program->value,
                'label' => $program->label(),
                'description' => $program->description(),
            ],
            self::cases()
        );
    }

    /**
     * Get all values.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get all labels.
     */
    public static function labels(): array
    {
        return array_map(fn(self $program) => $program->label(), self::cases());
    }

    /**
     * Get label by value.
     */
    public static function getLabelByValue(string $value): ?string
    {
        return self::tryFrom($value)?->label();
    }

    /**
     * Check if value is valid.
     */
    public static function isValid(string $value): bool
    {
        return self::tryFrom($value) !== null;
    }
}
