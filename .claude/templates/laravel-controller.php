<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\{{ModelName}};
use App\Http\Requests\{{ModelName}}Request;

/**
 * {{ModelName}} Controller - ATİS Layihəsi
 * Role-based access control və institution hierarchy ilə
 */
class {{ModelName}}Controller extends Controller
{
    /**
     * {{ModelName}} siyahısını göstər (paginated)
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', {{ModelName}}::class);
        
        $query = {{ModelName}}::query();
        
        // Institution hierarchy filter (user yalnız öz hierarchy-sindəkiləri görsün)
        if (auth()->user()->hasRole(['RegionAdmin', 'RegionOperator'])) {
            $query->whereHas('institution.region', function ($q) {
                $q->where('id', auth()->user()->institution->region_id);
            });
        } elseif (auth()->user()->hasRole(['SektorAdmin', 'SchoolAdmin'])) {
            $query->whereHas('institution', function ($q) {
                $q->where('id', auth()->user()->institution_id);
            });
        }
        
        // Search functionality
        if ($request->has('search')) {
            $query->where('name', 'LIKE', '%' . $request->search . '%');
        }
        
        // Status filter
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $data = $query->with(['institution', 'createdBy'])
                     ->latest()
                     ->paginate(15);
        
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => '{{ModelName}} siyahısı uğurla alındı'
        ]);
    }
    
    /**
     * Yeni {{ModelName}} yarat
     */
    public function store({{ModelName}}Request $request): JsonResponse
    {
        $this->authorize('create', {{ModelName}}::class);
        
        $data = $request->validated();
        
        // Avtomatik institution assignment
        if (!isset($data['institution_id']) && auth()->user()->institution_id) {
            $data['institution_id'] = auth()->user()->institution_id;
        }
        
        // Created by user
        $data['created_by'] = auth()->id();
        
        ${{modelName}} = {{ModelName}}::create($data);
        
        return response()->json([
            'success' => true,
            'data' => ${{modelName}}->load(['institution', 'createdBy']),
            'message' => '{{ModelName}} uğurla yaradıldı'
        ], 201);
    }
    
    /**
     * {{ModelName}} detallarını göstər
     */
    public function show({{ModelName}} ${{modelName}}): JsonResponse
    {
        $this->authorize('view', ${{modelName}});
        
        ${{modelName}}->load(['institution', 'createdBy', 'updatedBy']);
        
        return response()->json([
            'success' => true,
            'data' => ${{modelName}},
            'message' => '{{ModelName}} detalları alındı'
        ]);
    }
    
    /**
     * {{ModelName}} məlumatlarını yenilə
     */
    public function update({{ModelName}}Request $request, {{ModelName}} ${{modelName}}): JsonResponse
    {
        $this->authorize('update', ${{modelName}});
        
        $data = $request->validated();
        $data['updated_by'] = auth()->id();
        
        ${{modelName}}->update($data);
        
        return response()->json([
            'success' => true,
            'data' => ${{modelName}}->load(['institution', 'createdBy', 'updatedBy']),
            'message' => '{{ModelName}} uğurla yeniləndi'
        ]);
    }
    
    /**
     * {{ModelName}}-i sil
     */
    public function destroy({{ModelName}} ${{modelName}}): JsonResponse
    {
        $this->authorize('delete', ${{modelName}});
        
        // Soft delete
        ${{modelName}}->delete();
        
        return response()->json([
            'success' => true,
            'message' => '{{ModelName}} uğurla silindi'
        ]);
    }
    
    /**
     * Bulk operations
     */
    public function bulkAction(Request $request): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:delete,activate,deactivate',
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:{{table_name}},id'
        ]);
        
        ${{modelName}}s = {{ModelName}}::whereIn('id', $request->ids)->get();
        
        // Authorization check for each item
        foreach (${{modelName}}s as ${{modelName}}) {
            $this->authorize($request->action === 'delete' ? 'delete' : 'update', ${{modelName}});
        }
        
        switch ($request->action) {
            case 'delete':
                {{ModelName}}::whereIn('id', $request->ids)->delete();
                $message = count($request->ids) . ' {{ModelName}} silindi';
                break;
            case 'activate':
                {{ModelName}}::whereIn('id', $request->ids)->update(['status' => 'active']);
                $message = count($request->ids) . ' {{ModelName}} aktivləşdirildi';
                break;
            case 'deactivate':
                {{ModelName}}::whereIn('id', $request->ids)->update(['status' => 'inactive']);
                $message = count($request->ids) . ' {{ModelName}} deaktivləşdirildi';
                break;
        }
        
        return response()->json([
            'success' => true,
            'message' => $message
        ]);
    }
}