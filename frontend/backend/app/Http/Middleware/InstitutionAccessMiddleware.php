<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class InstitutionAccessMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $institutionParam  The parameter name containing institution ID
     */
    public function handle(Request $request, Closure $next, string $institutionParam = 'institution'): Response
    {
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = Auth::user();
        
        // SuperAdmin has access to all institutions
        if ($user->hasRole('superadmin')) {
            return $next($request);
        }

        // Get institution ID from request
        $requestedInstitutionId = $request->route($institutionParam) ?? 
                                 $request->input('institution_id') ?? 
                                 $request->input($institutionParam);

        if (!$requestedInstitutionId) {
            return response()->json([
                'message' => 'Institution access required but no institution specified'
            ], 400);
        }

        // Check if user has access to the requested institution
        if (!$this->hasInstitutionAccess($user, $requestedInstitutionId)) {
            return response()->json([
                'message' => 'Access denied to this institution'
            ], 403);
        }

        return $next($request);
    }

    /**
     * Check if user has access to specific institution
     */
    private function hasInstitutionAccess($user, $institutionId): bool
    {
        // User's own institution
        if ($user->institution_id == $institutionId) {
            return true;
        }

        // RegionAdmin can access institutions in their region
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->type === 'region') {
                $requestedInstitution = \App\Models\Institution::find($institutionId);
                if ($requestedInstitution && $requestedInstitution->isDescendantOf($userInstitution)) {
                    return true;
                }
            }
        }

        // SektorAdmin can access schools in their sector
        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->type === 'sector') {
                $requestedInstitution = \App\Models\Institution::find($institutionId);
                if ($requestedInstitution && $requestedInstitution->parent_id === $userInstitution->id) {
                    return true;
                }
            }
        }

        return false;
    }
}