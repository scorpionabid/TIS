<?php

namespace App\Http\Controllers;

use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class LinkShareController extends Controller
{
    /**
     * Get links accessible to user
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = LinkShare::with(['sharedBy', 'institution'])->active();

        // Apply regional hierarchy filtering
        $this->applyRegionalFilter($query, $user);

        // Apply filters
        if ($request->filled('link_type')) {
            $query->where('link_type', $request->link_type);
        }

        if ($request->filled('share_scope')) {
            $query->byScope($request->share_scope);
        }

        if ($request->filled('is_featured')) {
            if ($request->boolean('is_featured')) {
                $query->featured();
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('url', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        $links = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $links,
        ]);
    }

    /**
     * Create new link share with regional targeting and time limits
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'url' => 'required|url|max:2048',
            'link_type' => 'nullable|in:external,video,form,document',
            'share_scope' => 'required|in:public,regional,sectoral,institutional,specific_users',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id',
            'target_roles' => 'nullable|array',
            'target_roles.*' => 'string',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'integer|exists:departments,id',
            'requires_login' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
            'max_clicks' => 'nullable|integer|min:1|max:10000',
            'access_start_time' => 'nullable|date_format:H:i',
            'access_end_time' => 'nullable|date_format:H:i',
            'access_days_of_week' => 'nullable|array',
            'access_days_of_week.*' => 'integer|between:0,6',
            'thumbnail_url' => 'nullable|url',
            'is_featured' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check sharing permissions
        if (!$this->canCreateLinkWithScope($user, $request->share_scope)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu paylaşım əhatəsi üçün səlahiyyətiniz yoxdur.',
            ], 403);
        }

        // Validate target institutions
        if ($request->target_institutions) {
            $allowedInstitutions = $this->getUserTargetableInstitutions($user);
            $invalidInstitutions = array_diff($request->target_institutions, $allowedInstitutions);
            
            if (!empty($invalidInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən təşkilatlara link paylaşma səlahiyyətiniz yoxdur.',
                ], 403);
            }
        }

        try {
            $linkShare = LinkShare::create([
                'title' => $request->title,
                'description' => $request->description,
                'url' => $request->url,
                'link_type' => $request->link_type ?? 'external',
                'shared_by' => $user->id,
                'institution_id' => $user->institution_id,
                'share_scope' => $request->share_scope,
                'target_institutions' => $request->target_institutions,
                'target_roles' => $request->target_roles,
                'target_departments' => $request->target_departments,
                'requires_login' => $request->boolean('requires_login', true),
                'expires_at' => $request->expires_at,
                'max_clicks' => $request->max_clicks,
                'access_start_time' => $request->access_start_time,
                'access_end_time' => $request->access_end_time,
                'access_days_of_week' => $request->access_days_of_week,
                'thumbnail_url' => $request->thumbnail_url,
                'is_featured' => $request->boolean('is_featured', false),
                'status' => 'active',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Link uğurla paylaşıldı.',
                'data' => $linkShare->load(['sharedBy', 'institution']),
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Link paylaşılarkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Show link details
     */
    public function show(LinkShare $linkShare): JsonResponse
    {
        $user = Auth::user();

        if (!$linkShare->canBeAccessedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu linkə giriş icazəniz yoxdur.',
            ], 403);
        }

        $linkShare->load(['sharedBy', 'institution']);

        // Get analytics if user is creator or admin
        $analytics = null;
        if ($linkShare->shared_by === $user->id || $user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            $analytics = $linkShare->getStatistics();
        }

        return response()->json([
            'success' => true,
            'data' => $linkShare,
            'analytics' => $analytics,
        ]);
    }

    /**
     * Update link share
     */
    public function update(Request $request, LinkShare $linkShare): JsonResponse
    {
        $user = Auth::user();

        // Check edit permissions
        if ($linkShare->shared_by !== $user->id && !$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu linki dəyişdirmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'string|max:300',
            'description' => 'nullable|string|max:1000',
            'url' => 'url|max:2048',
            'link_type' => 'nullable|in:external,video,form,document',
            'expires_at' => 'nullable|date|after:now',
            'max_clicks' => 'nullable|integer|min:1|max:10000',
            'access_start_time' => 'nullable|date_format:H:i',
            'access_end_time' => 'nullable|date_format:H:i',
            'access_days_of_week' => 'nullable|array',
            'access_days_of_week.*' => 'integer|between:0,6',
            'status' => 'in:active,expired,disabled',
            'is_featured' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $linkShare->update($request->only([
                'title', 'description', 'url', 'link_type', 'expires_at',
                'max_clicks', 'access_start_time', 'access_end_time',
                'access_days_of_week', 'status', 'is_featured'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Link uğurla yeniləndi.',
                'data' => $linkShare->fresh(['sharedBy', 'institution']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Link yenilənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Delete link share
     */
    public function destroy(LinkShare $linkShare): JsonResponse
    {
        $user = Auth::user();

        // Check delete permissions
        if ($linkShare->shared_by !== $user->id && !$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu linki silmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        try {
            $linkShare->delete();

            return response()->json([
                'success' => true,
                'message' => 'Link uğurla silindi.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Link silinərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Access link and record analytics
     */
    public function access(LinkShare $linkShare): JsonResponse
    {
        $user = Auth::user();

        if (!$linkShare->canBeAccessedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu linkə giriş icazəniz yoxdur.',
                'reasons' => [
                    'is_active' => $linkShare->isActive(),
                    'time_valid' => $linkShare->isAccessTimeValid(),
                    'user_access' => $user ? 'authenticated' : 'guest',
                ],
            ], 403);
        }

        try {
            // Record access
            $linkShare->recordAccess(
                $user,
                request()->ip(),
                request()->userAgent()
            );

            return response()->json([
                'success' => true,
                'message' => 'Link giriş qeydə alındı.',
                'data' => [
                    'url' => $linkShare->url,
                    'title' => $linkShare->title,
                    'description' => $linkShare->description,
                    'link_type' => $linkShare->link_type,
                    'click_count' => $linkShare->click_count,
                ],
                'redirect_url' => $linkShare->url,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Link giriş qeydə alınarkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get link statistics
     */
    public function getStatistics(LinkShare $linkShare): JsonResponse
    {
        $user = Auth::user();

        // Check analytics permissions
        if ($linkShare->shared_by !== $user->id && !$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu linkin analitikasını görmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        $statistics = $linkShare->getStatistics();
        
        // Get detailed access logs
        $recentAccess = $linkShare->accessLogs()
                                 ->with('user:id,username,first_name,last_name')
                                 ->orderBy('created_at', 'desc')
                                 ->limit(50)
                                 ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'statistics' => $statistics,
                'recent_access' => $recentAccess,
                'link_info' => [
                    'created_at' => $linkShare->created_at,
                    'expires_at' => $linkShare->expires_at,
                    'max_clicks' => $linkShare->max_clicks,
                    'status' => $linkShare->status,
                ],
            ],
        ]);
    }

    /**
     * Get sharing options for current user
     */
    public function getSharingOptions(): JsonResponse
    {
        $user = Auth::user();
        $userRole = $user->roles->first();
        
        if (!$userRole) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi rolunuz müəyyən edilməyib.',
            ], 403);
        }

        $targetableInstitutions = $this->getUserTargetableInstitutions($user);
        $institutions = Institution::whereIn('id', $targetableInstitutions)
                                  ->where('is_active', true)
                                  ->get(['id', 'name', 'type', 'level']);

        $availableScopes = $this->getAvailableScopesForRole($userRole->name);
        $availableRoles = $this->getAvailableTargetRoles($userRole->name);

        return response()->json([
            'success' => true,
            'data' => [
                'targetable_institutions' => $institutions,
                'available_scopes' => $availableScopes,
                'available_roles' => $availableRoles,
                'link_types' => [
                    'external' => 'Xarici link',
                    'video' => 'Video',
                    'form' => 'Form',
                    'document' => 'Sənəd',
                ],
                'time_restrictions' => [
                    'work_hours' => ['09:00', '18:00'],
                    'work_days' => [1, 2, 3, 4, 5], // Monday to Friday
                ],
            ],
        ]);
    }

    /**
     * Check if user can create link with specified scope
     */
    private function canCreateLinkWithScope($user, $scope): bool
    {
        $userRole = $user->roles->first();
        if (!$userRole) return false;

        $allowedScopes = [
            'superadmin' => ['public', 'regional', 'sectoral', 'institutional', 'specific_users'],
            'regionadmin' => ['regional', 'sectoral', 'institutional', 'specific_users'],
            'regionoperator' => ['institutional', 'specific_users'],
            'sektoradmin' => ['sectoral', 'institutional', 'specific_users'],
            'sektoroperator' => ['institutional', 'specific_users'],
            'schooladmin' => ['institutional', 'specific_users'],
            'deputy' => ['institutional'],
            'teacher' => ['institutional'],
        ];

        return in_array($scope, $allowedScopes[$userRole->name] ?? ['institutional']);
    }

    /**
     * Get available sharing scopes for role
     */
    private function getAvailableScopesForRole($roleName): array
    {
        $scopeDefinitions = [
            'public' => 'Hamı üçün açıq',
            'regional' => 'Regional',
            'sectoral' => 'Sektor daxili',
            'institutional' => 'Təşkilat daxili',
            'specific_users' => 'Xüsusi istifadəçilər',
        ];

        $allowedScopes = [
            'superadmin' => ['public', 'regional', 'sectoral', 'institutional', 'specific_users'],
            'regionadmin' => ['regional', 'sectoral', 'institutional', 'specific_users'],
            'regionoperator' => ['institutional', 'specific_users'],
            'sektoradmin' => ['sectoral', 'institutional', 'specific_users'],
            'sektoroperator' => ['institutional', 'specific_users'],
            'schooladmin' => ['institutional', 'specific_users'],
            'deputy' => ['institutional'],
            'teacher' => ['institutional'],
        ];

        $userScopes = $allowedScopes[$roleName] ?? ['institutional'];
        
        return array_intersect_key($scopeDefinitions, array_flip($userScopes));
    }

    /**
     * Get available target roles for user's role
     */
    private function getAvailableTargetRoles($roleName): array
    {
        $targetRoles = [
            'superadmin' => ['regionadmin', 'regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'regionadmin' => ['regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'regionoperator' => ['schooladmin', 'deputy', 'teacher'],
            'sektoradmin' => ['sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'sektoroperator' => ['schooladmin', 'deputy', 'teacher'],
            'schooladmin' => ['deputy', 'teacher'],
            'deputy' => ['teacher'],
            'teacher' => [],
        ];

        return $targetRoles[$roleName] ?? [];
    }

    /**
     * Get institutions user can target
     */
    private function getUserTargetableInstitutions($user): array
    {
        $userRole = $user->roles->first();
        if (!$userRole) return [];

        $userInstitution = $user->institution;
        if (!$userInstitution) return [];

        switch ($userRole->name) {
            case 'superadmin':
                return Institution::where('is_active', true)->pluck('id')->toArray();
                
            case 'regionadmin':
                return Institution::where('region_code', $userInstitution->region_code)
                                 ->where('is_active', true)
                                 ->pluck('id')->toArray();
                                 
            case 'regionoperator':
                return Institution::where('region_code', $userInstitution->region_code)
                                 ->where('type', 'school')
                                 ->where('is_active', true)
                                 ->pluck('id')->toArray();
                                 
            case 'sektoradmin':
                return Institution::where(function($q) use ($userInstitution) {
                    $q->where('id', $userInstitution->id)
                      ->orWhere('parent_id', $userInstitution->id);
                })->where('is_active', true)->pluck('id')->toArray();
                
            case 'sektoroperator':
                $userSector = $userInstitution->type === 'sektor' ? $userInstitution : $userInstitution->parent;
                if (!$userSector) return [$userInstitution->id];
                
                return Institution::where('parent_id', $userSector->id)
                                 ->where('type', 'school')
                                 ->where('is_active', true)
                                 ->pluck('id')->toArray();
                                 
            default:
                return [$userInstitution->id];
        }
    }

    /**
     * Apply regional hierarchy filter to query
     */
    private function applyRegionalFilter($query, $user): void
    {
        $userRole = $user->roles->first();
        
        if (!$userRole || $userRole->name === 'superadmin') {
            return; // SuperAdmin sees everything
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            $query->where('id', -1); // No access if no institution
            return;
        }

        $query->where(function($q) use ($user, $userInstitution, $userRole) {
            // Links shared by user
            $q->where('shared_by', $user->id)
              
              // Links targeted to user's institution
              ->orWhereJsonContains('target_institutions', $userInstitution->id)
              
              // Links targeted to user's role
              ->orWhereJsonContains('target_roles', $userRole->name)
              
              // Public links
              ->orWhere('share_scope', 'public')
              
              // Regional scope links
              ->orWhere(function($subQ) use ($userInstitution) {
                  $subQ->where('share_scope', 'regional')
                       ->whereHas('institution', function($instQ) use ($userInstitution) {
                           $instQ->where('region_code', $userInstitution->region_code);
                       });
              })
              
              // Sectoral scope links
              ->orWhere(function($subQ) use ($userInstitution) {
                  if ($userInstitution->type === 'school') {
                      $subQ->where('share_scope', 'sectoral')
                           ->whereHas('institution', function($instQ) use ($userInstitution) {
                               $instQ->where('id', $userInstitution->parent_id);
                           });
                  }
              })
              
              // Institutional scope links
              ->orWhere(function($subQ) use ($userInstitution) {
                  $subQ->where('share_scope', 'institutional')
                       ->where('institution_id', $userInstitution->id);
              });
        });
    }
}