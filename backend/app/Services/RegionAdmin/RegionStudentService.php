<?php

namespace App\Services\RegionAdmin;

use App\Models\Institution;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class RegionStudentService
{
    /**
     * Get all students for a region with filtering, pagination, and statistics
     */
    public function getRegionStudents(array $filters, Institution $region): array
    {
        // Get all school-level institution IDs under this region (level 4)
        $allChildIds = $region->getAllChildrenIds();

        // Build base query — only school-level institutions (level 4)
        $schoolIds = Institution::whereIn('id', $allChildIds)
            ->where('level', 4)
            ->pluck('id')
            ->toArray();

        $query = Student::whereIn('institution_id', $schoolIds)
            ->with([
                'institution:id,name,parent_id,level',
                'institution.parent:id,name,parent_id,level',
                'grade:id,name,class_level',
            ]);

        $this->applyFilters($query, $filters, $allChildIds);

        $sortBy = $filters['sort_by'] ?? 'first_name';
        $sortOrder = $filters['sort_order'] ?? 'asc';
        $allowedSorts = ['first_name', 'last_name', 'utis_code', 'student_number', 'grade_level', 'class_name', 'created_at'];
        if (! in_array($sortBy, $allowedSorts)) {
            $sortBy = 'first_name';
        }
        $query->orderBy($sortBy, $sortOrder === 'desc' ? 'desc' : 'asc');

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        $students = $query->paginate($perPage);

        $statistics = $this->calculateStatistics($schoolIds, $filters, $allChildIds);

        return [
            'data' => $students,
            'statistics' => $statistics,
        ];
    }

    /**
     * Get filter options: sectors and schools under the region
     */
    public function getFilterOptions(Institution $region): array
    {
        $allChildIds = $region->getAllChildrenIds();

        // Sectors (level 3)
        $sectors = Institution::whereIn('id', $allChildIds)
            ->where('level', 3)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Schools (level 4)
        $schools = Institution::whereIn('id', $allChildIds)
            ->where('level', 4)
            ->select('id', 'name', 'parent_id')
            ->orderBy('name')
            ->get();

        return [
            'sectors' => $sectors,
            'schools' => $schools,
        ];
    }

    /**
     * Apply filters to the student query
     */
    protected function applyFilters($query, array $filters, array $allChildIds): void
    {
        // Sector filter → narrows to schools under that sector
        if (! empty($filters['sector_id'])) {
            $sectorId = (int) $filters['sector_id'];
            $sectorChildIds = Institution::find($sectorId)?->getAllChildrenIds() ?? [];
            $schoolIds = Institution::whereIn('id', $sectorChildIds)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();
            $query->whereIn('institution_id', $schoolIds);
        }

        // School filter
        if (! empty($filters['school_id'])) {
            $query->where('institution_id', (int) $filters['school_id']);
        }

        // Grade level filter (1–12)
        if (! empty($filters['grade_level'])) {
            $query->where('grade_level', $filters['grade_level']);
        }

        // Class name filter (1A, 2B, etc.)
        if (! empty($filters['class_name'])) {
            $query->where('class_name', $filters['class_name']);
        }

        // Active status filter
        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // Search: ad, soyad, UTIS, tələbə nömrəsi
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ILIKE', "%{$search}%")
                    ->orWhere('last_name', 'ILIKE', "%{$search}%")
                    ->orWhere('utis_code', 'ILIKE', "%{$search}%")
                    ->orWhere('student_number', 'ILIKE', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) ILIKE ?", ["%{$search}%"]);
            });
        }
    }

    /**
     * Calculate summary statistics for the region
     */
    protected function calculateStatistics(array $schoolIds, array $filters, array $allChildIds): array
    {
        if (empty($schoolIds)) {
            return [
                'total_students' => 0,
                'active_students' => 0,
                'inactive_students' => 0,
                'total_schools' => 0,
                'total_sectors' => 0,
                'by_grade_level' => [],
                'by_sector' => [],
            ];
        }

        $base = Student::whereIn('institution_id', $schoolIds);

        // Apply same filters (except pagination/sort) for accurate stats
        $filtered = clone $base;
        if (! empty($filters['sector_id'])) {
            $sectorChildIds = Institution::find((int) $filters['sector_id'])?->getAllChildrenIds() ?? [];
            $sectorSchoolIds = Institution::whereIn('id', $sectorChildIds)->where('level', 4)->pluck('id')->toArray();
            $filtered->whereIn('institution_id', $sectorSchoolIds);
        }
        if (! empty($filters['school_id'])) {
            $filtered->where('institution_id', (int) $filters['school_id']);
        }
        if (! empty($filters['grade_level'])) {
            $filtered->where('grade_level', $filters['grade_level']);
        }
        if (! empty($filters['class_name'])) {
            $filtered->where('class_name', $filters['class_name']);
        }

        $total = (clone $filtered)->count();
        $active = (clone $filtered)->where('is_active', true)->count();

        // By grade level
        $byGradeLevel = (clone $filtered)
            ->select('grade_level', DB::raw('COUNT(*) as count'))
            ->groupBy('grade_level')
            ->orderByRaw('CAST(grade_level AS INTEGER) ASC')
            ->pluck('count', 'grade_level')
            ->toArray();

        // By sector (each sector's school student count)
        $sectors = Institution::whereIn('id', $allChildIds)
            ->where('level', 3)
            ->select('id', 'name')
            ->get();

        $bySector = [];
        foreach ($sectors as $sector) {
            $sectorSchoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $count = Student::whereIn('institution_id', $sectorSchoolIds)->count();
            $bySector[] = [
                'sector_id' => $sector->id,
                'sector_name' => $sector->name,
                'student_count' => $count,
            ];
        }

        $totalSectors = Institution::whereIn('id', $allChildIds)->where('level', 3)->count();

        return [
            'total_students' => $total,
            'active_students' => $active,
            'inactive_students' => $total - $active,
            'total_schools' => count($schoolIds),
            'total_sectors' => $totalSectors,
            'by_grade_level' => $byGradeLevel,
            'by_sector' => $bySector,
        ];
    }
}
