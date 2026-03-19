<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\BaseController;
use App\Models\AiAnalysisLog;
use App\Services\AI\AiProviderFactory;
use App\Services\AI\DatabaseSchemaService;
use App\Services\AI\PromptEnhancementService;
use App\Services\AI\SafeQueryExecutor;
use App\Services\AI\SqlGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAnalysisController extends BaseController
{
    public function __construct(
        private DatabaseSchemaService $schemaService,
        private PromptEnhancementService $promptEnhancementService,
        private SqlGenerationService $sqlGenerationService,
        private SafeQueryExecutor $queryExecutor
    ) {}

    /**
     * DB schema-nı qaytarır (cache ilə).
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
     * AI analiz loglarını qaytarır.
     * SuperAdmin — bütün loglar, regionadmin — yalnız öz logları.
     * Permission: ai_analysis.view
     */
    public function logs(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AiAnalysisLog::with('user:id,first_name,last_name,username')
            ->orderByDesc('created_at');

        // Regionadmin yalnız öz loglarını görür
        if ($user->hasRole('regionadmin')) {
            $query->where('user_id', $user->id);
        }

        $logs = $query->paginate(20);

        return $this->paginatedResponse($logs, 'Loglar uğurla alındı');
    }

    /**
     * POST /api/ai-analysis/enhance-prompt
     * İstifadəçinin promptu əsasında dəqiqləşdirici suallar qaytarır
     * Permission: ai_analysis.execute
     */
    public function enhancePrompt(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string|min:5|max:1000',
        ]);

        // AI konfiqurasiya yoxlaması
        if (!AiProviderFactory::isConfigured()) {
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
     * POST /api/ai-analysis/execute
     * SQL yaradır, validate edir, icra edir, nəticəni qaytarır
     * Permission: ai_analysis.execute
     */
    public function execute(Request $request): JsonResponse
    {
        $request->validate([
            'prompt'         => 'required|string|min:5|max:1000',
            'clarifications' => 'nullable|array',
            'raw_sql'        => 'nullable|string|max:5000',
        ]);

        $user     = $request->user();
        $userRole = $user->getRoleNames()->first() ?? 'unknown';
        $regionId = null;

        // RegionAdmin üçün institution region id-ni tap
        if ($user->hasRole('regionadmin')) {
            $regionId = $user->institution?->region_id ?? $user->institution_id;
        }

        // Audit log başlat
        $log = AiAnalysisLog::create([
            'user_id'             => $user->id,
            'user_role'           => $userRole,
            'user_institution_id' => $regionId,
            'original_prompt'     => $request->input('prompt'),
            'clarifications'      => $request->input('clarifications', []),
            'status'              => 'pending',
            'ip_address'          => $request->ip(),
        ]);

        try {
            // SQL ya manual ya da AI ilə yaradılır
            if ($request->filled('raw_sql')) {
                // Manual SQL mode (superadmin üçün)
                $sqlData = [
                    'sql'                    => $request->input('raw_sql'),
                    'explanation'            => 'Manuel SQL sorğusu',
                    'suggested_visualization' => 'table',
                ];
            } else {
                // AI SQL generasiyası
                if (!AiProviderFactory::isConfigured()) {
                    throw new \RuntimeException('AI provider konfiqurasiya edilməyib.');
                }

                $sqlData = $this->sqlGenerationService->generateSql(
                    $request->input('prompt'),
                    $request->input('clarifications', []),
                    $userRole,
                    $regionId
                );
            }

            // SQL icra et
            $result = $this->queryExecutor->execute($sqlData['sql']);

            // Log yenilə - uğurlu
            $log->update([
                'generated_sql'  => $sqlData['sql'],
                'enhanced_prompt' => $sqlData['explanation'],
                'row_count'      => $result['row_count'],
                'execution_ms'   => $result['execution_ms'],
                'status'         => 'success',
            ]);

            return $this->successResponse([
                'data'                   => $result['data'],
                'columns'                => $result['columns'],
                'row_count'              => $result['row_count'],
                'execution_ms'           => $result['execution_ms'],
                'sql_used'               => $result['sql_used'],
                'explanation'            => $sqlData['explanation'],
                'suggested_visualization' => $sqlData['suggested_visualization'],
                'log_id'                 => $log->id,
            ]);

        } catch (\InvalidArgumentException $e) {
            // SQL validation xətası
            $log->update(['status' => 'blocked', 'error_message' => $e->getMessage()]);

            return $this->errorResponse($e->getMessage(), 422);

        } catch (\RuntimeException $e) {
            // Execution xətası
            $log->update(['status' => 'error', 'error_message' => $e->getMessage()]);

            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}
