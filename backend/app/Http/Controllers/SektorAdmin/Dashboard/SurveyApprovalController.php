<?php

namespace App\Http\Controllers\SektorAdmin\Dashboard;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SurveyApprovalController extends BaseController
{
    /**
     * Get pending survey responses for approval
     */
    public function getPendingSurveyResponses(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get pending survey responses from schools in this sector
        $pendingResponses = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->with([
                'survey:id,title,description,category',
                'institution:id,name',
                'respondent:id,name,email',
            ])
            ->orderBy('submitted_at', 'desc')
            ->get()
            ->map(function ($response) {
                return [
                    'id' => $response->id,
                    'survey_title' => $response->survey->title,
                    'survey_description' => $response->survey->description,
                    'survey_category' => $response->survey->category,
                    'school_name' => $response->institution->name,
                    'school_id' => $response->institution->id,
                    'respondent_name' => $response->respondent->name,
                    'respondent_email' => $response->respondent->email,
                    'submitted_at' => $response->submitted_at,
                    'progress_percentage' => $response->progress_percentage,
                    'status' => $response->status,
                    'responses_count' => count($response->responses ?? []),
                ];
            });

        return response()->json([
            'pending_responses' => $pendingResponses,
            'total_count' => $pendingResponses->count(),
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
            ],
        ]);
    }

    /**
     * Get survey response details for review
     */
    public function getSurveyResponseDetails(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->with([
                'survey.questions' => function ($query) {
                    $query->active()->ordered();
                },
                'institution:id,name',
                'respondent:id,name,email',
            ])
            ->find($responseId);

        if (! $response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Format response data with questions
        $questionsWithAnswers = $response->survey->questions->map(function ($question) use ($response) {
            $answer = $response->responses[$question->id] ?? null;

            return [
                'id' => $question->id,
                'title' => $question->title,
                'description' => $question->description,
                'type' => $question->type,
                'is_required' => $question->is_required,
                'options' => $question->options,
                'answer' => $answer,
                'formatted_answer' => $this->formatAnswer($question, $answer),
            ];
        });

        return response()->json([
            'response' => [
                'id' => $response->id,
                'status' => $response->status,
                'progress_percentage' => $response->progress_percentage,
                'submitted_at' => $response->submitted_at,
                'started_at' => $response->started_at,
            ],
            'survey' => [
                'id' => $response->survey->id,
                'title' => $response->survey->title,
                'description' => $response->survey->description,
                'category' => $response->survey->category,
            ],
            'school' => [
                'id' => $response->institution->id,
                'name' => $response->institution->name,
            ],
            'respondent' => [
                'id' => $response->respondent->id,
                'name' => $response->respondent->name,
                'email' => $response->respondent->email,
            ],
            'questions_with_answers' => $questionsWithAnswers,
        ]);
    }

    /**
     * Approve survey response
     */
    public function approveSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->find($responseId);

        if (! $response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Approve the response
        $response->approve($user);

        return response()->json([
            'message' => 'Survey response approved successfully',
            'response_id' => $response->id,
            'status' => $response->status,
            'approved_at' => $response->approved_at,
            'approved_by' => $user->name,
        ]);
    }

    /**
     * Reject survey response
     */
    public function rejectSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        $request->validate([
            'reason' => 'required|string|min:10|max:500',
        ]);

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $response = SurveyResponse::whereIn('institution_id', $schoolIds)
            ->where('status', 'submitted')
            ->find($responseId);

        if (! $response) {
            return response()->json(['error' => 'Survey response not found or not accessible'], 404);
        }

        // Reject the response
        $response->reject($request->reason);

        return response()->json([
            'message' => 'Survey response rejected',
            'response_id' => $response->id,
            'status' => $response->status,
            'rejection_reason' => $response->rejection_reason,
        ]);
    }

    /**
     * Format answer based on question type
     */
    private function formatAnswer($question, $answer): string
    {
        if ($answer === null) {
            return 'Cavablanmayıb';
        }

        switch ($question->type) {
            case 'rating':
                $min = $question->rating_min ?? 1;
                $max = $question->rating_max ?? 5;

                return "{$answer} / {$max}";

            case 'single_choice':
                if (is_array($question->options)) {
                    foreach ($question->options as $option) {
                        if (isset($option['id']) && $option['id'] === $answer) {
                            return $option['label'];
                        }
                    }
                }

                return $answer;

            case 'multiple_choice':
                if (is_array($answer) && is_array($question->options)) {
                    if (isset($question->options[0]) && is_string($question->options[0])) {
                        // Simple array format
                        return implode(', ', $answer);
                    }
                    // Object format with id/label
                    $labels = [];
                    foreach ($answer as $selectedId) {
                        foreach ($question->options as $option) {
                            if (isset($option['id']) && $option['id'] === $selectedId) {
                                $labels[] = $option['label'];
                                break;
                            }
                        }
                    }

                    return implode(', ', $labels);
                }

                return is_array($answer) ? implode(', ', $answer) : $answer;

            case 'number':
                return (string) $answer;

            case 'text':
                return $answer;

            default:
                return is_array($answer) ? implode(', ', $answer) : (string) $answer;
        }
    }
}
