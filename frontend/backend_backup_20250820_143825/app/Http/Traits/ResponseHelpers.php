<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

trait ResponseHelpers
{
    /**
     * Return success response with data
     */
    protected function success($data = null, string $message = 'Success', int $status = 200): JsonResponse
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
     * Return error response
     */
    protected function error(string $message = 'Error', int $status = 400, $errors = null): JsonResponse
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
     * Return paginated response
     */
    protected function paginated($data, string $message = 'Success'): JsonResponse
    {
        if (!$data instanceof LengthAwarePaginator) {
            return $this->error('Data must be paginated');
        }

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
                'has_more_pages' => $data->hasMorePages(),
            ],
            'links' => [
                'first' => $data->url(1),
                'last' => $data->url($data->lastPage()),
                'prev' => $data->previousPageUrl(),
                'next' => $data->nextPageUrl(),
            ]
        ]);
    }

    /**
     * Return collection response
     */
    protected function collection($data, string $message = 'Success'): JsonResponse
    {
        if ($data instanceof Collection) {
            $data = $data->toArray();
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'count' => is_array($data) ? count($data) : ($data instanceof Collection ? $data->count() : 0)
        ]);
    }

    /**
     * Return created response (201)
     */
    protected function created($data = null, string $message = 'Created successfully'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    /**
     * Return updated response
     */
    protected function updated($data = null, string $message = 'Updated successfully'): JsonResponse
    {
        return $this->success($data, $message);
    }

    /**
     * Return deleted response
     */
    protected function deleted(string $message = 'Deleted successfully'): JsonResponse
    {
        return $this->success(null, $message);
    }

    /**
     * Return not found error (404)
     */
    protected function notFound(string $message = 'Resource not found'): JsonResponse
    {
        return $this->error($message, 404);
    }

    /**
     * Return validation error (422)
     */
    protected function validationError(string $message = 'Validation failed', $errors = null): JsonResponse
    {
        return $this->error($message, 422, $errors);
    }

    /**
     * Return unauthorized error (401)
     */
    protected function unauthorized(string $message = 'Unauthorized'): JsonResponse
    {
        return $this->error($message, 401);
    }

    /**
     * Return forbidden error (403)
     */
    protected function forbidden(string $message = 'Forbidden'): JsonResponse
    {
        return $this->error($message, 403);
    }

    /**
     * Return internal server error (500)
     */
    protected function serverError(string $message = 'Internal server error'): JsonResponse
    {
        return $this->error($message, 500);
    }

    /**
     * Return bulk operation response
     */
    protected function bulkOperation(int $successCount, int $totalCount, string $operation = 'processed'): JsonResponse
    {
        $message = "{$successCount} of {$totalCount} items {$operation} successfully";
        
        return response()->json([
            'success' => $successCount > 0,
            'message' => $message,
            'data' => [
                'success_count' => $successCount,
                'total_count' => $totalCount,
                'failed_count' => $totalCount - $successCount,
                'success_rate' => $totalCount > 0 ? round(($successCount / $totalCount) * 100, 2) : 0
            ]
        ]);
    }

    /**
     * Return export response
     */
    protected function exportSuccess(string $filename, int $recordCount, string $format): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => "Export completed successfully",
            'data' => [
                'filename' => $filename,
                'format' => $format,
                'record_count' => $recordCount,
                'exported_at' => now()->toISOString()
            ]
        ]);
    }

    /**
     * Return statistics response
     */
    protected function statistics(array $stats, string $message = 'Statistics retrieved successfully'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $stats,
            'generated_at' => now()->toISOString()
        ]);
    }

    /**
     * Return hierarchical data response
     */
    protected function hierarchical($data, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'structure' => 'hierarchical'
        ]);
    }

    /**
     * Custom response with meta information
     */
    protected function withMeta($data, array $meta, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta
        ]);
    }
}