<?php

namespace App\Http\Controllers;

use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *     title="Grade Book API",
 *     version="1.0.0",
 *     description="API documentation for Grade Book (Sinif Jurnalı) system"
 * )
 * 
 * @OA\Server(
 *     url="/api",
 *     description="API Server"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT"
 * )
 */
class GradeBookApiDocumentation
{
    /**
     * @OA\Get(
     *     path="/grade-books",
     *     summary="List all grade books",
     *     tags={"Grade Books"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="institution_id",
     *         in="query",
     *         description="Filter by institution ID",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="academic_year_id",
     *         in="query",
     *         description="Filter by academic year ID",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="grade_id",
     *         in="query",
     *         description="Filter by grade ID",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="subject_id",
     *         in="query",
     *         description="Filter by subject ID",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="status",
     *         in="query",
     *         description="Filter by status (active, archived, closed)",
     *         required=false,
     *         @OA\Schema(type="string", enum={"active", "archived", "closed"})
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="current_page", type="integer"),
     *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/GradeBookSession")),
     *                 @OA\Property(property="total", type="integer")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - insufficient permissions"
     *     )
     * )
     */
    public function indexDocs() {}

    /**
     * @OA\Post(
     *     path="/grade-books",
     *     summary="Create a new grade book",
     *     tags={"Grade Books"},
     *     security={{"bearerAuth": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"institution_id", "grade_id", "subject_id", "academic_year_id"},
     *             @OA\Property(property="institution_id", type="integer", description="Institution ID"),
     *             @OA\Property(property="grade_id", type="integer", description="Grade ID"),
     *             @OA\Property(property="subject_id", type="integer", description="Subject ID"),
     *             @OA\Property(property="academic_year_id", type="integer", description="Academic Year ID"),
     *             @OA\Property(property="title", type="string", description="Optional custom title")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Grade book created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/GradeBookSession"),
     *             @OA\Property(property="message", type="string", example="Grade book created successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error - grade book already exists"
     *     )
     * )
     */
    public function storeDocs() {}

    /**
     * @OA\Get(
     *     path="/grade-books/{id}",
     *     summary="Get grade book details",
     *     tags={"Grade Books"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="grade_book", ref="#/components/schemas/GradeBookSession"),
     *                 @OA\Property(property="students", type="array", @OA\Items(ref="#/components/schemas/StudentWithScores")),
     *                 @OA\Property(property="columns_by_semester", type="object"),
     *                 @OA\Property(property="input_columns", type="array", @OA\Items(ref="#/components/schemas/GradeBookColumn")),
     *                 @OA\Property(property="calculated_columns", type="array", @OA\Items(ref="#/components/schemas/GradeBookColumn"))
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Grade book not found"
     *     )
     * )
     */
    public function showDocs() {}

    /**
     * @OA\Patch(
     *     path="/grade-books/cells/{cell}",
     *     summary="Update cell score",
     *     tags={"Grade Book Cells"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="cell",
     *         in="path",
     *         required=true,
     *         description="Cell ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="score", type="number", format="float", nullable=true, description="Score value (0-100)"),
     *             @OA\Property(property="is_present", type="boolean", description="Whether student was present"),
     *             @OA\Property(property="notes", type="string", maxLength=500, description="Optional notes")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Score updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/GradeBookCell"),
     *             @OA\Property(property="message", type="string", example="Score updated successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - user cannot modify this grade book"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error - score out of range"
     *     )
     * )
     */
    public function updateCellDocs() {}

    /**
     * @OA\Post(
     *     path="/grade-books/{id}/cells/bulk-update",
     *     summary="Bulk update cells",
     *     tags={"Grade Book Cells"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"cells"},
     *             @OA\Property(
     *                 property="cells",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     required={"cell_id"},
     *                     @OA\Property(property="cell_id", type="integer"),
     *                     @OA\Property(property="score", type="number", nullable=true),
     *                     @OA\Property(property="is_present", type="boolean")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Cells updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="updated_count", type="integer")
     *         )
     *     )
     * )
     */
    public function bulkUpdateCellsDocs() {}

    /**
     * @OA\Get(
     *     path="/grade-books/{id}/export-template",
     *     summary="Export Excel template for data entry",
     *     tags={"Grade Book Export/Import"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Excel file downloaded",
     *         @OA\MediaType(
     *             mediaType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
     *         )
     *     )
     * )
     */
    public function exportTemplateDocs() {}

    /**
     * @OA\Post(
     *     path="/grade-books/{id}/import",
     *     summary="Import scores from Excel file",
     *     tags={"Grade Book Export/Import"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 @OA\Property(
     *                     property="file",
     *                     type="string",
     *                     format="binary",
     *                     description="Excel file (.xlsx)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Import successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="imported", type="integer"),
     *                 @OA\Property(property="updated", type="integer"),
     *                 @OA\Property(property="errors", type="array", @OA\Items(type="string"))
     *             )
     *         )
     *     )
     * )
     */
    public function importScoresDocs() {}

    /**
     * @OA\Get(
     *     path="/grade-books/{id}/audit-logs",
     *     summary="Get audit logs for a grade book",
     *     tags={"Grade Book Audit"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="student_id",
     *         in="query",
     *         description="Filter by student ID",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="action_type",
     *         in="query",
     *         description="Filter by action type",
     *         required=false,
     *         @OA\Schema(type="string", enum={"create", "update", "delete", "bulk_update"})
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Filter from date (Y-m-d)",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Filter to date (Y-m-d)",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/GradeBookAuditLog"))
     *         )
     *     )
     * )
     */
    public function auditLogsDocs() {}

    /**
     * @OA\Get(
     *     path="/grade-books/{id}/audit-logs/suspicious-activity",
     *     summary="Detect suspicious activity in grade book",
     *     tags={"Grade Book Audit"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Grade Book Session ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Suspicious activity detection results",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="has_suspicious_activity", type="boolean"),
     *                 @OA\Property(property="bulk_updates", type="array", @OA\Items(type="object")),
     *                 @OA\Property(property="large_changes", type="array", @OA\Items(type="object")),
     *                 @OA\Property(property="conflicts", type="array", @OA\Items(type="object"))
     *             )
     *         )
     *     )
     * )
     */
    public function suspiciousActivityDocs() {}
}

/**
 * @OA\Schema(
 *     schema="GradeBookSession",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="institution_id", type="integer"),
 *     @OA\Property(property="grade_id", type="integer"),
 *     @OA\Property(property="subject_id", type="integer"),
 *     @OA\Property(property="academic_year_id", type="integer"),
 *     @OA\Property(property="title", type="string", nullable=true),
 *     @OA\Property(property="status", type="string", enum={"active", "archived", "closed"}),
 *     @OA\Property(property="created_by", type="integer"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */

/**
 * @OA\Schema(
 *     schema="GradeBookColumn",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="grade_book_session_id", type="integer"),
 *     @OA\Property(property="column_label", type="string"),
 *     @OA\Property(property="column_type", type="string", enum={"input", "calculated"}),
 *     @OA\Property(property="semester", type="string", enum={"I", "II"}),
 *     @OA\Property(property="max_score", type="number", format="float"),
 *     @OA\Property(property="display_order", type="integer"),
 *     @OA\Property(property="archived_at", type="string", format="date-time", nullable=true)
 * )
 */

/**
 * @OA\Schema(
 *     schema="GradeBookCell",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="grade_book_column_id", type="integer"),
 *     @OA\Property(property="student_id", type="integer"),
 *     @OA\Property(property="score", type="number", format="float", nullable=true),
 *     @OA\Property(property="percentage", type="number", format="float", nullable=true),
 *     @OA\Property(property="grade_mark", type="integer", nullable=true),
 *     @OA\Property(property="is_present", type="boolean"),
 *     @OA\Property(property="notes", type="string", nullable=true),
 *     @OA\Property(property="recorded_by", type="integer", nullable=true),
 *     @OA\Property(property="recorded_at", type="string", format="date-time", nullable=true)
 * )
 */

/**
 * @OA\Schema(
 *     schema="StudentWithScores",
 *     type="object",
 *     @OA\Property(property="student_id", type="integer"),
 *     @OA\Property(property="first_name", type="string"),
 *     @OA\Property(property="last_name", type="string"),
 *     @OA\Property(property="father_name", type="string", nullable=true),
 *     @OA\Property(property="student_number", type="string"),
 *     @OA\Property(property="scores", type="object"),
 *     @OA\Property(property="i_semester_average", type="number", format="float"),
 *     @OA\Property(property="i_semester_grade", type="integer"),
 *     @OA\Property(property="ii_semester_average", type="number", format="float"),
 *     @OA\Property(property="ii_semester_grade", type="integer"),
 *     @OA\Property(property="annual_average", type="number", format="float"),
 *     @OA\Property(property="annual_grade", type="integer")
 * )
 */

/**
 * @OA\Schema(
 *     schema="GradeBookAuditLog",
 *     type="object",
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="grade_book_session_id", type="integer"),
 *     @OA\Property(property="student_id", type="integer"),
 *     @OA\Property(property="grade_book_column_id", type="integer"),
 *     @OA\Property(property="user_id", type="integer"),
 *     @OA\Property(property="action_type", type="string"),
 *     @OA\Property(property="old_score", type="number", format="float", nullable=true),
 *     @OA\Property(property="new_score", type="number", format="float", nullable=true),
 *     @OA\Property(property="old_is_present", type="boolean", nullable=true),
 *     @OA\Property(property="new_is_present", type="boolean", nullable=true),
 *     @OA\Property(property="ip_address", type="string"),
 *     @OA\Property(property="user_agent", type="string"),
 *     @OA\Property(property="notes", type="string", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="student", type="object"),
 *     @OA\Property(property="column", type="object"),
 *     @OA\Property(property="user", type="object")
 * )
 */
