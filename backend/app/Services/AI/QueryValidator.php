<?php

namespace App\Services\AI;

class QueryValidator
{
    // Qadağan edilmiş SQL açar sözləri (case insensitive)
    private const FORBIDDEN_KEYWORDS = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
        'pg_sleep', 'pg_read_file', 'COPY', 'VACUUM', 'ANALYZE',
        'REINDEX', 'CLUSTER', 'LOCK', 'UNLISTEN', 'LISTEN',
        'NOTIFY', 'DO ', 'CALL ', 'SET ROLE', 'RESET ROLE',
        'SET SESSION', 'ALTER ROLE', 'CREATE ROLE', 'DROP ROLE',
    ];

    /**
     * SQL sorğusunun təhlükəsiz olduğunu yoxlayır
     *
     * @throws \InvalidArgumentException
     */
    public function validate(string $sql): void
    {
        $upperSql = strtoupper(trim($sql));

        // Yalnız SELECT ilə başlamalıdır
        if (!str_starts_with($upperSql, 'SELECT')) {
            throw new \InvalidArgumentException(
                'Yalnız SELECT sorğularına icazə verilir. Daxil edilmiş sorğu SELECT ilə başlamır.'
            );
        }

        // Qadağan edilmiş açar sözlər (word boundary ilə yoxla — created_at kimi sütun adları bloklanmasın)
        foreach (self::FORBIDDEN_KEYWORDS as $keyword) {
            $upperKeyword = strtoupper(trim($keyword));
            // Boşluqla bitən keyword-lər (DO , CALL ) — str_contains kifayətdir
            if (str_ends_with($keyword, ' ')) {
                if (str_contains($upperSql, $upperKeyword)) {
                    throw new \InvalidArgumentException(
                        "Sorğuda icazəsiz əməliyyat aşkar edildi: " . trim($keyword)
                    );
                }
            } else {
                // Söz sərhədi ilə yoxla: boşluq, nöqtəli vergül, yeni sətir, sətir başlanğıcı
                if (preg_match('/(?<![A-Z0-9_])' . preg_quote($upperKeyword, '/') . '(?![A-Z0-9_])/i', $upperSql)) {
                    throw new \InvalidArgumentException(
                        "Sorğuda icazəsiz əməliyyat aşkar edildi: {$keyword}"
                    );
                }
            }
        }

        // SQL injection cəhdi: stacked queries
        $strippedFromStrings = preg_replace("/'[^']*'/", "''", $sql);
        $semicolonCount = substr_count($strippedFromStrings, ';');
        if ($semicolonCount > 1) {
            throw new \InvalidArgumentException(
                'Birdən çox SQL cümləsi qadağandır.'
            );
        }

        // Comment injection
        if (str_contains($sql, '--') || preg_match('/\/\*.*\*\//s', $sql)) {
            throw new \InvalidArgumentException(
                'SQL şərhlərindən istifadə qadağandır.'
            );
        }
    }

    /**
     * RegionAdmin üçün region filter yoxlaması
     * Sorğuda region_id filtrinin olduğunu yoxlayır
     */
    public function validateRegionFilter(string $sql, int $regionId): bool
    {
        $upperSql = strtoupper($sql);
        // region_id = X və ya region_id=X formatını yoxla
        return (bool) preg_match('/REGION_ID\s*=\s*' . $regionId . '\b/', $upperSql);
    }
}
