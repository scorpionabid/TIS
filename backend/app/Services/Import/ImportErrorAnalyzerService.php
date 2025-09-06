<?php

namespace App\Services\Import;

use App\Services\BaseService;

class ImportErrorAnalyzerService extends BaseService
{
    /**
     * Analyze import results and provide detailed error summary
     */
    public function analyzeImportResults(array $results): array
    {
        $analysis = [
            'overall_success' => $this->calculateSuccessRate($results),
            'error_categories' => $this->categorizeErrors($results['errors'] ?? []),
            'warning_analysis' => $this->analyzeWarnings($results['warnings'] ?? []),
            'admin_analysis' => $this->analyzeAdminResults($results),
            'recommendations' => []
        ];

        $analysis['recommendations'] = $this->generateRecommendations($analysis, $results);

        return $analysis;
    }

    /**
     * Calculate overall success rate
     */
    private function calculateSuccessRate(array $results): array
    {
        $total = $results['total_rows'] ?? 0;
        $success = $results['success'] ?? 0;
        $failed = count($results['errors'] ?? []);
        $skipped = $results['skipped'] ?? 0;

        return [
            'total_rows' => $total,
            'successful' => $success,
            'failed' => $failed,
            'skipped' => $skipped,
            'success_rate' => $total > 0 ? round(($success / $total) * 100, 1) : 0,
            'failure_rate' => $total > 0 ? round(($failed / $total) * 100, 1) : 0
        ];
    }

    /**
     * Categorize errors by type
     */
    private function categorizeErrors(array $errors): array
    {
        $categories = [
            'validation_errors' => [],
            'data_format_errors' => [],
            'duplicate_errors' => [],
            'admin_creation_errors' => [],
            'system_errors' => [],
            'unknown_errors' => []
        ];

        foreach ($errors as $error) {
            $category = $this->classifyError($error);
            $categories[$category][] = $error;
        }

        // Add counts
        foreach ($categories as $category => &$errorList) {
            $errorList = [
                'count' => count($errorList),
                'errors' => $errorList
            ];
        }

        return $categories;
    }

    /**
     * Classify individual error
     */
    private function classifyError(string $error): string
    {
        // Validation errors
        if (strpos($error, 'məcburidir') !== false || 
            strpos($error, 'required') !== false ||
            strpos($error, 'boş buraxıla bilməz') !== false) {
            return 'validation_errors';
        }

        // Data format errors
        if (strpos($error, 'format') !== false ||
            strpos($error, 'invalid') !== false ||
            strpos($error, 'telefon') !== false ||
            strpos($error, 'email') !== false) {
            return 'data_format_errors';
        }

        // Duplicate errors
        if (strpos($error, 'duplicate') !== false ||
            strpos($error, 'mövcuddur') !== false ||
            strpos($error, 'təkrarlanır') !== false) {
            return 'duplicate_errors';
        }

        // Admin creation errors
        if (strpos($error, 'admin') !== false ||
            strpos($error, 'Admin') !== false ||
            strpos($error, 'parol') !== false) {
            return 'admin_creation_errors';
        }

        // System errors
        if (strpos($error, 'Database') !== false ||
            strpos($error, 'Connection') !== false ||
            strpos($error, 'SQL') !== false) {
            return 'system_errors';
        }

        return 'unknown_errors';
    }

    /**
     * Analyze warnings
     */
    private function analyzeWarnings(array $warnings): array
    {
        $analysis = [
            'total_warnings' => count($warnings),
            'warning_types' => []
        ];

        $types = [];
        foreach ($warnings as $warning) {
            if (strpos($warning, 'admin') !== false) {
                $types['admin_warnings'] = ($types['admin_warnings'] ?? 0) + 1;
            } elseif (strpos($warning, 'parol') !== false) {
                $types['password_warnings'] = ($types['password_warnings'] ?? 0) + 1;
            } elseif (strpos($warning, 'duplicate') !== false) {
                $types['duplicate_warnings'] = ($types['duplicate_warnings'] ?? 0) + 1;
            } else {
                $types['other_warnings'] = ($types['other_warnings'] ?? 0) + 1;
            }
        }

        $analysis['warning_types'] = $types;
        return $analysis;
    }

    /**
     * Analyze admin creation results
     */
    private function analyzeAdminResults(array $results): array
    {
        $adminStats = $results['admin_statistics'] ?? [];
        
        return [
            'total_institutions' => $results['success'] ?? 0,
            'admins_created' => $adminStats['admins_created'] ?? 0,
            'admins_skipped' => $adminStats['admins_skipped'] ?? 0,
            'admin_errors' => $adminStats['admin_errors'] ?? 0,
            'admin_success_rate' => $this->calculateAdminSuccessRate($adminStats, $results['success'] ?? 0)
        ];
    }

    /**
     * Calculate admin creation success rate
     */
    private function calculateAdminSuccessRate(array $adminStats, int $totalInstitutions): float
    {
        if ($totalInstitutions === 0) return 0.0;
        
        $adminAttempts = ($adminStats['admins_created'] ?? 0) + ($adminStats['admin_errors'] ?? 0);
        if ($adminAttempts === 0) return 0.0;
        
        return round((($adminStats['admins_created'] ?? 0) / $adminAttempts) * 100, 1);
    }

    /**
     * Generate recommendations based on analysis
     */
    private function generateRecommendations(array $analysis, array $results): array
    {
        $recommendations = [];

        // Success rate recommendations
        $successRate = $analysis['overall_success']['success_rate'];
        if ($successRate < 80) {
            $recommendations[] = "⚠️ Uğur nisbəti aşağıdır ({$successRate}%). Template və məlumatları yenidən yoxlayın.";
        }

        // Error category recommendations
        $errorCategories = $analysis['error_categories'];
        
        if ($errorCategories['validation_errors']['count'] > 0) {
            $recommendations[] = "📋 {$errorCategories['validation_errors']['count']} validasiya xətası. Məcburi sahələri doldurun.";
        }

        if ($errorCategories['data_format_errors']['count'] > 0) {
            $recommendations[] = "📝 {$errorCategories['data_format_errors']['count']} format xətası. Telefon və email format-larını yoxlayın.";
        }

        if ($errorCategories['duplicate_errors']['count'] > 0) {
            $recommendations[] = "🔄 {$errorCategories['duplicate_errors']['count']} təkrarlama xətası. Müəssisə kodlarını unikal edin.";
        }

        // Admin recommendations
        $adminAnalysis = $analysis['admin_analysis'];
        if ($adminAnalysis['admin_errors'] > 0) {
            $recommendations[] = "👤 {$adminAnalysis['admin_errors']} admin yaradılma xətası. Admin email-lərini yoxlayın.";
        }

        if ($adminAnalysis['admins_skipped'] > $adminAnalysis['admins_created']) {
            $recommendations[] = "📧 Çox admin atlanıb. Admin Email sütununu doldurmağı unutmayın.";
        }

        return $recommendations;
    }

    /**
     * Generate user-friendly error report
     */
    public function generateErrorReport(array $results): string
    {
        $analysis = $this->analyzeImportResults($results);
        
        $report = "📊 İMPORT NƏTİCƏLƏRİ HESABATI\n";
        $report .= "=" . str_repeat("=", 30) . "\n\n";
        
        // Overall statistics
        $overall = $analysis['overall_success'];
        $report .= "📈 ÜMUMİ STATİSTİKA:\n";
        $report .= "   • Cəmi sətir: {$overall['total_rows']}\n";
        $report .= "   • Uğurla yaradıldı: {$overall['successful']}\n";
        $report .= "   • Xəta ilə qarşılaşdı: {$overall['failed']}\n";
        $report .= "   • Atlandı: {$overall['skipped']}\n";
        $report .= "   • Uğur nisbəti: {$overall['success_rate']}%\n\n";

        // Admin statistics
        $admin = $analysis['admin_analysis'];
        $report .= "👥 ADMİN STATİSTİKASI:\n";
        $report .= "   • Admin yaradıldı: {$admin['admins_created']}\n";
        $report .= "   • Admin atlandı: {$admin['admins_skipped']}\n";
        $report .= "   • Admin xətaları: {$admin['admin_errors']}\n";
        $report .= "   • Admin uğur nisbəti: {$admin['admin_success_rate']}%\n\n";

        // Error breakdown
        $errors = $analysis['error_categories'];
        if (array_sum(array_column($errors, 'count')) > 0) {
            $report .= "❌ XƏTA KATEQORİYALARI:\n";
            foreach ($errors as $category => $data) {
                if ($data['count'] > 0) {
                    $categoryName = $this->getCategoryDisplayName($category);
                    $report .= "   • {$categoryName}: {$data['count']}\n";
                }
            }
            $report .= "\n";
        }

        // Recommendations
        if (!empty($analysis['recommendations'])) {
            $report .= "💡 TÖVSİYƏLƏR:\n";
            foreach ($analysis['recommendations'] as $recommendation) {
                $report .= "   {$recommendation}\n";
            }
        }

        return $report;
    }

    /**
     * Get display name for error category
     */
    private function getCategoryDisplayName(string $category): string
    {
        $names = [
            'validation_errors' => 'Validasiya xətaları',
            'data_format_errors' => 'Məlumat format xətaları',
            'duplicate_errors' => 'Təkrarlama xətaları',
            'admin_creation_errors' => 'Admin yaradılma xətaları',
            'system_errors' => 'Sistem xətaları',
            'unknown_errors' => 'Naməlum xətalar'
        ];

        return $names[$category] ?? $category;
    }
}