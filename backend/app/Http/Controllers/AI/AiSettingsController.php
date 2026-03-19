<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\BaseController;
use App\Services\AI\AiProviderFactory;
use App\Services\AI\AiSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSettingsController extends BaseController
{
    public function __construct(
        private AiSettingsService $settingsService
    ) {}

    /**
     * GET /api/ai-analysis/settings
     * Mövcud konfiqurasiyani qaytar (api_key olmadan)
     * Permission: ai_analysis.view
     */
    public function index(): JsonResponse
    {
        return $this->successResponse([
            'current_settings'   => $this->settingsService->getCurrentSettings(),
            'available_providers' => $this->settingsService->getAvailableProviders(),
            'is_configured'      => AiProviderFactory::isConfigured(),
        ]);
    }

    /**
     * POST /api/ai-analysis/settings
     * Provider-i yadda saxla/dəyişdir
     * Permission: ai_analysis.view (superadmin only)
     */
    public function save(Request $request): JsonResponse
    {
        // Yalnız superadmin
        if (!$request->user()->hasRole('superadmin')) {
            return $this->errorResponse('Bu əməliyyat yalnız Superadmin üçündür.', 403);
        }

        $request->validate([
            'provider' => 'required|in:openai,anthropic,gemini',
            'api_key'  => 'required|string|min:10|max:500',
            'model'    => 'nullable|string|max:100',
        ]);

        $this->settingsService->saveProvider(
            $request->input('provider'),
            $request->input('api_key'),
            $request->input('model'),
            $request->user()->id
        );

        return $this->successResponse(
            $this->settingsService->getCurrentSettings(),
            'AI provider uğurla yadda saxlandı'
        );
    }

    /**
     * POST /api/ai-analysis/settings/test
     * Mövcud provider bağlantısını test et
     * Permission: ai_analysis.view
     */
    public function test(): JsonResponse
    {
        $result = $this->settingsService->testConnection();

        if ($result['success']) {
            return $this->successResponse($result, 'Bağlantı uğurludur');
        }

        return $this->errorResponse($result['message'], 503);
    }
}
