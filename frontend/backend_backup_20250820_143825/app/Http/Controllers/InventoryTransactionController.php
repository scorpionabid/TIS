<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Services\InventoryTransactionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class InventoryTransactionController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected InventoryTransactionService $transactionService;

    public function __construct(InventoryTransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
    }

    /**
     * Assign inventory item to user
     */
    public function assign(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'quantity' => 'sometimes|integer|min:1',
            'expected_return_date' => 'sometimes|date|after:today',
            'location' => 'sometimes|string|max:255',
            'room_id' => 'sometimes|integer|exists:rooms,id',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $transaction = $this->transactionService->assignItem($item, $validated);
            
            return $this->successResponse(
                $this->transactionService->formatTransactionForResponse($transaction),
                'Item assigned successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Return inventory item from assignment
     */
    public function returnItem(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'condition' => 'sometimes|string|in:new,excellent,good,fair,poor,damaged',
            'quantity_returned' => 'sometimes|integer|min:1',
            'return_location' => 'sometimes|string|max:255',
            'return_room_id' => 'sometimes|integer|exists:rooms,id',
            'needs_maintenance' => 'sometimes|boolean',
            'damage_report' => 'sometimes|string|max:2000',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $transaction = $this->transactionService->returnItem($item, $validated);
            
            return $this->successResponse(
                $this->transactionService->formatTransactionForResponse($transaction),
                'Item returned successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Update stock quantity for consumable items
     */
    public function updateStock(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
            'reason' => 'required|string|max:255',
            'supplier' => 'sometimes|string|max:255',
            'purchase_price' => 'sometimes|numeric|min:0',
            'reference_number' => 'sometimes|string|max:100',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $transaction = $this->transactionService->updateStock($item, $validated);
            
            return $this->successResponse(
                $this->transactionService->formatTransactionForResponse($transaction),
                'Stock updated successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Transfer item between locations
     */
    public function transfer(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'location' => 'required|string|max:255',
            'room_id' => 'sometimes|integer|exists:rooms,id',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'reason' => 'required|string|max:255',
            'authorized_by' => 'sometimes|integer|exists:users,id',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $transaction = $this->transactionService->transferItem($item, $validated);
            
            return $this->successResponse(
                $this->transactionService->formatTransactionForResponse($transaction),
                'Item transferred successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get transaction history for item
     */
    public function history(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|string|in:assignment,return,transfer,stock_in,stock_out,maintenance_start,maintenance_complete',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'user_id' => 'sometimes|integer|exists:users,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $history = $this->transactionService->getTransactionHistory($item, $validated);
            
            return $this->successResponse($history, 'Transaction history retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get transaction summary for item
     */
    public function summary(InventoryItem $item): JsonResponse
    {
        try {
            $summary = $this->transactionService->getTransactionSummary($item);
            
            return $this->successResponse($summary, 'Transaction summary retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get bulk assignment preview
     */
    public function bulkAssignPreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'required|integer|exists:inventory_items,id',
            'user_id' => 'required|integer|exists:users,id',
            'expected_return_date' => 'sometimes|date|after:today'
        ]);

        try {
            $preview = $this->transactionService->getBulkAssignmentPreview(
                $validated['item_ids'], 
                $validated['user_id']
            );
            
            return $this->successResponse($preview, 'Bulk assignment preview generated');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk assign items to user
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1|max:50',
            'item_ids.*' => 'required|integer|exists:inventory_items,id',
            'user_id' => 'required|integer|exists:users,id',
            'expected_return_date' => 'sometimes|date|after:today',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $result = $this->transactionService->bulkAssignItems(
                $validated['item_ids'],
                $validated['user_id'],
                $validated
            );
            
            return $this->successResponse($result, 'Bulk assignment completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Bulk return items
     */
    public function bulkReturn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1|max:50',
            'item_ids.*' => 'required|integer|exists:inventory_items,id',
            'condition' => 'sometimes|string|in:new,excellent,good,fair,poor,damaged',
            'return_location' => 'sometimes|string|max:255',
            'needs_maintenance' => 'sometimes|boolean',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $result = $this->transactionService->bulkReturnItems(
                $validated['item_ids'],
                $validated
            );
            
            return $this->successResponse($result, 'Bulk return completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get user's current assignments
     */
    public function userAssignments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'status' => 'sometimes|string|in:active,overdue,all',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $assignments = $this->transactionService->getUserAssignments(
                $validated['user_id'],
                $validated
            );
            
            return $this->successResponse($assignments, 'User assignments retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get overdue returns
     */
    public function overdueReturns(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days_overdue' => 'sometimes|integer|min:1',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'user_id' => 'sometimes|integer|exists:users,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $overdueReturns = $this->transactionService->getOverdueReturns($validated);
            
            return $this->successResponse($overdueReturns, 'Overdue returns retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get transaction statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'category' => 'sometimes|string'
        ]);

        try {
            $statistics = $this->transactionService->getTransactionStatistics($validated);
            
            return $this->successResponse($statistics, 'Transaction statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}