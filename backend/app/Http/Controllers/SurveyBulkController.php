<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Services\SurveyBulkService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class SurveyBulkController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected SurveyBulkService $bulkService;

    public function __construct(SurveyBulkService $bulkService)
    {
        $this->bulkService = $bulkService;
    }

    /**
     * Bulk publish surveys
     */
    public function publish(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id'
        ]);

        try {
            $this->bulkService->validateBulkOperation($validated['survey_ids'], 'publish');
            $result = $this->bulkService->bulkPublish($validated['survey_ids']);

            return $this->successResponse($result, 'Bulk publish operation completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk close surveys
     */
    public function close(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id'
        ]);

        try {
            $this->bulkService->validateBulkOperation($validated['survey_ids'], 'close');
            $result = $this->bulkService->bulkClose($validated['survey_ids']);

            return $this->successResponse($result, 'Bulk close operation completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk archive surveys
     */
    public function archive(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id'
        ]);

        try {
            $this->bulkService->validateBulkOperation($validated['survey_ids'], 'archive');
            $result = $this->bulkService->bulkArchive($validated['survey_ids']);

            return $this->successResponse($result, 'Bulk archive operation completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk delete surveys
     */
    public function delete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id',
            'confirm' => 'sometimes|boolean'
        ]);

        try {
            $this->bulkService->validateBulkOperation($validated['survey_ids'], 'delete');
            $result = $this->bulkService->bulkDelete(
                $validated['survey_ids'], 
                $validated['confirm'] ?? false
            );

            return $this->successResponse($result, 'Bulk delete operation completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk update survey settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id',
            'settings' => 'required|array',
            'settings.max_responses' => 'sometimes|nullable|integer|min:1',
            'settings.is_anonymous' => 'sometimes|boolean',
            'settings.allow_multiple_responses' => 'sometimes|boolean',
            'settings.requires_login' => 'sometimes|boolean',
            'settings.auto_close_on_max' => 'sometimes|boolean'
        ]);

        try {
            $this->bulkService->validateBulkOperation($validated['survey_ids'], 'update_settings');
            $result = $this->bulkService->bulkUpdateSettings(
                $validated['survey_ids'], 
                $validated['settings']
            );

            return $this->successResponse($result, 'Bulk settings update completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get bulk operation preview
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:1',
            'survey_ids.*' => 'required|integer|exists:surveys,id',
            'operation' => 'required|string|in:publish,close,archive,delete,update_settings'
        ]);

        try {
            $preview = $this->bulkService->getOperationPreview(
                $validated['survey_ids'], 
                $validated['operation']
            );

            return $this->successResponse($preview, 'Operation preview generated');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get bulk operation statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $statistics = $this->bulkService->getStatistics();
            return $this->successResponse($statistics, 'Bulk operation statistics retrieved');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}