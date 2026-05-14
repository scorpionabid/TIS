<?php

namespace App\Services;

use App\Models\TeacherEvaluation;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class PermissionCheckService extends BaseService
{
    public function canAccessEvaluation(TeacherEvaluation $evaluation): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            return $evaluation->institution &&
                   $evaluation->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $evaluation->institution_id === $user->institution_id;
        }

        return in_array($user->id, [$evaluation->teacher_id, $evaluation->evaluator_id]);
    }

    public function canUpdateEvaluation(TeacherEvaluation $evaluation): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($evaluation->status === 'approved') {
            return false;
        }

        if ($user->hasRole('regionadmin')) {
            return $evaluation->institution &&
                   $evaluation->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $evaluation->institution_id === $user->institution_id;
        }

        return $evaluation->evaluator_id === $user->id;
    }

    public function canDeleteEvaluation(TeacherEvaluation $evaluation): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($evaluation->status === 'approved') {
            return false;
        }

        if ($user->hasRole('regionadmin')) {
            return $evaluation->institution &&
                   $evaluation->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $evaluation->institution_id === $user->institution_id;
        }

        return $evaluation->evaluator_id === $user->id;
    }

    public function canCompleteEvaluation(TeacherEvaluation $evaluation): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $evaluation->evaluator_id === $user->id;
    }

    public function canModifyEvaluation(TeacherEvaluation $evaluation): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $evaluation->evaluator_id === $user->id;
    }

    public function canApproveEvaluation(): bool
    {
        return Auth::user()->hasPermissionTo('manage teacher_performance');
    }

    public function canRequestRevision(): bool
    {
        return Auth::user()->hasPermissionTo('manage teacher_performance');
    }

    public function canAccessTeacherData(int $teacherId): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        $teacher = User::find($teacherId);
        if (! $teacher) {
            return false;
        }

        if ($user->hasRole('regionadmin')) {
            return $teacher->region_id === $user->region_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $teacher->institution_id === $user->institution_id;
        }

        return $teacher->id === $user->id;
    }

    public function canAccessInstitutionData(int $institutionId): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $institution = \App\Models\Institution::find($institutionId);

            return $institution && $institution->region_id === $user->region_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $institutionId === $user->institution_id;
        }

        return false;
    }

    public function getUserAccessibleInstitutions(): array
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return \App\Models\Institution::pluck('id')->toArray();
        }

        if ($user->hasRole('regionadmin')) {
            return \App\Models\Institution::where('region_id', $user->region_id)
                ->pluck('id')
                ->toArray();
        }

        if ($user->hasRole('schooladmin')) {
            return [$user->institution_id];
        }

        return [];
    }

    public function applyEvaluationFilters($query)
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return $query;
        }

        if ($user->hasRole('regionadmin')) {
            return $query->whereHas('institution', function ($q) use ($user) {
                $q->where('region_id', $user->region_id);
            });
        }

        if ($user->hasRole('schooladmin')) {
            return $query->where('institution_id', $user->institution_id);
        }

        if ($user->hasRole('mudur')) {
            return $query->where(function ($q) use ($user) {
                $q->where('teacher_id', $user->id)
                    ->orWhere('evaluator_id', $user->id);
            });
        }

        return $query->where('teacher_id', $user->id);
    }
}
