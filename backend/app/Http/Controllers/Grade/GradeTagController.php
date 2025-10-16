<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\Controller;
use App\Models\GradeTag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Grade Tag Controller
 *
 * Manages grade tag CRUD operations and provides tag data for grade categorization
 */
class GradeTagController extends Controller
{
    /**
     * Get all grade tags grouped by category
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $activeOnly = $request->boolean('active_only', true);
            $category = $request->get('category');

            $query = GradeTag::query();

            if ($activeOnly) {
                $query->where('is_active', true);
            }

            if ($category) {
                $query->where('category', $category);
            }

            $tags = $query->orderBy('sort_order')->orderBy('name')->get();

            // Group by category
            $grouped = $tags->groupBy('category')->map(function ($categoryTags, $categoryKey) {
                return [
                    'category' => $categoryKey,
                    'category_name' => GradeTag::getCategories()[$categoryKey] ?? $categoryKey,
                    'tags' => $categoryTags->values(),
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => $grouped,
                'meta' => [
                    'total_tags' => $tags->count(),
                    'total_categories' => $grouped->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tag məlumatları alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get all tags as flat list
     */
    public function list(Request $request): JsonResponse
    {
        try {
            $activeOnly = $request->boolean('active_only', true);
            $category = $request->get('category');

            $query = GradeTag::query();

            if ($activeOnly) {
                $query->where('is_active', true);
            }

            if ($category) {
                $query->where('category', $category);
            }

            $tags = $query->orderBy('sort_order')->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $tags,
                'meta' => [
                    'total' => $tags->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tag siyahısı alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get available categories
     */
    public function categories(): JsonResponse
    {
        try {
            $categories = collect(GradeTag::getCategories())->map(function ($name, $key) {
                $count = GradeTag::where('category', $key)->where('is_active', true)->count();
                return [
                    'key' => $key,
                    'name' => $name,
                    'tag_count' => $count,
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kateqoriya siyahısı alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get education program options
     */
    public function educationPrograms(): JsonResponse
    {
        try {
            $programs = [
                [
                    'value' => 'umumi',
                    'label' => 'Ümumi təhsil',
                    'description' => 'Standart ümumi təhsil proqramı',
                ],
                [
                    'value' => 'xususi',
                    'label' => 'Xüsusi təhsil',
                    'description' => 'Xüsusi ehtiyacları olan şagirdlər üçün təhsil',
                ],
                [
                    'value' => 'mektebde_ferdi',
                    'label' => 'Məktəbdə fərdi təhsil',
                    'description' => 'Məktəbdə fərdi təhsil proqramı',
                ],
                [
                    'value' => 'evde_ferdi',
                    'label' => 'Evdə fərdi təhsil',
                    'description' => 'Evdə fərdi təhsil proqramı',
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => $programs,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təhsil proqramları alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}
