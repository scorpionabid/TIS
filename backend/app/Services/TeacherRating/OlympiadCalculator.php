<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * OlympiadCalculator - Component 3 (15% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Şagird olimpiada nəticələri
 * - Səviyyələr: məktəb, rayon, respublika, beynəlxalq
 * - Yerləşmə: 1-ci yer (10 bal), 2-ci yer (7 bal), 3-cü yer (5 bal)
 * - Fənn olimpiadaları və digər müsabiqələr
 */
class OlympiadCalculator
{
    // Point system based on placement and level
    protected array $pointMatrix = [
        'school' => [
            1 => 2,  // 1st place at school level
            2 => 1,
            3 => 0.5,
        ],
        'district' => [
            1 => 5,
            2 => 3,
            3 => 2,
        ],
        'national' => [
            1 => 10,
            2 => 7,
            3 => 5,
        ],
        'international' => [
            1 => 15,
            2 => 12,
            3 => 10,
        ],
    ];

    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all olympiad achievements for this teacher's students
        $achievements = $teacher->olympiadAchievements()
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($achievements->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No olympiad achievements found',
            ];
        }

        // Calculate total points based on level and placement
        $totalPoints = 0;
        $breakdown = [
            'school' => 0,
            'district' => 0,
            'national' => 0,
            'international' => 0,
        ];

        foreach ($achievements as $achievement) {
            $level = $achievement->level; // 'school', 'district', 'national', 'international'
            $placement = $achievement->placement; // 1, 2, 3

            if (isset($this->pointMatrix[$level][$placement])) {
                $points = $this->pointMatrix[$level][$placement];
                $totalPoints += $points;
                $breakdown[$level] += $points;
            }
        }

        // Normalize to 0-100 scale
        // Maximum realistic score: 3 international 1st places = 45 points
        // We'll use 50 as max for normalization
        $maxPoints = 50;
        $rawScore = min(($totalPoints / $maxPoints) * 100, 100);

        // Apply component weight
        $weightedScore = $rawScore * $config->weight;

        return [
            'raw_score' => round($rawScore, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'total_achievements' => $achievements->count(),
                'total_points' => $totalPoints,
                'level_breakdown' => [
                    'school' => round($breakdown['school'], 2),
                    'district' => round($breakdown['district'], 2),
                    'national' => round($breakdown['national'], 2),
                    'international' => round($breakdown['international'], 2),
                ],
                'students_count' => $achievements->pluck('student_name')->unique()->count(),
            ],
        ];
    }
}
