<?php

namespace App\Services\StaffRating;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * DirectorManagementService
 *
 * Manages director assignments via institution metadata
 * Directors are stored in institutions.metadata JSON field
 */
class DirectorManagementService
{
    /**
     * Assign a director to an institution
     */
    public function assignDirector(Institution $institution, User $user, ?string $notes = null): Institution
    {
        // Validate user is SchoolAdmin
        if (!$user->hasRole('schooladmin')) {
            throw new \InvalidArgumentException('İstifadəçi schooladmin roluna malik deyil');
        }

        // Get existing metadata
        $metadata = $institution->metadata ?? [];

        // Set director info
        $metadata['director'] = [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'appointment_date' => now()->toDateString(),
            'status' => 'active',
            'notes' => $notes,
        ];

        // Update institution
        $institution->metadata = $metadata;
        $institution->save();

        Log::info("Director assigned to institution {$institution->id}", [
            'institution' => $institution->name,
            'director_id' => $user->id,
            'director_name' => $user->name,
        ]);

        return $institution->fresh();
    }

    /**
     * Remove director from institution
     */
    public function removeDirector(Institution $institution, ?string $reason = null): Institution
    {
        $metadata = $institution->metadata ?? [];

        if (isset($metadata['director'])) {
            $oldDirector = $metadata['director'];

            // Archive old director info
            if (!isset($metadata['director_history'])) {
                $metadata['director_history'] = [];
            }

            $metadata['director_history'][] = array_merge($oldDirector, [
                'removed_at' => now()->toDateString(),
                'removal_reason' => $reason,
            ]);

            // Remove current director
            unset($metadata['director']);

            $institution->metadata = $metadata;
            $institution->save();

            Log::info("Director removed from institution {$institution->id}", [
                'institution' => $institution->name,
                'old_director' => $oldDirector,
                'reason' => $reason,
            ]);
        }

        return $institution->fresh();
    }

    /**
     * Update director information
     */
    public function updateDirector(Institution $institution, array $data): Institution
    {
        $metadata = $institution->metadata ?? [];

        if (!isset($metadata['director'])) {
            throw new \RuntimeException('Bu müəssisənin direktoru yoxdur');
        }

        // Update allowed fields
        if (isset($data['notes'])) {
            $metadata['director']['notes'] = $data['notes'];
        }

        if (isset($data['status'])) {
            $metadata['director']['status'] = $data['status'];
        }

        $metadata['director']['updated_at'] = now()->toDateString();

        $institution->metadata = $metadata;
        $institution->save();

        return $institution->fresh();
    }

    /**
     * Get director for an institution
     */
    public function getDirector(Institution $institution): ?array
    {
        $metadata = $institution->metadata ?? [];
        return $metadata['director'] ?? null;
    }

    /**
     * Get director user model
     */
    public function getDirectorUser(Institution $institution): ?User
    {
        $directorInfo = $this->getDirector($institution);

        if (!$directorInfo || !isset($directorInfo['user_id'])) {
            return null;
        }

        return User::find($directorInfo['user_id']);
    }

    /**
     * Check if institution has a director
     */
    public function hasDirector(Institution $institution): bool
    {
        $metadata = $institution->metadata ?? [];
        return isset($metadata['director']) && $metadata['director']['status'] === 'active';
    }

    /**
     * Get all directors (across all institutions)
     */
    public function getAllDirectors(?int $regionId = null, ?int $sectorId = null): array
    {
        $query = Institution::whereNotNull('metadata');

        // Filter by region if provided
        if ($regionId) {
            $query->where('parent_id', $regionId);
        }

        // Filter by sector if provided
        if ($sectorId) {
            $query->where('parent_id', $sectorId);
        }

        $institutions = $query->get();

        $directors = [];
        foreach ($institutions as $institution) {
            $directorInfo = $this->getDirector($institution);
            if ($directorInfo) {
                $directors[] = [
                    'institution_id' => $institution->id,
                    'institution_name' => $institution->name,
                    'institution_type' => $institution->type,
                    'director' => $directorInfo,
                ];
            }
        }

        return $directors;
    }

    /**
     * Bulk assign directors from array
     *
     * @param array $assignments [['institution_id' => 1, 'user_id' => 5, 'notes' => '...'], ...]
     * @return array ['success' => count, 'failed' => [...]]
     */
    public function bulkAssignDirectors(array $assignments): array
    {
        $success = 0;
        $failed = [];

        DB::beginTransaction();
        try {
            foreach ($assignments as $assignment) {
                try {
                    $institution = Institution::findOrFail($assignment['institution_id']);
                    $user = User::findOrFail($assignment['user_id']);

                    $this->assignDirector(
                        $institution,
                        $user,
                        $assignment['notes'] ?? null
                    );

                    $success++;
                } catch (\Exception $e) {
                    $failed[] = [
                        'institution_id' => $assignment['institution_id'] ?? null,
                        'user_id' => $assignment['user_id'] ?? null,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'success' => $success,
            'failed' => $failed,
            'total' => count($assignments),
        ];
    }

    /**
     * Get director history for an institution
     */
    public function getDirectorHistory(Institution $institution): array
    {
        $metadata = $institution->metadata ?? [];
        return $metadata['director_history'] ?? [];
    }
}
