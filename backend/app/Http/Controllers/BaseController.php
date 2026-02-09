<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasAuthorization;
use App\Http\Traits\ValidationRules;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Routing\Controller;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

abstract class BaseController extends Controller
{
    use HasAuthorization, ValidationRules;
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
            ],
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

        if (! empty($sortableFields)) {
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
            "{$idField}.*" => "integer|exists:{$tableField},id",
        ]);
    }

    /**
     * Execute action with error handling and logging
     */
    protected function executeWithErrorHandling(callable $action, string $operation, array $context = [])
    {
        try {
            $result = $action();
            // Handle different response types
            if ($result instanceof JsonResponse) {
                return $result;
            } elseif ($result instanceof BinaryFileResponse) {
                return $result;
            }

            return $this->successResponse($result);
        } catch (ValidationException $e) {
            Log::warning("Validation failed for {$operation}", array_merge($context, [
                'errors' => $e->errors(),
            ]));

            return $this->errorResponse('Validation failed', 422, $e->errors());
        } catch (Exception $e) {
            Log::error("Error in {$operation}", array_merge($context, [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
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
            'per_page' => $request->get('per_page', 15),
        ];
    }

    /**
     * Return created response (201)
     */
    protected function createdResponse($data = null, string $message = 'Created successfully'): JsonResponse
    {
        return $this->successResponse($data, $message, 201);
    }

    /**
     * Return updated response
     */
    protected function updatedResponse($data = null, string $message = 'Updated successfully'): JsonResponse
    {
        return $this->successResponse($data, $message);
    }

    /**
     * Return deleted response
     */
    protected function deletedResponse(string $message = 'Deleted successfully'): JsonResponse
    {
        return $this->successResponse(null, $message);
    }

    /**
     * Return not found error (404)
     */
    protected function notFoundResponse(string $message = 'Resource not found'): JsonResponse
    {
        return $this->errorResponse($message, 404);
    }

    /**
     * Return validation error (422)
     */
    protected function validationErrorResponse(string $message = 'Validation failed', $errors = null): JsonResponse
    {
        return $this->errorResponse($message, 422, $errors);
    }

    /**
     * Return unauthorized error (401)
     */
    protected function unauthorizedErrorResponse(string $message = 'Unauthorized'): JsonResponse
    {
        return $this->errorResponse($message, 401);
    }

    /**
     * Return forbidden error (403)
     */
    protected function forbiddenResponse(string $message = 'Forbidden'): JsonResponse
    {
        return $this->errorResponse($message, 403);
    }

    /**
     * Return internal server error (500)
     */
    protected function serverErrorResponse(string $message = 'Internal server error'): JsonResponse
    {
        return $this->errorResponse($message, 500);
    }

    /**
     * Return collection response with count
     */
    protected function collectionResponse($data, string $message = 'Success'): JsonResponse
    {
        if ($data instanceof Collection) {
            $data = $data->toArray();
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'count' => is_array($data) ? count($data) : 0,
        ]);
    }

    /**
     * Return bulk operation response
     */
    protected function bulkOperationResponse(int $successCount, int $totalCount, string $operation = 'processed'): JsonResponse
    {
        $message = "{$successCount} of {$totalCount} items {$operation} successfully";

        return response()->json([
            'success' => $successCount > 0,
            'message' => $message,
            'data' => [
                'success_count' => $successCount,
                'total_count' => $totalCount,
                'failed_count' => $totalCount - $successCount,
            ],
        ]);
    }
}
