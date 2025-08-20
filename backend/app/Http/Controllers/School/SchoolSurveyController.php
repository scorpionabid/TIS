<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class SchoolSurveyController extends Controller
{
    /**
     * Get surveys assigned to this school
     */
    public function getAssignedSurveys(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get surveys where this institution is in target_institutions
        $surveys = Survey::forInstitution($school->id)
            ->active()
            ->with(['creator:id,name,email', 'responses' => function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($survey) use ($school) {
                // Check if this school has already responded
                $existingResponse = $survey->responses->first();
                
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'category' => $survey->category,
                    'frequency' => $survey->frequency,
                    'start_date' => $survey->start_date,
                    'end_date' => $survey->end_date,
                    'created_by' => $survey->creator->name ?? 'Sistem',
                    'created_at' => $survey->created_at,
                    'status' => $existingResponse ? 'completed' : 'pending',
                    'response_id' => $existingResponse?->id,
                    'response_status' => $existingResponse?->status,
                    'submitted_at' => $existingResponse?->submitted_at,
                    'can_edit' => $existingResponse && $existingResponse->status === 'draft',
                    'questions_count' => count($survey->questions ?? []),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $surveys,
            'message' => count($surveys) . ' sorğu tapıldı'
        ]);
    }

    /**
     * Get survey details for response
     */
    public function getSurveyForResponse(Request $request, int $surveyId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            // Get the survey and check if the school is authorized
            $survey = Survey::with('creator:id,name,email')
                ->findOrFail($surveyId);

            // Check if this school is in the target institutions
            if (!$survey->isTargetedTo($school->id)) {
                return response()->json(['error' => 'Bu sorğu sizin məktəb üçün nəzərdə tutulmayıb'], 403);
            }

            // Check if survey is still active
            if ($survey->status !== 'active') {
                return response()->json(['error' => 'Bu sorğu artıq aktiv deyil'], 400);
            }

            // Check existing response
            $existingResponse = SurveyResponse::where('survey_id', $surveyId)
                ->where('institution_id', $school->id)
                ->first();

            return response()->json([
                'success' => true,
                'survey' => [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'questions' => $survey->questions,
                    'category' => $survey->category,
                    'start_date' => $survey->start_date,
                    'end_date' => $survey->end_date,
                    'created_by' => $survey->creator->name ?? 'Sistem',
                ],
                'existing_response' => $existingResponse ? [
                    'id' => $existingResponse->id,
                    'status' => $existingResponse->status,
                    'answers' => $existingResponse->answers,
                    'progress_percentage' => $existingResponse->progress_percentage,
                    'last_updated' => $existingResponse->updated_at,
                ] : null,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sorğu məlumatları əldə edilərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start a new survey response
     */
    public function startSurveyResponse(Request $request, int $surveyId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            // Get the survey and validate access
            $survey = Survey::findOrFail($surveyId);

            if (!$survey->isTargetedTo($school->id)) {
                return response()->json(['error' => 'Bu sorğu sizin məktəb üçün nəzərdə tutulmayıb'], 403);
            }

            if ($survey->status !== 'active') {
                return response()->json(['error' => 'Bu sorğu artıq aktiv deyil'], 400);
            }

            // Check if response already exists
            $existingResponse = SurveyResponse::where('survey_id', $surveyId)
                ->where('institution_id', $school->id)
                ->first();

            if ($existingResponse) {
                return response()->json(['error' => 'Bu sorğu üçün artıq cavab mövcuddur'], 400);
            }

            // Create new response
            $response = SurveyResponse::create([
                'survey_id' => $surveyId,
                'institution_id' => $school->id,
                'respondent_id' => $user->id,
                'status' => 'draft',
                'answers' => [],
                'progress_percentage' => 0,
                'started_at' => Carbon::now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sorğu cavablama prosesi başladıldı',
                'response' => [
                    'id' => $response->id,
                    'status' => $response->status,
                    'started_at' => $response->started_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sorğu başladılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save survey progress (draft)
     */
    public function saveSurveyProgress(Request $request, int $responseId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $response = SurveyResponse::where('id', $responseId)
                ->where('institution_id', $school->id)
                ->firstOrFail();

            if ($response->status === 'submitted') {
                return response()->json(['error' => 'Təqdim edilmiş sorğu dəyişdirilə bilməz'], 400);
            }

            $request->validate([
                'answers' => 'required|array',
                'progress_percentage' => 'numeric|min:0|max:100',
            ]);

            $response->update([
                'answers' => $request->answers,
                'progress_percentage' => $request->progress_percentage ?? 0,
                'last_saved_at' => Carbon::now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sorğu cavabları yadda saxlanıldı',
                'progress_percentage' => $response->progress_percentage,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sorğu yadda saxlanılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit survey response
     */
    public function submitSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $response = SurveyResponse::where('id', $responseId)
                ->where('institution_id', $school->id)
                ->with('survey')
                ->firstOrFail();

            if ($response->status === 'submitted') {
                return response()->json(['error' => 'Bu sorğu artıq təqdim edilib'], 400);
            }

            $request->validate([
                'answers' => 'required|array',
            ]);

            // Validate that all required questions are answered
            $survey = $response->survey;
            $questions = $survey->questions ?? [];
            $answers = $request->answers;

            foreach ($questions as $question) {
                if (($question['required'] ?? false) && !isset($answers[$question['id']])) {
                    return response()->json([
                        'error' => 'Mütləq cavablandırılmalı suallar mövcuddur: ' . ($question['text'] ?? 'Sual ' . $question['id'])
                    ], 400);
                }
            }

            $response->update([
                'answers' => $answers,
                'status' => 'submitted',
                'progress_percentage' => 100,
                'submitted_at' => Carbon::now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sorğu uğurla təqdim edildi',
                'submitted_at' => $response->submitted_at,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sorğu təqdim edilərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }
}