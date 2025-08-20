<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class InventoryCrudService
{
    /**
     * Get paginated inventory items list with filtering
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $query = InventoryItem::with(['institution', 'assignedUser', 'room']);
        
        // Apply regional access control
        $this->applyAccessControl($query);
        
        // Apply filters
        $this->applyFilters($query, $params);
        
        // Apply search
        if (!empty($params['search'])) {
            $this->applySearch($query, $params['search']);
        }
        
        // Apply sorting
        $this->applySorting($query, $params);
        
        $items = $query->paginate($params['per_page'] ?? 15);
        
        // Log activity
        $this->logActivity('inventory_list', 'Accessed inventory list', [
            'filters' => array_intersect_key($params, array_flip(['category', 'status', 'condition', 'institution_id'])),
            'pagination' => [
                'per_page' => $params['per_page'] ?? 15,
                'page' => $params['page'] ?? 1
            ]
        ]);
        
        return $items;
    }
    
    /**
     * Get inventory item with all relations
     */
    public function getWithRelations(InventoryItem $item): InventoryItem
    {
        $item->load([
            'institution',
            'assignedUser.profile',
            'room',
            'transactions' => function ($query) {
                $query->latest()->take(10);
            },
            'maintenanceRecords' => function ($query) {
                $query->latest()->take(5);
            }
        ]);
        
        // Log activity
        $this->logActivity('inventory_view', "Viewed inventory item: {$item->name}", [
            'entity_type' => 'InventoryItem',
            'entity_id' => $item->id
        ]);
        
        return $item;
    }
    
    /**
     * Create new inventory item
     */
    public function create(array $data): InventoryItem
    {
        return DB::transaction(function () use ($data) {
            // Prepare item data
            $itemData = $this->prepareItemData($data);
            
            // Create inventory item
            $item = InventoryItem::create($itemData);
            
            // Create initial transaction
            $this->createInitialTransaction($item, $data);
            
            // Log activity
            $this->logActivity('inventory_create', "Created inventory item: {$item->name}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'after_state' => $item->toArray()
            ]);
            
            return $item->load(['institution', 'assignedUser', 'room']);
        });
    }
    
    /**
     * Update inventory item
     */
    public function update(InventoryItem $item, array $data): InventoryItem
    {
        return DB::transaction(function () use ($item, $data) {
            $oldData = $item->toArray();
            
            // Prepare update data
            $updateData = $this->prepareItemData($data);
            
            // Update item
            $item->update($updateData);
            
            // Create transaction if status or location changed
            if ($this->hasStatusOrLocationChanged($oldData, $updateData)) {
                $this->createUpdateTransaction($item, $oldData, $updateData);
            }
            
            // Log activity
            $this->logActivity('inventory_update', "Updated inventory item: {$item->name}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'before_state' => $oldData,
                'after_state' => $item->toArray()
            ]);
            
            return $item->load(['institution', 'assignedUser', 'room']);
        });
    }
    
    /**
     * Delete inventory item
     */
    public function delete(InventoryItem $item): bool
    {
        return DB::transaction(function () use ($item) {
            $itemName = $item->name;
            $itemId = $item->id;
            
            // Check if item can be deleted
            if ($item->status === 'in_use') {
                throw new Exception('Cannot delete item that is currently in use. Please return it first.');
            }
            
            if ($item->transactions()->count() > 1) {
                throw new Exception('Cannot delete item with transaction history. Consider marking as retired instead.');
            }
            
            // Delete related records
            $item->transactions()->delete();
            $item->maintenanceRecords()->delete();
            
            // Delete item
            $item->delete();
            
            // Log activity
            $this->logActivity('inventory_delete', "Deleted inventory item: {$itemName}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $itemId
            ]);
            
            return true;
        });
    }
    
    /**
     * Get inventory item for public viewing
     */
    public function getItemForPublicView(InventoryItem $item): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'code' => $item->code,
            'category' => $item->category,
            'description' => $item->description,
            'status' => $item->status,
            'condition' => $item->condition,
            'location' => $item->room?->name ?? $item->location,
            'institution' => $item->institution?->name,
            'is_available' => $item->status === 'available',
            'current_value' => $item->current_value,
            'warranty_expiry' => $item->warranty_expiry,
            'last_maintenance' => $item->maintenanceRecords()->latest()->first()?->completed_at
        ];
    }
    
    /**
     * Duplicate inventory item
     */
    public function duplicate(InventoryItem $item, array $overrides = []): InventoryItem
    {
        return DB::transaction(function () use ($item, $overrides) {
            // Prepare item data for duplication
            $itemData = $item->toArray();
            
            // Remove unique fields
            unset($itemData['id'], $itemData['code'], $itemData['created_at'], $itemData['updated_at']);
            
            // Apply overrides
            $itemData = array_merge($itemData, $overrides);
            
            // Set defaults for duplicate
            if (!isset($overrides['name'])) {
                $itemData['name'] = $item->name . ' (Copy)';
            }
            if (!isset($overrides['code'])) {
                $itemData['code'] = $this->generateUniqueCode($item->category);
            }
            $itemData['status'] = 'available';
            $itemData['assigned_to'] = null;
            
            // Create duplicate
            $duplicate = $this->create($itemData);
            
            // Log activity
            $this->logActivity('inventory_duplicate', "Duplicated inventory item: {$item->name} → {$duplicate->name}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $duplicate->id,
                'source_item_id' => $item->id
            ]);
            
            return $duplicate;
        });
    }
    
    /**
     * Apply regional access control
     */
    protected function applyAccessControl($query): void
    {
        $user = Auth::user();
        
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }
    }
    
    /**
     * Get user accessible institutions
     */
    protected function getUserAccessibleInstitutions($user): array
    {
        // Implementation based on user role and institution hierarchy
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can access all institutions in their region
            return $user->institution->descendants()->pluck('id')->toArray();
        } elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin can access institutions in their sector
            return $user->institution->children()->pluck('id')->toArray();
        } else {
            // School level users can only access their own institution
            return [$user->institution_id];
        }
    }
    
    /**
     * Apply filters to query
     */
    protected function applyFilters($query, array $params): void
    {
        if (!empty($params['institution_id'])) {
            $query->where('institution_id', $params['institution_id']);
        }
        
        if (!empty($params['category'])) {
            $query->where('category', $params['category']);
        }
        
        if (!empty($params['status'])) {
            $query->where('status', $params['status']);
        }
        
        if (!empty($params['condition'])) {
            $query->where('condition', $params['condition']);
        }
        
        if (!empty($params['assigned_to'])) {
            $query->where('assigned_to', $params['assigned_to']);
        }
        
        if (!empty($params['room_id'])) {
            $query->where('room_id', $params['room_id']);
        }
        
        if (isset($params['is_consumable'])) {
            $query->where('is_consumable', $params['is_consumable']);
        }
        
        if (!empty($params['low_stock'])) {
            $query->lowStock();
        }
        
        if (!empty($params['needs_maintenance'])) {
            $query->needsMaintenance();
        }
        
        if (!empty($params['warranty_expiring'])) {
            $days = $params['warranty_expiring_days'] ?? 30;
            $query->warrantyExpiring($days);
        }
    }
    
    /**
     * Apply search to query
     */
    protected function applySearch($query, string $search): void
    {
        $query->where(function ($q) use ($search) {
            $q->where('name', 'LIKE', "%{$search}%")
              ->orWhere('code', 'LIKE', "%{$search}%")
              ->orWhere('description', 'LIKE', "%{$search}%")
              ->orWhere('serial_number', 'LIKE', "%{$search}%")
              ->orWhere('model', 'LIKE', "%{$search}%")
              ->orWhere('brand', 'LIKE', "%{$search}%");
        });
    }
    
    /**
     * Apply sorting to query
     */
    protected function applySorting($query, array $params): void
    {
        $sortBy = $params['sort_by'] ?? 'created_at';
        $sortOrder = $params['sort_order'] ?? 'desc';
        
        $allowedSorts = [
            'name', 'category', 'status', 'condition', 'purchase_date',
            'warranty_expiry', 'current_value', 'created_at'
        ];
        
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }
    }
    
    /**
     * Prepare item data for creation/update
     */
    protected function prepareItemData(array $data): array
    {
        $preparedData = array_intersect_key($data, array_flip([
            'name', 'description', 'category', 'subcategory', 'brand', 'model',
            'serial_number', 'code', 'status', 'condition', 'purchase_date',
            'purchase_price', 'current_value', 'depreciation_rate', 'warranty_expiry',
            'supplier', 'location', 'room_id', 'assigned_to', 'institution_id',
            'is_consumable', 'quantity', 'min_quantity', 'unit', 'notes',
            'specifications', 'maintenance_schedule'
        ]));
        
        // Set defaults
        if (!isset($preparedData['institution_id'])) {
            $preparedData['institution_id'] = Auth::user()->institution_id;
        }
        
        if (!isset($preparedData['code']) || empty($preparedData['code'])) {
            $preparedData['code'] = $this->generateUniqueCode($preparedData['category'] ?? 'general');
        }
        
        return $preparedData;
    }
    
    /**
     * Generate unique inventory code
     */
    protected function generateUniqueCode(string $category): string
    {
        $prefix = strtoupper(substr($category, 0, 3));
        $date = now()->format('ym');
        
        do {
            $number = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $code = "{$prefix}-{$date}-{$number}";
        } while (InventoryItem::where('code', $code)->exists());
        
        return $code;
    }
    
    /**
     * Create initial transaction for new item
     */
    protected function createInitialTransaction(InventoryItem $item, array $data): void
    {
        InventoryTransaction::create([
            'inventory_item_id' => $item->id,
            'type' => 'created',
            'status' => 'completed',
            'user_id' => Auth::id(),
            'description' => 'Item added to inventory',
            'quantity' => $item->quantity ?? 1,
            'transaction_date' => now(),
            'notes' => $data['notes'] ?? null
        ]);
    }
    
    /**
     * Check if status or location changed
     */
    protected function hasStatusOrLocationChanged(array $oldData, array $updateData): bool
    {
        return (isset($updateData['status']) && $oldData['status'] !== $updateData['status']) ||
               (isset($updateData['location']) && $oldData['location'] !== $updateData['location']) ||
               (isset($updateData['room_id']) && $oldData['room_id'] !== $updateData['room_id']) ||
               (isset($updateData['assigned_to']) && $oldData['assigned_to'] !== $updateData['assigned_to']);
    }
    
    /**
     * Create transaction for item update
     */
    protected function createUpdateTransaction(InventoryItem $item, array $oldData, array $updateData): void
    {
        $changes = array_diff_assoc($updateData, $oldData);
        
        InventoryTransaction::create([
            'inventory_item_id' => $item->id,
            'type' => 'updated',
            'status' => 'completed',
            'user_id' => Auth::id(),
            'description' => 'Item information updated',
            'transaction_date' => now(),
            'metadata' => json_encode([
                'changes' => $changes,
                'old_values' => array_intersect_key($oldData, $changes)
            ])
        ]);
    }
    
    /**
     * Format item for API response
     */
    public function formatForResponse(InventoryItem $item): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'code' => $item->code,
            'category' => $item->category,
            'status' => $item->status,
            'condition' => $item->condition,
            'current_value' => $item->current_value,
            'institution' => [
                'id' => $item->institution?->id,
                'name' => $item->institution?->name
            ],
            'assigned_user' => [
                'id' => $item->assignedUser?->id,
                'username' => $item->assignedUser?->username,
                'full_name' => $item->assignedUser?->profile?->full_name
            ],
            'location' => $item->room?->name ?? $item->location,
            'is_consumable' => $item->is_consumable,
            'quantity' => $item->quantity,
            'warranty_expiry' => $item->warranty_expiry,
            'needs_maintenance' => $item->needs_maintenance,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at
        ];
    }
    
    /**
     * Format detailed item for API response
     */
    public function formatDetailedForResponse(InventoryItem $item): array
    {
        $basic = $this->formatForResponse($item);
        
        return array_merge($basic, [
            'description' => $item->description,
            'brand' => $item->brand,
            'model' => $item->model,
            'serial_number' => $item->serial_number,
            'purchase_date' => $item->purchase_date,
            'purchase_price' => $item->purchase_price,
            'depreciation_rate' => $item->depreciation_rate,
            'supplier' => $item->supplier,
            'specifications' => $item->specifications,
            'maintenance_schedule' => $item->maintenance_schedule,
            'notes' => $item->notes,
            'recent_transactions' => $item->transactions?->take(5)->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'description' => $transaction->description,
                    'user' => $transaction->user?->username,
                    'transaction_date' => $transaction->transaction_date
                ];
            }),
            'maintenance_records' => $item->maintenanceRecords?->take(3)->map(function ($record) {
                return [
                    'id' => $record->id,
                    'type' => $record->maintenance_type,
                    'description' => $record->description,
                    'scheduled_date' => $record->scheduled_date,
                    'completed_at' => $record->completed_at,
                    'status' => $record->status
                ];
            })
        ]);
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