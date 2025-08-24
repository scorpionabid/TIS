<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class SchoolInventoryController extends Controller
{
    /**
     * Get school inventory items
     */
    public function getInventoryItems(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('schooladmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $school = $user->institution;
            
            if (!$school) {
                return response()->json(['message' => 'School not found'], 400);
            }

            // Mock inventory data for now
            $inventoryItems = [
                [
                    'id' => 1,
                    'name' => 'Laptop Kompüterlər',
                    'category' => 'İT Avadanlıqları',
                    'total_quantity' => 25,
                    'available_quantity' => 20,
                    'in_use_quantity' => 5,
                    'condition' => 'good',
                    'location' => 'İT Otağı',
                    'purchase_date' => '2023-09-15',
                    'warranty_expires' => '2026-09-15',
                    'unit_price' => 1200.00,
                    'total_value' => 30000.00,
                    'supplier' => 'Tech Solutions LLC',
                    'last_maintenance' => '2024-06-15',
                    'next_maintenance' => '2025-06-15',
                ],
                [
                    'id' => 2,
                    'name' => 'Projektor',
                    'category' => 'Təqdimat Avadanlıqları',
                    'total_quantity' => 8,
                    'available_quantity' => 6,
                    'in_use_quantity' => 2,
                    'condition' => 'good',
                    'location' => 'Avadanlıq Anbarı',
                    'purchase_date' => '2023-05-20',
                    'warranty_expires' => '2025-05-20',
                    'unit_price' => 800.00,
                    'total_value' => 6400.00,
                    'supplier' => 'Display Pro',
                    'last_maintenance' => '2024-03-10',
                    'next_maintenance' => '2025-03-10',
                ],
                [
                    'id' => 3,
                    'name' => 'Laboratoriya Mikroskopları',
                    'category' => 'Elm Avadanlıqları',
                    'total_quantity' => 15,
                    'available_quantity' => 12,
                    'in_use_quantity' => 3,
                    'condition' => 'excellent',
                    'location' => 'Biologiya Laboratoriyası',
                    'purchase_date' => '2024-01-10',
                    'warranty_expires' => '2027-01-10',
                    'unit_price' => 450.00,
                    'total_value' => 6750.00,
                    'supplier' => 'Science Equipment Ltd',
                    'last_maintenance' => '2024-08-01',
                    'next_maintenance' => '2025-02-01',
                ],
                [
                    'id' => 4,
                    'name' => 'Masa və Oturacaqlar',
                    'category' => 'Mebel',
                    'total_quantity' => 120,
                    'available_quantity' => 115,
                    'in_use_quantity' => 5,
                    'condition' => 'fair',
                    'location' => 'Müxtəlif Siniflər',
                    'purchase_date' => '2022-08-01',
                    'warranty_expires' => null,
                    'unit_price' => 85.00,
                    'total_value' => 10200.00,
                    'supplier' => 'School Furniture Co',
                    'last_maintenance' => '2024-07-15',
                    'next_maintenance' => '2024-12-15',
                ],
                [
                    'id' => 5,
                    'name' => 'İdman Avadanlıqları',
                    'category' => 'İdman',
                    'total_quantity' => 50,
                    'available_quantity' => 45,
                    'in_use_quantity' => 5,
                    'condition' => 'good',
                    'location' => 'İdman Zalı',
                    'purchase_date' => '2023-11-12',
                    'warranty_expires' => null,
                    'unit_price' => 25.00,
                    'total_value' => 1250.00,
                    'supplier' => 'Sports Equipment Inc',
                    'last_maintenance' => '2024-05-20',
                    'next_maintenance' => '2024-11-20',
                ]
            ];

            // Apply filters if provided
            $category = $request->get('category');
            $condition = $request->get('condition');
            $location = $request->get('location');

            if ($category) {
                $inventoryItems = array_filter($inventoryItems, function($item) use ($category) {
                    return stripos($item['category'], $category) !== false;
                });
            }

            if ($condition) {
                $inventoryItems = array_filter($inventoryItems, function($item) use ($condition) {
                    return $item['condition'] === $condition;
                });
            }

            if ($location) {
                $inventoryItems = array_filter($inventoryItems, function($item) use ($location) {
                    return stripos($item['location'], $location) !== false;
                });
            }

            return response()->json([
                'items' => array_values($inventoryItems),
                'summary' => [
                    'total_items' => count($inventoryItems),
                    'total_value' => array_sum(array_column($inventoryItems, 'total_value')),
                    'categories' => array_unique(array_column($inventoryItems, 'category')),
                    'locations' => array_unique(array_column($inventoryItems, 'location')),
                    'by_condition' => [
                        'excellent' => count(array_filter($inventoryItems, fn($i) => $i['condition'] === 'excellent')),
                        'good' => count(array_filter($inventoryItems, fn($i) => $i['condition'] === 'good')),
                        'fair' => count(array_filter($inventoryItems, fn($i) => $i['condition'] === 'fair')),
                        'poor' => count(array_filter($inventoryItems, fn($i) => $i['condition'] === 'poor')),
                    ]
                ],
                'school' => [
                    'name' => $school->name,
                    'id' => $school->id
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Inventory məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory item details
     */
    public function getInventoryItem(Request $request, $itemId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('schooladmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Mock detailed item data
            $itemDetails = [
                'id' => (int)$itemId,
                'name' => 'Laptop Kompüterlər',
                'description' => 'Dell Latitude 5520 modeli, 15.6" ekran, Intel i5 prosessor',
                'category' => 'İT Avadanlıqları',
                'brand' => 'Dell',
                'model' => 'Latitude 5520',
                'serial_numbers' => ['DL001234', 'DL001235', 'DL001236'],
                'total_quantity' => 25,
                'available_quantity' => 20,
                'in_use_quantity' => 5,
                'condition' => 'good',
                'location' => 'İT Otağı',
                'responsible_person' => 'Rəşad Məmmədov',
                'purchase_date' => '2023-09-15',
                'warranty_expires' => '2026-09-15',
                'unit_price' => 1200.00,
                'total_value' => 30000.00,
                'supplier' => 'Tech Solutions LLC',
                'supplier_contact' => '+994 12 555 0123',
                'last_maintenance' => '2024-06-15',
                'next_maintenance' => '2025-06-15',
                'maintenance_history' => [
                    ['date' => '2024-06-15', 'type' => 'Routine Check', 'notes' => 'All systems functioning properly'],
                    ['date' => '2024-03-10', 'type' => 'Software Update', 'notes' => 'Updated OS and security patches'],
                    ['date' => '2023-12-05', 'type' => 'Hardware Check', 'notes' => 'Cleaned and checked all components']
                ],
                'current_assignments' => [
                    ['user' => 'Aynur Həsənova', 'location' => '5A Sinifi', 'assigned_date' => '2024-08-20'],
                    ['user' => 'Məhəmməd Quliyev', 'location' => '7B Sinifi', 'assigned_date' => '2024-08-22'],
                    ['user' => 'Gülnar Əliyeva', 'location' => 'Müəllimlər Otağı', 'assigned_date' => '2024-08-15']
                ],
                'specifications' => [
                    'Processor' => 'Intel Core i5-1135G7',
                    'RAM' => '8GB DDR4',
                    'Storage' => '256GB SSD',
                    'Display' => '15.6" Full HD',
                    'Operating System' => 'Windows 11 Pro'
                ]
            ];

            return response()->json($itemDetails);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Item məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory statistics
     */
    public function getInventoryStatistics(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('schooladmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $statistics = [
                'overview' => [
                    'total_items' => 218,
                    'total_value' => 54600.00,
                    'items_in_use' => 20,
                    'available_items' => 198,
                    'maintenance_due' => 8,
                    'warranty_expiring_soon' => 3
                ],
                'by_category' => [
                    ['category' => 'İT Avadanlıqları', 'count' => 33, 'value' => 36400.00, 'percentage' => 66.7],
                    ['category' => 'Təqdimat Avadanlıqları', 'count' => 8, 'value' => 6400.00, 'percentage' => 11.7],
                    ['category' => 'Elm Avadanlıqları', 'count' => 15, 'value' => 6750.00, 'percentage' => 12.4],
                    ['category' => 'Mebel', 'count' => 120, 'value' => 10200.00, 'percentage' => 18.7],
                    ['category' => 'İdman', 'count' => 50, 'value' => 1250.00, 'percentage' => 2.3]
                ],
                'by_condition' => [
                    ['condition' => 'excellent', 'count' => 88, 'percentage' => 40.4],
                    ['condition' => 'good', 'count' => 103, 'percentage' => 47.2],
                    ['condition' => 'fair', 'count' => 25, 'percentage' => 11.5],
                    ['condition' => 'poor', 'count' => 2, 'percentage' => 0.9]
                ],
                'monthly_trends' => [
                    ['month' => 'İanvar', 'acquisitions' => 15, 'disposals' => 2, 'value_change' => 6750.00],
                    ['month' => 'Fevral', 'acquisitions' => 8, 'disposals' => 1, 'value_change' => 2400.00],
                    ['month' => 'Mart', 'acquisitions' => 12, 'disposals' => 3, 'value_change' => 1200.00],
                    ['month' => 'Aprel', 'acquisitions' => 6, 'disposals' => 0, 'value_change' => 3600.00],
                    ['month' => 'May', 'acquisitions' => 4, 'disposals' => 2, 'value_change' => 800.00],
                    ['month' => 'İyun', 'acquisitions' => 10, 'disposals' => 1, 'value_change' => 4500.00]
                ],
                'upcoming_maintenance' => [
                    ['item' => 'Projektor #3', 'due_date' => '2024-09-15', 'type' => 'Routine Check'],
                    ['item' => 'Masa və Oturacaqlar', 'due_date' => '2024-09-20', 'type' => 'Deep Cleaning'],
                    ['item' => 'İdman Avadanlıqları', 'due_date' => '2024-10-01', 'type' => 'Safety Inspection']
                ],
                'expiring_warranties' => [
                    ['item' => 'Projektor #2', 'expires' => '2024-12-15', 'days_remaining' => 45],
                    ['item' => 'Səs Sistemi', 'expires' => '2025-01-20', 'days_remaining' => 81],
                    ['item' => 'Kamera Sistemi', 'expires' => '2025-03-10', 'days_remaining' => 130]
                ]
            ];

            return response()->json($statistics);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Statistics yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}