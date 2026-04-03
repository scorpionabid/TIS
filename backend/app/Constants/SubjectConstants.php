<?php

namespace App\Constants;

/**
 * System-reserved subject IDs that have special roles in curriculum calculation.
 *
 * These subjects are treated differently in CurriculumPlanService::recalculateGradeCurriculumHours()
 * and on the frontend: they are excluded from the "ümumi" teaching hours sum
 * and counted separately as extra/club hours.
 */
class SubjectConstants
{
    /** Dərsdənkənar məşğələ fənni — "extra_hours" sütununda ayrıca uçota alınır */
    public const EXTRACURRICULAR_SUBJECT_ID = 56;

    /** Dərnək fənni — "club_hours" sütununda ayrıca uçota alınır */
    public const CLUB_SUBJECT_ID = 57;
}
