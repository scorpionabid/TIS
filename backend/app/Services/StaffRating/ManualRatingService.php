<?php

namespace App\Services\StaffRating;

use App\Models\StaffRating;
use App\Models\StaffRatingAuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ManualRatingService
 *
 * Handles manual rating operations (given by superiors)
 */
class ManualRatingService
{
    /**
     * Give a manual rating
     */
    public function giveRating(
        User $staffUser,
        User $rater,
        string $category,
        float $score,
        string $period,
        ?string $notes = null
    ): StaffRating {
        // Validate authorization
        if (!$this->canRate($rater, $staffUser)) {
            throw new \UnauthorizedException(
                "{$rater->name} bu işçiyə qiymət verə bilməz: {$staffUser->name}"
            );
        }

        // Validate category
        if (!in_array($category, StaffRating::MANUAL_CATEGORIES)) {
            throw new \InvalidArgumentException("Yanlış kateqoriya: {$category}");
        }

        // Validate score
        if ($score < 0 || $score > 5) {
            throw new \InvalidArgumentException("Qiymət 0-5 aralığında olmalıdır");
        }

        DB::beginTransaction();
        try {
            // Check if rating already exists
            $existing = StaffRating::forStaff($staffUser->id)
                ->forPeriod($period)
                ->forCategory($category)
                ->manual()
                ->byRater($rater->id)
                ->first();

            if ($existing) {
                // Update existing
                $oldData = $existing->toArray();
                $existing->score = $score;
                $existing->notes = $notes;
                $existing->is_latest = true;
                $existing->save();

                // Log update
                StaffRatingAuditLog::logUpdated($existing, $oldData, 'Manual update', $rater);

                DB::commit();
                return $existing;
            }

            // Create new rating
            $rating = StaffRating::create([
                'staff_user_id' => $staffUser->id,
                'staff_role' => $staffUser->getRoleNames()->first(),
                'institution_id' => $staffUser->institution_id,
                'rater_user_id' => $rater->id,
                'rater_role' => $rater->getRoleNames()->first(),
                'rating_type' => StaffRating::RATING_TYPE_MANUAL,
                'category' => $category,
                'score' => $score,
                'period' => $period,
                'notes' => $notes,
                'auto_calculated_data' => null,
                'is_latest' => true,
            ]);

            // Mark previous ratings as not latest
            StaffRating::forStaff($staffUser->id)
                ->forPeriod($period)
                ->forCategory($category)
                ->manual()
                ->where('id', '!=', $rating->id)
                ->update(['is_latest' => false]);

            // Log creation
            StaffRatingAuditLog::logCreated($rating, $rater);

            DB::commit();

            Log::info("Manual rating created", [
                'rating_id' => $rating->id,
                'staff_user' => $staffUser->name,
                'rater' => $rater->name,
                'score' => $score,
                'category' => $category,
            ]);

            return $rating;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update a manual rating
     */
    public function updateRating(
        StaffRating $rating,
        array $data,
        ?User $actor = null
    ): StaffRating {
        if (!$rating->isManual()) {
            throw new \InvalidArgumentException('Yalnız manual reytinqlər yenilənə bilər');
        }

        $actor = $actor ?? auth()->user();

        // Check authorization
        if ($rating->rater_user_id !== $actor->id && !$actor->hasRole('superadmin')) {
            throw new \UnauthorizedException('Yalnız öz verdiyiniz reytinqi yeniləyə bilərsiniz');
        }

        DB::beginTransaction();
        try {
            $oldData = $rating->toArray();

            if (isset($data['score'])) {
                if ($data['score'] < 0 || $data['score'] > 5) {
                    throw new \InvalidArgumentException('Qiymət 0-5 aralığında olmalıdır');
                }
                $rating->score = $data['score'];
            }

            if (isset($data['notes'])) {
                $rating->notes = $data['notes'];
            }

            $rating->save();

            // Log update
            StaffRatingAuditLog::logUpdated(
                $rating,
                $oldData,
                $data['change_reason'] ?? 'Manual update',
                $actor
            );

            DB::commit();

            return $rating->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Delete a manual rating
     */
    public function deleteRating(StaffRating $rating, ?string $reason = null, ?User $actor = null): bool
    {
        if (!$rating->isManual()) {
            throw new \InvalidArgumentException('Yalnız manual reytinqlər silinə bilər');
        }

        $actor = $actor ?? auth()->user();

        // Check authorization
        if ($rating->rater_user_id !== $actor->id && !$actor->hasRole('superadmin')) {
            throw new \UnauthorizedException('Yalnız öz verdiyiniz reytinqi silə bilərsiniz');
        }

        DB::beginTransaction();
        try {
            // Log deletion before deleting
            StaffRatingAuditLog::logDeleted($rating, $reason, $actor);

            $rating->delete();

            DB::commit();

            Log::info("Manual rating deleted", [
                'rating_id' => $rating->id,
                'staff_user_id' => $rating->staff_user_id,
                'deleted_by' => $actor->name,
                'reason' => $reason,
            ]);

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Check if rater can rate the staff member
     *
     * Hierarchy rules:
     * - SuperAdmin → can rate everyone
     * - RegionAdmin → can rate RegionOperators, SektorAdmins, SchoolAdmins in their region
     * - RegionOperator → can rate SektorAdmins, SchoolAdmins in assigned sectors
     * - SektorAdmin → can rate SchoolAdmins in their sector
     */
    public function canRate(User $rater, User $staff): bool
    {
        $raterRole = $rater->getRoleNames()->first();
        $staffRole = $staff->getRoleNames()->first();

        // SuperAdmin can rate everyone
        if ($raterRole === 'superadmin') {
            return true;
        }

        // RegionAdmin
        if ($raterRole === 'regionadmin') {
            // Can rate RegionOperators, SektorAdmins, SchoolAdmins in their region
            if (in_array($staffRole, ['regionoperator', 'sektoradmin', 'schooladmin'])) {
                // Check if same region
                return $this->isSameRegion($rater, $staff);
            }
            return false;
        }

        // RegionOperator
        if ($raterRole === 'regionoperator') {
            // Can rate SektorAdmins, SchoolAdmins in assigned sectors
            if (in_array($staffRole, ['sektoradmin', 'schooladmin'])) {
                return $this->isInAssignedSectors($rater, $staff);
            }
            return false;
        }

        // SektorAdmin
        if ($raterRole === 'sektoradmin') {
            // Can rate SchoolAdmins in their sector
            if ($staffRole === 'schooladmin') {
                return $this->isSameSector($rater, $staff);
            }
            return false;
        }

        return false;
    }

    /**
     * Check if users are in same region
     */
    protected function isSameRegion(User $user1, User $user2): bool
    {
        if (!$user1->institution || !$user2->institution) {
            return false;
        }

        $region1 = $user1->institution->region_code ?? $user1->institution->parent?->region_code;
        $region2 = $user2->institution->region_code ?? $user2->institution->parent?->region_code;

        return $region1 === $region2 && $region1 !== null;
    }

    /**
     * Check if staff is in rater's assigned sectors
     */
    protected function isInAssignedSectors(User $rater, User $staff): bool
    {
        // This would check against region_operator_permissions or similar
        // For now, simplified check based on institution hierarchy
        if (!$rater->institution || !$staff->institution) {
            return false;
        }

        // If staff's institution parent is rater's institution, they're in same sector
        return $staff->institution->parent_id === $rater->institution_id;
    }

    /**
     * Check if users are in same sector
     */
    protected function isSameSector(User $user1, User $user2): bool
    {
        if (!$user1->institution || !$user2->institution) {
            return false;
        }

        // Both should have same parent (sector)
        return $user1->institution->parent_id === $user2->institution->parent_id &&
               $user1->institution->parent_id !== null;
    }

    /**
     * Get all users that a rater can rate
     */
    public function getRateableUsers(User $rater): array
    {
        $raterRole = $rater->getRoleNames()->first();

        if ($raterRole === 'superadmin') {
            // All staff users
            return User::role(['regionoperator', 'sektoradmin', 'schooladmin'])->get()->toArray();
        }

        if ($raterRole === 'regionadmin') {
            // Users in same region
            return User::role(['regionoperator', 'sektoradmin', 'schooladmin'])
                ->whereHas('institution', function ($q) use ($rater) {
                    $regionCode = $rater->institution->region_code;
                    $q->where('region_code', $regionCode)
                      ->orWhereHas('parent', function ($pq) use ($regionCode) {
                          $pq->where('region_code', $regionCode);
                      });
                })
                ->get()
                ->toArray();
        }

        if ($raterRole === 'regionoperator') {
            // Users in assigned sectors
            return User::role(['sektoradmin', 'schooladmin'])
                ->whereHas('institution', function ($q) use ($rater) {
                    $q->where('parent_id', $rater->institution_id);
                })
                ->get()
                ->toArray();
        }

        if ($raterRole === 'sektoradmin') {
            // SchoolAdmins in same sector
            return User::role('schooladmin')
                ->whereHas('institution', function ($q) use ($rater) {
                    $q->where('parent_id', $rater->institution->parent_id);
                })
                ->get()
                ->toArray();
        }

        return [];
    }
}
