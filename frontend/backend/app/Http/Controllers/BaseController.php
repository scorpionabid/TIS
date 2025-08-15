<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Exception;

abstract class BaseController extends Controller
{
    /**
     * Success response with data
     */
    protected function successResponse($data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        $response = [
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $status);
    }

    /**
     * Error response
     */
    protected function errorResponse(string $message = 'Error', int $status = 400, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * Paginated response
     */
    protected function paginatedResponse($data, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data->items(),
            'meta' => [
                'current_page' => $data->currentPage(),
                'per_page' => $data->perPage(),
                'total' => $data->total(),
                'last_page' => $data->lastPage(),
                'from' => $data->firstItem(),
                'to' => $data->lastItem(),
            ]
        ]);
    }

    /**
     * Handle common validation for listing endpoints
     */
    protected function validateListingRequest(Request $request, array $sortableFields = []): array
    {
        $rules = [
            'per_page' => 'nullable|integer|min:1|max:100',
            'search' => 'nullable|string|max:255',
            'sort_direction' => 'nullable|string|in:asc,desc',
        ];

        if (!empty($sortableFields)) {
            $rules['sort_by'] = 'nullable|string|in:' . implode(',', $sortableFields);
        }

        return $request->validate($rules);
    }

    /**
     * Handle common validation for bulk operations
     */
    protected function validateBulkRequest(Request $request, string $entityName = 'items', int $maxItems = 100): array
    {
        $idField = $entityName === 'users' ? 'user_ids' : "{$entityName}_ids";
        $tableField = $entityName === 'users' ? 'users' : $entityName;

        return $request->validate([
            $idField => "required|array|min:1|max:{$maxItems}",
            "{$idField}.*" => "integer|exists:{$tableField},id"
        ]);
    }

    /**
     * Execute action with error handling and logging
     */
    protected function executeWithErrorHandling(callable $action, string $operation, array $context = []): JsonResponse
    {
        try {
            $result = $action();
            return $result instanceof JsonResponse ? $result : $this->successResponse($result);
        } catch (ValidationException $e) {
            Log::warning("Validation failed for {$operation}", array_merge($context, [
                'errors' => $e->errors()
            ]));
            return $this->errorResponse('Validation failed', 422, $e->errors());
        } catch (Exception $e) {
            Log::error("Error in {$operation}", array_merge($context, [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]));
            return $this->errorResponse('Internal server error', 500);
        }
    }

    /**
     * Apply common filters to query
     */
    protected function applyCommonFilters($query, Request $request)
    {
        // Search filter
        if ($request->filled('search')) {
            $this->applySearchFilter($query, $request->search);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        return $query;
    }

    /**
     * Apply search filter - to be overridden in child controllers
     */
    protected function applySearchFilter($query, string $search)
    {
        // Default implementation - override in child controllers
        return $query;
    }

    /**
     * Get pagination parameters
     */
    protected function getPaginationParams(Request $request): array
    {
        return [
            'per_page' => $request->get('per_page', 15)
        ];
    }
}