<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\BaseController;
use App\Models\AiAnalysisLog;
use App\Services\AI\AiProviderFactory;
use App\Services\AI\DatabaseSchemaService;
use App\Services\AI\PromptEnhancementService;
use App\Services\AI\SafeQueryExecutor;
use App\Services\AI\SmartAnalysisService;
use App\Services\AI\SqlGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAnalysisController extends BaseController
{
    public function __construct(
        private DatabaseSchemaService $schemaService,
        private PromptEnhancementService $promptEnhancementService,
        private SqlGenerationService $sqlGenerationService,
        private SafeQueryExecutor $queryExecutor,
        private SmartAnalysisService $smartAnalysisService
    ) {}

    /**
     * GET /api/ai-analysis/schema
     * DB schema-nı qaytarır (Redis cache ilə, 6 saat).
     * Permission: ai_analysis.view
     */
    public function schema(Request $request): JsonResponse
    {
        $forceRefresh = $request->boolean('refresh', false);
        $schema = $this->schemaService->getSchema($forceRefresh);

        return $this->successResponse([
            'tables' => $schema,
            'total_tables' => count($schema),
            'cached_at' => now()->toISOString(),
        ], 'Schema uğurla alındı');
    }

    /**
     * GET /api/ai-analysis/logs
     * SuperAdmin → bütün loglar, RegionAdmin → yalnız öz logları.
     * Permission: ai_analysis.view
     */
    public function logs(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = AiAnalysisLog::with('user:id,first_name,last_name,username')
            ->orderByDesc('created_at');

        if ($user->hasRole('regionadmin')) {
            $query->where('user_id', $user->id);
        }

        return $this->paginatedResponse($query->paginate(20), 'Loglar uğurla alındı');
    }

    /**
     * POST /api/ai-analysis/enhance-prompt
     * Köhnə axın: yalnız dəqiqləşdirici suallar qaytarır (legacy, hələ dəstəklənir).
     * Permission: ai_analysis.execute
     *
     * @deprecated Yeni axın üçün /analyze endpoint-i istifadə edin.
     */
    public function enhancePrompt(Request $request): JsonResponse
    {
        $request->validate(['prompt' => 'required|string|min:5|max:1000']);

        if (! AiProviderFactory::isConfigured()) {
            return $this->errorResponse(
                'AI provider konfiqurasiya edilməyib. Superadmin AI İdarəetmə səhifəsindən API key əlavə edin.',
                503
            );
        }

        $result = $this->promptEnhancementService->generateClarificationQuestions(
            $request->input('prompt')
        );

        return $this->successResponse($result);
    }

    /**
     * POST /api/ai-analysis/analyze
     *
     * YENİ AXIN — tək AI call ilə həm qərar, həm (mümkünsə) SQL:
     *   - Aydın prompt  → {mode: "sql", ...sqlData}   → Frontend birbaşa execute çağırır
     *   - Qeyri-müəyyən → {mode: "clarify", questions} → Frontend dialog göstərir
     *
     * Bu endpoint köhnə enhance-prompt + execute ikili axınını əvəz edir.
     * Permission: ai_analysis.execute
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate(['prompt' => 'required|string|min:5|max:1000']);

        if (! AiProviderFactory::isConfigured()) {
            return $this->errorResponse(
                'AI provider konfiqurasiya edilməyib. Superadmin AI İdarəetmə səhifəsindən API key əlavə edin.',
                503
            );
        }

        $user = $request->user();
        $userRole = $user->getRoleNames()->first() ?? 'unknown';
        $regionId = $user->hasRole('regionadmin')
            ? ($user->institution?->region_id ?? $user->institution_id)
            : null;

        $result = $this->smartAnalysisService->analyze(
            $request->input('prompt'),
            $userRole,
            $regionId
        );

        return $this->successResponse($result);
    }

    /**
     * POST /api/ai-analysis/execute
     * SQL yaradır (AI və ya manual), validate edir, icra edir.
     * Permission: ai_analysis.execute
     */
    public function execute(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string|min:5|max:1000',
            'clarifications' => 'nullable|array',
            'raw_sql' => 'nullable|string|max:5000',
            'presupplied_sql' => 'nullable|string|max:5000',
        ]);

        $user = $request->user();
        $userRole = $user->getRoleNames()->first() ?? 'unknown';
        $regionId = $user->hasRole('regionadmin')
            ? ($user->institution?->region_id ?? $user->institution_id)
            : null;

        // Audit log başlat
        $log = AiAnalysisLog::create([
            'user_id' => $user->id,
            'user_role' => $userRole,
            'user_institution_id' => $regionId,
            'original_prompt' => $request->input('prompt'),
            'clarifications' => $request->input('clarifications', []),
            'status' => 'pending',
            'ip_address' => $request->ip(),
        ]);

        try {
            $sqlData = $this->resolveSql($request, $userRole, $regionId);

            $result = $this->queryExecutor->execute($sqlData['sql']);

            $tokenUsage = $sqlData['token_usage'] ?? [];
            $log->update([
                'generated_sql' => $sqlData['sql'],
                'enhanced_prompt' => $sqlData['explanation'],
                'row_count' => $result['row_count'],
                'execution_ms' => $result['execution_ms'],
                'prompt_tokens' => $tokenUsage['prompt_tokens'] ?? null,
                'completion_tokens' => $tokenUsage['completion_tokens'] ?? null,
                'total_tokens' => $tokenUsage['total_tokens'] ?? null,
                'from_cache' => $result['from_cache'] ?? false,
                'status' => 'success',
            ]);

            return $this->successResponse([
                'data' => $result['data'],
                'columns' => $result['columns'],
                'row_count' => $result['row_count'],
                'execution_ms' => $result['execution_ms'],
                'sql_used' => $result['sql_used'],
                'explanation' => $sqlData['explanation'],
                'suggested_visualization' => $sqlData['suggested_visualization'],
                'log_id' => $log->id,
                'from_cache' => $result['from_cache'] ?? false,
            ]);
        } catch (\InvalidArgumentException $e) {
            $log->update(['status' => 'blocked', 'error_message' => $e->getMessage()]);

            return $this->errorResponse($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            $log->update(['status' => 'error', 'error_message' => $e->getMessage()]);

            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * SQL mənbəyini müəyyən edir:
     *  1. raw_sql → superadmin manual SQL
     *  2. presupplied_sql → SmartAnalysis-dən gələn SQL (dəqiqləşdirmə tələb etmədi)
     *  3. clarifications → SqlGenerationService ilə SQL yarat
     */
    private function resolveSql(Request $request, string $userRole, ?int $regionId): array
    {
        if ($request->filled('raw_sql')) {
            return [
                'sql' => $request->input('raw_sql'),
                'explanation' => 'Manuel SQL sorğusu',
                'suggested_visualization' => 'table',
            ];
        }

        if ($request->filled('presupplied_sql')) {
            return [
                'sql' => $request->input('presupplied_sql'),
                'explanation' => $request->input('explanation', 'AI tərəfindən yaradılmış SQL'),
                'suggested_visualization' => $request->input('suggested_visualization', 'table'),
            ];
        }

        if (! AiProviderFactory::isConfigured()) {
            throw new \RuntimeException('AI provider konfiqurasiya edilməyib.');
        }

        return $this->sqlGenerationService->generateSql(
            $request->input('prompt'),
            $request->input('clarifications', []),
            $userRole,
            $regionId
        );
    }
}
