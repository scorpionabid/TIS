<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Services\InventoryCrudService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class InventoryController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    protected InventoryCrudService $crudService;

    public function __construct(InventoryCrudService $crudService)
    {
        $this->crudService = $crudService;
    }

    /**
     * Display a listing of inventory items with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'sometimes|exists:institutions,id',
            'category' => 'sometimes|in:electronics,furniture,books,equipment,supplies,vehicles,sports,laboratory,medical,safety,cleaning,stationery,tools,software,other',
            'status' => 'sometimes|in:available,in_use,maintenance,repair,retired,lost,damaged,reserved,out_of_stock,low_stock',
            'condition' => 'sometimes|in:new,excellent,good,fair,poor,damaged',
            'assigned_to' => 'sometimes|exists:users,id',
            'room_id' => 'sometimes|exists:rooms,id',
            'is_consumable' => 'sometimes|boolean',
            'low_stock' => 'sometimes|boolean',
            'needs_maintenance' => 'sometimes|boolean',
            'warranty_expiring' => 'sometimes|boolean',
            'warranty_expiring_days' => 'sometimes|integer|min:1|max:365',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
            'sort_by' => 'sometimes|in:name,category,status,condition,purchase_date,warranty_expiry,current_value',
            'sort_order' => 'sometimes|in:asc,desc'
        ]);

        try {
            $items = $this->crudService->getPaginatedList($validated);
            
            // Format items for response
            $formattedItems = $items->getCollection()->map(function ($item) {
                return $this->crudService->formatForResponse($item);
            });
            
            $items->setCollection($formattedItems);
            
            return $this->successResponse($items, 'Inventory items retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Store a newly created inventory item
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'sometimes|string|max:2000',
            'category' => 'required|in:electronics,furniture,books,equipment,supplies,vehicles,sports,laboratory,medical,safety,cleaning,stationery,tools,software,other',
            'subcategory' => 'sometimes|string|max:100',
            'brand' => 'sometimes|string|max:100',
            'model' => 'sometimes|string|max:100',
            'serial_number' => 'sometimes|string|max:100',
            'code' => 'sometimes|string|max:50|unique:inventory_items,code',
            'status' => 'sometimes|in:available,in_use,maintenance,repair,retired,lost,damaged,reserved',
            'condition' => 'required|in:new,excellent,good,fair,poor,damaged',
            'purchase_date' => 'sometimes|date',
            'purchase_price' => 'sometimes|numeric|min:0',
            'current_value' => 'sometimes|numeric|min:0',
            'depreciation_rate' => 'sometimes|numeric|min:0|max:100',
            'warranty_expiry' => 'sometimes|date',
            'supplier' => 'sometimes|string|max:255',
            'location' => 'sometimes|string|max:255',
            'room_id' => 'sometimes|exists:rooms,id',
            'assigned_to' => 'sometimes|exists:users,id',
            'institution_id' => 'sometimes|exists:institutions,id',
            'is_consumable' => 'sometimes|boolean',
            'quantity' => 'required_if:is_consumable,true|integer|min:0',
            'min_quantity' => 'sometimes|integer|min:0',
            'unit' => 'required_if:is_consumable,true|string|max:50',
            'notes' => 'sometimes|string|max:2000',
            'specifications' => 'sometimes|array',
            'maintenance_schedule' => 'sometimes|string|max:500'
        ]);

        try {
            $item = $this->crudService->create($validated);
            $formattedItem = $this->crudService->formatDetailedForResponse($item);
            
            return $this->successResponse($formattedItem, 'Inventory item created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Display the specified inventory item
     */
    public function show(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'include' => 'sometimes|string'
        ]);

        try {
            $itemWithRelations = $this->crudService->getWithRelations($item);
            $formattedItem = $this->crudService->formatDetailedForResponse($itemWithRelations);
            
            return $this->successResponse($formattedItem, 'Inventory item retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Update the specified inventory item
     */
    public function update(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|max:2000',
            'category' => 'sometimes|in:electronics,furniture,books,equipment,supplies,vehicles,sports,laboratory,medical,safety,cleaning,stationery,tools,software,other',
            'subcategory' => 'sometimes|string|max:100',
            'brand' => 'sometimes|string|max:100',
            'model' => 'sometimes|string|max:100',
            'serial_number' => 'sometimes|string|max:100',
            'code' => 'sometimes|string|max:50|unique:inventory_items,code,' . $item->id,
            'status' => 'sometimes|in:available,in_use,maintenance,repair,retired,lost,damaged,reserved',
            'condition' => 'sometimes|in:new,excellent,good,fair,poor,damaged',
            'purchase_date' => 'sometimes|date',
            'purchase_price' => 'sometimes|numeric|min:0',
            'current_value' => 'sometimes|numeric|min:0',
            'depreciation_rate' => 'sometimes|numeric|min:0|max:100',
            'warranty_expiry' => 'sometimes|date',
            'supplier' => 'sometimes|string|max:255',
            'location' => 'sometimes|string|max:255',
            'room_id' => 'sometimes|exists:rooms,id',
            'assigned_to' => 'sometimes|exists:users,id',
            'institution_id' => 'sometimes|exists:institutions,id',
            'is_consumable' => 'sometimes|boolean',
            'quantity' => 'sometimes|integer|min:0',
            'min_quantity' => 'sometimes|integer|min:0',
            'unit' => 'sometimes|string|max:50',
            'notes' => 'sometimes|string|max:2000',
            'specifications' => 'sometimes|array',
            'maintenance_schedule' => 'sometimes|string|max:500'
        ]);

        try {
            $updatedItem = $this->crudService->update($item, $validated);
            $formattedItem = $this->crudService->formatDetailedForResponse($updatedItem);
            
            return $this->successResponse($formattedItem, 'Inventory item updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Remove the specified inventory item
     */
    public function destroy(Request $request, InventoryItem $item): JsonResponse
    {
        try {
            $this->crudService->delete($item);
            return $this->successResponse(null, 'Inventory item deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get inventory item for public viewing
     */
    public function getItemForPublicView(InventoryItem $item): JsonResponse
    {
        try {
            $publicData = $this->crudService->getItemForPublicView($item);
            return $this->successResponse($publicData, 'Inventory item public view retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Duplicate inventory item
     */
    public function duplicate(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:inventory_items,code',
            'quantity' => 'sometimes|integer|min:0',
            'location' => 'sometimes|string|max:255',
            'room_id' => 'sometimes|exists:rooms,id',
            'notes' => 'sometimes|string|max:2000'
        ]);

        try {
            $duplicatedItem = $this->crudService->duplicate($item, $validated);
            $formattedItem = $this->crudService->formatDetailedForResponse($duplicatedItem);
            
            return $this->successResponse($formattedItem, 'Inventory item duplicated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get inventory categories with counts
     */
    public function categories(): JsonResponse
    {
        try {
            $categories = $this->crudService->getCategoriesWithCounts();
            return $this->successResponse($categories, 'Inventory categories retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Search inventory items
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => 'required|string|min:2|max:255',
            'category' => 'sometimes|string',
            'status' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'limit' => 'sometimes|integer|min:1|max:50'
        ]);

        try {
            $results = $this->crudService->searchItems($validated);
            return $this->successResponse($results, 'Search results retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}