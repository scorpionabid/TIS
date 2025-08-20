<?php

namespace App\Http\Controllers;

use App\Services\UserBulkService;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserBulkController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    public function __construct(
        protected UserBulkService $bulkService
    ) {}

    /**
     * Bulk activate users
     */
    public function activate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate($this->getBulkOperationRules('user'));
            
            $this->bulkService->validateBulkOperation($validated['user_ids'], 'activate');
            $result = $this->bulkService->activate($validated['user_ids']);
            
            return $this->success($result);
        }, 'user.bulk.activate');
    }

    /**
     * Bulk deactivate users
     */
    public function deactivate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate($this->getBulkOperationRules('user'));
            
            $this->bulkService->validateBulkOperation($validated['user_ids'], 'deactivate');
            $result = $this->bulkService->deactivate($validated['user_ids']);
            
            return $this->success($result);
        }, 'user.bulk.deactivate');
    }

    /**
     * Bulk assign role to users
     */
    public function assignRole(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user'),
                ['role_id' => 'required|integer|exists:roles,id']
            ));
            
            $this->bulkService->validateBulkOperation($validated['user_ids'], 'assign_role');
            $result = $this->bulkService->assignRole($validated['user_ids'], $validated['role_id']);
            
            return $this->success($result);
        }, 'user.bulk.assign_role');
    }

    /**
     * Bulk assign institution to users
     */
    public function assignInstitution(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user'),
                ['institution_id' => 'required|integer|exists:institutions,id']
            ));
            
            $this->bulkService->validateBulkOperation($validated['user_ids'], 'assign_institution');
            $result = $this->bulkService->assignInstitution($validated['user_ids'], $validated['institution_id']);
            
            return $this->success($result);
        }, 'user.bulk.assign_institution');
    }

    /**
     * Bulk delete users
     */
    public function delete(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate(array_merge(
                $this->getBulkOperationRules('user', 50), // Smaller limit for safety
                ['confirm' => 'required|boolean|accepted'] // Extra confirmation required
            ));
            
            $this->bulkService->validateBulkOperation($validated['user_ids'], 'delete');
            $result = $this->bulkService->delete($validated['user_ids'], $validated['confirm']);
            
            return $this->success($result);
        }, 'user.bulk.delete');
    }

    /**
     * Get bulk operation statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $stats = $this->bulkService->getStatistics();
            return $this->success($stats, 'Bulk statistics retrieved successfully');
        }, 'user.bulk.statistics');
    }

    /**
     * Get preview of bulk operation
     */
    public function preview(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'user_ids' => 'required|array|min:1|max:100',
                'user_ids.*' => 'integer|exists:users,id',
                'operation' => 'required|string|in:activate,deactivate,assign_role,assign_institution,delete',
                'target_id' => 'nullable|integer' // For role_id or institution_id
            ]);
            
            $preview = $this->bulkService->getOperationPreview(
                $validated['user_ids'], 
                $validated['operation'],
                $validated['target_id'] ?? null
            );
            
            return $this->success($preview, 'Operation preview generated successfully');
        }, 'user.bulk.preview');
    }
}