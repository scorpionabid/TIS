<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingResult;
use App\Models\RatingConfiguration;
use App\Models\AcademicYear;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * TeacherRatingService - Main Rating Calculation Service
 *
 * Hesablar 6 komponentin balını və final reytinqi yaradır:
 * 1. Academic Results (30%)
 * 2. Lesson Observation (20%)
 * 3. Olympiad Achievements (15%)
 * 4. Assessment Scores (15%)
 * 5. Certificates (10%)
 * 6. Awards (10%)
 */
class TeacherRatingService
{
    protected AcademicResultsCalculator $academicCalculator;
    protected LessonObservationCalculator $lessonCalculator;
    protected OlympiadCalculator $olympiadCalculator;
    protected AssessmentCalculator $assessmentCalculator;
    protected CertificateCalculator $certificateCalculator;
    protected AwardCalculator $awardCalculator;

    public function __construct()
    {
        $this->academicCalculator = new AcademicResultsCalculator();
        $this->lessonCalculator = new LessonObservationCalculator();
        $this->olympiadCalculator = new OlympiadCalculator();
        $this->assessmentCalculator = new AssessmentCalculator();
        $this->certificateCalculator = new CertificateCalculator();
        $this->awardCalculator = new AwardCalculator();
    }

    /**
     * Calculate rating for a single teacher for specific academic year
     *
     * @param TeacherProfile $teacher
     * @param int $academicYearId
     * @return RatingResult
     */
    public function calculateTeacherRating(TeacherProfile $teacher, int $academicYearId): RatingResult
    {
        DB::beginTransaction();
        try {
            Log::info('TeacherRatingService - Calculating rating', [
                'teacher_id' => $teacher->id,
                'academic_year_id' => $academicYearId,
            ]);

            // Get rating configuration
            $config = RatingConfiguration::all()->keyBy('component_name');

            // Calculate each component score
            $academicScore = $this->academicCalculator->calculate($teacher, $academicYearId, $config['academic']);
            $lessonScore = $this->lessonCalculator->calculate($teacher, $academicYearId, $config['lesson_observation']);
            $olympiadScore = $this->olympiadCalculator->calculate($teacher, $academicYearId, $config['olympiad']);
            $assessmentScore = $this->assessmentCalculator->calculate($teacher, $academicYearId, $config['assessment']);
            $certificateScore = $this->certificateCalculator->calculate($teacher, $academicYearId, $config['certificate']);
            $awardScore = $this->awardCalculator->calculate($teacher, $academicYearId, $config['award']);

            // Calculate total score
            $totalScore = $academicScore['weighted_score']
                + $lessonScore['weighted_score']
                + $olympiadScore['weighted_score']
                + $assessmentScore['weighted_score']
                + $certificateScore['weighted_score']
                + $awardScore['weighted_score'];

            // Prepare breakdown
            $breakdown = [
                'academic' => $academicScore,
                'lesson_observation' => $lessonScore,
                'olympiad' => $olympiadScore,
                'assessment' => $assessmentScore,
                'certificate' => $certificateScore,
                'award' => $awardScore,
                'total_before_bonus' => $totalScore,
            ];

            // Update or create rating result
            $ratingResult = RatingResult::updateOrCreate(
                [
                    'teacher_id' => $teacher->id,
                    'academic_year_id' => $academicYearId,
                ],
                [
                    'total_score' => $totalScore,
                    'breakdown' => $breakdown,
                    'calculated_at' => now(),
                ]
            );

            DB::commit();

            Log::info('TeacherRatingService - Rating calculated successfully', [
                'teacher_id' => $teacher->id,
                'total_score' => $totalScore,
            ]);

            return $ratingResult;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherRatingService - Error calculating rating', [
                'teacher_id' => $teacher->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Calculate rankings for all teachers in academic year
     *
     * @param int $academicYearId
     * @return void
     */
    public function calculateRankings(int $academicYearId): void
    {
        Log::info('TeacherRatingService - Calculating rankings', [
            'academic_year_id' => $academicYearId,
        ]);

        // Get all rating results for this year
        $results = RatingResult::where('academic_year_id', $academicYearId)
            ->with('teacher.school', 'teacher.primarySubject')
            ->orderBy('total_score', 'desc')
            ->get();

        // Calculate school rankings
        $this->calculateSchoolRankings($results);

        // Calculate district rankings (sector level)
        $this->calculateDistrictRankings($results);

        // Calculate region rankings
        $this->calculateRegionRankings($results);

        // Calculate subject rankings
        $this->calculateSubjectRankings($results);

        Log::info('TeacherRatingService - Rankings calculated successfully');
    }

    /**
     * Calculate school-level rankings
     */
    protected function calculateSchoolRankings($results): void
    {
        $bySchool = $results->groupBy(fn($r) => $r->teacher->school_id);

        foreach ($bySchool as $schoolId => $schoolResults) {
            $rank = 1;
            foreach ($schoolResults->sortByDesc('total_score') as $result) {
                $result->update(['rank_school' => $rank++]);
            }
        }
    }

    /**
     * Calculate district-level rankings (sector)
     */
    protected function calculateDistrictRankings($results): void
    {
        $byDistrict = $results->groupBy(function ($r) {
            return $r->teacher->school?->parent_id; // sector_id
        });

        foreach ($byDistrict as $districtId => $districtResults) {
            $rank = 1;
            foreach ($districtResults->sortByDesc('total_score') as $result) {
                $result->update(['rank_district' => $rank++]);
            }
        }
    }

    /**
     * Calculate region-level rankings
     */
    protected function calculateRegionRankings($results): void
    {
        // All teachers in same region for RegionAdmin view
        $rank = 1;
        foreach ($results->sortByDesc('total_score') as $result) {
            $result->update(['rank_region' => $rank++]);
        }
    }

    /**
     * Calculate subject-level rankings
     */
    protected function calculateSubjectRankings($results): void
    {
        $bySubject = $results->groupBy(fn($r) => $r->teacher->primary_subject_id);

        foreach ($bySubject as $subjectId => $subjectResults) {
            if (!$subjectId) continue;

            $rank = 1;
            foreach ($subjectResults->sortByDesc('total_score') as $result) {
                $result->update(['rank_subject' => $rank++]);
            }
        }
    }

    /**
     * Get top 20 teachers (leaderboard)
     *
     * @param int $academicYearId
     * @param string $scope (school|district|region|subject)
     * @param int|null $scopeId
     * @return \Illuminate\Support\Collection
     */
    public function getLeaderboard(int $academicYearId, string $scope = 'region', ?int $scopeId = null)
    {
        $query = RatingResult::where('academic_year_id', $academicYearId)
            ->with('teacher.user.profile', 'teacher.school', 'teacher.primarySubject')
            ->orderBy('total_score', 'desc');

        switch ($scope) {
            case 'school':
                $query->whereHas('teacher', fn($q) => $q->where('school_id', $scopeId));
                break;
            case 'district':
                $query->whereHas('teacher.school', fn($q) => $q->where('parent_id', $scopeId));
                break;
            case 'subject':
                $query->whereHas('teacher', fn($q) => $q->where('primary_subject_id', $scopeId));
                break;
            case 'region':
            default:
                // All teachers in region
                break;
        }

        return $query->limit(20)->get();
    }
}
