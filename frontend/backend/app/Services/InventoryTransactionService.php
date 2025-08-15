<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class InventoryTransactionService
{
    /**
     * Assign inventory item to user
     */
    public function assignItem(InventoryItem $item, array $data): InventoryTransaction
    {
        return DB::transaction(function () use ($item, $data) {
            // Validate assignment
            $this->validateAssignment($item, $data);
            
            $oldAssignedTo = $item->assigned_to;
            $newAssignedTo = $data['user_id'];
            
            // Create assignment transaction
            $transaction = InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => 'assignment',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'assigned_to' => $newAssignedTo,
                'from_user_id' => $oldAssignedTo,
                'to_user_id' => $newAssignedTo,
                'description' => $data['notes'] ?? 'Item assigned to user',
                'quantity' => $data['quantity'] ?? 1,
                'transaction_date' => now(),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'location_from' => $item->location,
                'location_to' => $data['location'] ?? $item->location
            ]);
            
            // Update item status
            $item->update([
                'status' => $item->is_consumable ? 'consumed' : 'in_use',
                'assigned_to' => $newAssignedTo,
                'location' => $data['location'] ?? $item->location,
                'room_id' => $data['room_id'] ?? $item->room_id
            ]);
            
            // Update quantity for consumables
            if ($item->is_consumable && isset($data['quantity'])) {
                $newQuantity = max(0, $item->quantity - $data['quantity']);
                $item->update(['quantity' => $newQuantity]);
            }
            
            // Log activity
            $assignedUser = User::find($newAssignedTo);
            $this->logActivity('item_assigned', "Assigned {$item->name} to {$assignedUser->username}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'transaction_id' => $transaction->id,
                'assigned_to' => $newAssignedTo,
                'quantity' => $data['quantity'] ?? 1
            ]);
            
            return $transaction->load(['item', 'user', 'assignedUser']);
        });
    }
    
    /**
     * Return inventory item from assignment
     */
    public function returnItem(InventoryItem $item, array $data): InventoryTransaction
    {
        return DB::transaction(function () use ($item, $data) {
            // Validate return
            $this->validateReturn($item, $data);
            
            $returnedBy = $item->assigned_to;
            
            // Create return transaction
            $transaction = InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => 'return',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'from_user_id' => $returnedBy,
                'description' => $data['notes'] ?? 'Item returned',
                'quantity' => $data['quantity'] ?? 1,
                'transaction_date' => now(),
                'condition_on_return' => $data['condition'] ?? $item->condition,
                'notes' => $data['notes'] ?? null,
                'location_from' => $item->location,
                'location_to' => $data['return_location'] ?? $item->location,
                'damage_report' => $data['damage_report'] ?? null
            ]);
            
            // Update item status
            $newStatus = $this->determineReturnStatus($item, $data);
            $item->update([
                'status' => $newStatus,
                'assigned_to' => null,
                'condition' => $data['condition'] ?? $item->condition,
                'location' => $data['return_location'] ?? $item->location,
                'room_id' => $data['return_room_id'] ?? null
            ]);
            
            // Update quantity for consumables (if partial return)
            if ($item->is_consumable && isset($data['quantity_returned'])) {
                $newQuantity = $item->quantity + $data['quantity_returned'];
                $item->update(['quantity' => $newQuantity]);
            }
            
            // Schedule maintenance if needed
            if (!empty($data['needs_maintenance'])) {
                $this->scheduleMaintenance($item, [
                    'maintenance_type' => 'inspection',
                    'description' => 'Post-return inspection',
                    'priority' => 'medium',
                    'scheduled_date' => now()->addDays(3)
                ]);
            }
            
            // Log activity
            $returnedUser = User::find($returnedBy);
            $this->logActivity('item_returned', "Returned {$item->name} from {$returnedUser->username}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'transaction_id' => $transaction->id,
                'returned_by' => $returnedBy,
                'condition' => $data['condition'] ?? $item->condition
            ]);
            
            return $transaction->load(['item', 'user', 'fromUser']);
        });
    }
    
    /**
     * Update stock quantity for consumable items
     */
    public function updateStock(InventoryItem $item, array $data): InventoryTransaction
    {
        return DB::transaction(function () use ($item, $data) {
            // Validate stock update
            $this->validateStockUpdate($item, $data);
            
            $oldQuantity = $item->quantity;
            $newQuantity = $data['quantity'];
            $difference = $newQuantity - $oldQuantity;
            
            // Create stock transaction
            $transaction = InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => $difference > 0 ? 'stock_in' : 'stock_out',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'description' => $data['reason'] ?? 'Stock quantity updated',
                'quantity' => abs($difference),
                'transaction_date' => now(),
                'notes' => $data['notes'] ?? null,
                'supplier' => $data['supplier'] ?? null,
                'purchase_price' => $data['purchase_price'] ?? null,
                'reference_number' => $data['reference_number'] ?? null
            ]);
            
            // Update item quantity
            $item->update([
                'quantity' => $newQuantity,
                'last_stock_update' => now()
            ]);
            
            // Update item status based on quantity
            if ($newQuantity <= 0) {
                $item->update(['status' => 'out_of_stock']);
            } elseif ($newQuantity <= $item->min_quantity) {
                $item->update(['status' => 'low_stock']);
            } else {
                $item->update(['status' => 'available']);
            }
            
            // Log activity
            $this->logActivity('stock_updated', "Updated stock for {$item->name}: {$oldQuantity} → {$newQuantity}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'transaction_id' => $transaction->id,
                'old_quantity' => $oldQuantity,
                'new_quantity' => $newQuantity,
                'difference' => $difference
            ]);
            
            return $transaction->load(['item', 'user']);
        });
    }
    
    /**
     * Transfer item between locations
     */
    public function transferItem(InventoryItem $item, array $data): InventoryTransaction
    {
        return DB::transaction(function () use ($item, $data) {
            // Validate transfer
            $this->validateTransfer($item, $data);
            
            $oldLocation = $item->location;
            $newLocation = $data['location'];
            
            // Create transfer transaction
            $transaction = InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'type' => 'transfer',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'description' => $data['reason'] ?? 'Item transferred',
                'transaction_date' => now(),
                'location_from' => $oldLocation,
                'location_to' => $newLocation,
                'notes' => $data['notes'] ?? null,
                'authorized_by' => $data['authorized_by'] ?? Auth::id()
            ]);
            
            // Update item location
            $item->update([
                'location' => $newLocation,
                'room_id' => $data['room_id'] ?? null,
                'institution_id' => $data['institution_id'] ?? $item->institution_id
            ]);
            
            // Log activity
            $this->logActivity('item_transferred', "Transferred {$item->name} from {$oldLocation} to {$newLocation}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'transaction_id' => $transaction->id,
                'location_from' => $oldLocation,
                'location_to' => $newLocation
            ]);
            
            return $transaction->load(['item', 'user']);
        });
    }
    
    /**
     * Get transaction history for item
     */
    public function getTransactionHistory(InventoryItem $item, array $params = []): array
    {
        $query = $item->transactions()->with(['user', 'assignedUser', 'fromUser', 'toUser']);
        
        // Apply filters
        if (!empty($params['type'])) {
            $query->where('type', $params['type']);
        }
        
        if (!empty($params['date_from'])) {
            $query->whereDate('transaction_date', '>=', $params['date_from']);
        }
        
        if (!empty($params['date_to'])) {
            $query->whereDate('transaction_date', '<=', $params['date_to']);
        }
        
        if (!empty($params['user_id'])) {
            $query->where(function ($q) use ($params) {
                $q->where('user_id', $params['user_id'])
                  ->orWhere('assigned_to', $params['user_id'])
                  ->orWhere('from_user_id', $params['user_id'])
                  ->orWhere('to_user_id', $params['user_id']);
            });
        }
        
        $transactions = $query->orderBy('transaction_date', 'desc')
                             ->paginate($params['per_page'] ?? 20);
        
        // Log activity
        $this->logActivity('transaction_history_viewed', "Viewed transaction history for {$item->name}", [
            'entity_type' => 'InventoryItem',
            'entity_id' => $item->id,
            'filters' => array_intersect_key($params, array_flip(['type', 'date_from', 'date_to', 'user_id']))
        ]);
        
        return [
            'item' => $item,
            'transactions' => $transactions,
            'summary' => $this->getTransactionSummary($item)
        ];
    }
    
    /**
     * Get transaction summary for item
     */
    public function getTransactionSummary(InventoryItem $item): array
    {
        $transactions = $item->transactions;
        
        return [
            'total_transactions' => $transactions->count(),
            'assignments' => $transactions->where('type', 'assignment')->count(),
            'returns' => $transactions->where('type', 'return')->count(),
            'transfers' => $transactions->where('type', 'transfer')->count(),
            'stock_updates' => $transactions->whereIn('type', ['stock_in', 'stock_out'])->count(),
            'first_transaction' => $transactions->min('transaction_date'),
            'last_transaction' => $transactions->max('transaction_date'),
            'current_assignment' => $item->assignedUser ? [
                'user' => $item->assignedUser->username,
                'assigned_at' => $transactions->where('type', 'assignment')
                                              ->where('assigned_to', $item->assigned_to)
                                              ->max('transaction_date')
            ] : null
        ];
    }
    
    /**
     * Validate assignment
     */
    protected function validateAssignment(InventoryItem $item, array $data): void
    {
        if ($item->status === 'in_use' && !$item->is_consumable) {
            throw new Exception('Item is already assigned to another user');
        }
        
        if ($item->status === 'maintenance' || $item->status === 'repair') {
            throw new Exception('Item is currently under maintenance and cannot be assigned');
        }
        
        if ($item->status === 'retired' || $item->status === 'damaged') {
            throw new Exception('Item is not available for assignment');
        }
        
        if ($item->is_consumable) {
            $requestedQuantity = $data['quantity'] ?? 1;
            if ($requestedQuantity > $item->quantity) {
                throw new Exception("Insufficient stock. Available: {$item->quantity}, Requested: {$requestedQuantity}");
            }
        }
        
        if (!User::where('id', $data['user_id'])->where('is_active', true)->exists()) {
            throw new Exception('User not found or inactive');
        }
    }
    
    /**
     * Validate return
     */
    protected function validateReturn(InventoryItem $item, array $data): void
    {
        if ($item->status !== 'in_use' && !$item->is_consumable) {
            throw new Exception('Item is not currently assigned');
        }
        
        if (!$item->assigned_to) {
            throw new Exception('Item is not assigned to any user');
        }
        
        // Validate condition if provided
        if (isset($data['condition'])) {
            $validConditions = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];
            if (!in_array($data['condition'], $validConditions)) {
                throw new Exception('Invalid condition specified');
            }
        }
    }
    
    /**
     * Validate stock update
     */
    protected function validateStockUpdate(InventoryItem $item, array $data): void
    {
        if (!$item->is_consumable) {
            throw new Exception('Stock updates are only allowed for consumable items');
        }
        
        if (!isset($data['quantity']) || $data['quantity'] < 0) {
            throw new Exception('Valid quantity is required');
        }
        
        if (!isset($data['reason']) || empty($data['reason'])) {
            throw new Exception('Reason for stock update is required');
        }
    }
    
    /**
     * Validate transfer
     */
    protected function validateTransfer(InventoryItem $item, array $data): void
    {
        if ($item->status === 'in_use') {
            throw new Exception('Cannot transfer item that is currently in use. Please return it first.');
        }
        
        if (!isset($data['location']) || empty($data['location'])) {
            throw new Exception('Destination location is required');
        }
        
        if ($item->location === $data['location']) {
            throw new Exception('Item is already at the specified location');
        }
    }
    
    /**
     * Determine return status based on condition
     */
    protected function determineReturnStatus(InventoryItem $item, array $data): string
    {
        $condition = $data['condition'] ?? $item->condition;
        
        if ($condition === 'damaged') {
            return 'damaged';
        } elseif ($condition === 'poor') {
            return 'needs_maintenance';
        } elseif (!empty($data['needs_maintenance'])) {
            return 'maintenance';
        } else {
            return 'available';
        }
    }
    
    /**
     * Schedule maintenance (simplified version)
     */
    protected function scheduleMaintenance(InventoryItem $item, array $data): void
    {
        // This would integrate with InventoryMaintenanceService
        // For now, just update item status
        $item->update(['status' => 'maintenance']);
    }
    
    /**
     * Format transaction for API response
     */
    public function formatTransactionForResponse(InventoryTransaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'type' => $transaction->type,
            'status' => $transaction->status,
            'description' => $transaction->description,
            'quantity' => $transaction->quantity,
            'transaction_date' => $transaction->transaction_date,
            'user' => [
                'id' => $transaction->user?->id,
                'username' => $transaction->user?->username,
                'full_name' => $transaction->user?->profile?->full_name
            ],
            'assigned_user' => $transaction->assignedUser ? [
                'id' => $transaction->assignedUser->id,
                'username' => $transaction->assignedUser->username,
                'full_name' => $transaction->assignedUser->profile?->full_name
            ] : null,
            'location_from' => $transaction->location_from,
            'location_to' => $transaction->location_to,
            'condition_on_return' => $transaction->condition_on_return,
            'notes' => $transaction->notes,
            'created_at' => $transaction->created_at
        ];
    }
    
    /**
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}