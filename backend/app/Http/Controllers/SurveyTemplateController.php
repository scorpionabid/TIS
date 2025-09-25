<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SurveyTemplateController extends Controller
{
    /**
     * Display a listing of survey templates.
     */
    public function index(): JsonResponse
    {
        $templates = SurveyTemplate::latest()->get();

        // Transform templates to match frontend expectations
        $transformedTemplates = $templates->map(function ($template) {
            return [
                'id' => $template->id,
                'title' => $template->name,
                'description' => $template->description,
                'questions' => $template->questions,
                'category' => 'general', // Default category
                'is_featured' => false,
                'usage_count' => 0,
                'success_rate' => 85, // Default success rate
                'average_completion_time' => 5, // Default 5 minutes
                'template_tags' => [],
                'created_by_name' => 'System',
                'institution_name' => '',
                'created_at' => $template->created_at,
                'current_questions_count' => count($template->questions ?? []),
            ];
        });

        return response()->json([
            'templates' => $transformedTemplates,
            'total' => $templates->count(),
            'per_page' => 50,
            'current_page' => 1,
        ]);
    }

    /**
     * Store a newly created survey template.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'required|array',
            'settings' => 'nullable|array',
        ]);

        $template = SurveyTemplate::create($validated);

        return response()->json([
            'message' => 'Template yaradıldı',
            'template' => $template
        ], 201);
    }

    /**
     * Display the specified survey template.
     */
    public function show(SurveyTemplate $template): JsonResponse
    {
        return response()->json([
            'data' => $template
        ]);
    }

    /**
     * Update the specified survey template.
     */
    public function update(Request $request, SurveyTemplate $template): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'sometimes|required|array',
            'settings' => 'nullable|array',
        ]);

        $template->update($validated);

        return response()->json([
            'message' => 'Template yeniləndi',
            'template' => $template
        ]);
    }

    /**
     * Remove the specified survey template.
     */
    public function destroy(SurveyTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json([
            'message' => 'Template silindi'
        ]);
    }

    /**
     * Create a template from an existing survey.
     */
    public function createFromSurvey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_id' => 'required|exists:surveys,id',
            'name' => 'nullable|string|max:255',
        ]);

        $survey = Survey::with('questions')->findOrFail($validated['survey_id']);

        // Create template name
        $templateName = $validated['name'] ?? $survey->title . ' - Template';

        // Convert survey questions to template format
        $templateQuestions = $survey->questions->map(function ($question) {
            return [
                'title' => $question->question,
                'type' => $question->type,
                'required' => $question->required ?? false,
                'options' => $question->options ?? null,
            ];
        })->toArray();

        // Create the template
        $template = SurveyTemplate::create([
            'name' => $templateName,
            'description' => $survey->description,
            'questions' => $templateQuestions,
            'settings' => [
                'original_survey_id' => $survey->id,
                'created_from_survey' => true,
            ],
        ]);

        return response()->json([
            'message' => 'Template yaradıldı',
            'template' => $template
        ], 201);
    }

    /**
     * Get template statistics.
     */
    public function getStats(): JsonResponse
    {
        $totalTemplates = SurveyTemplate::count();

        return response()->json([
            'total_templates' => $totalTemplates,
            'featured_templates' => 0, // Default for now
            'my_templates' => $totalTemplates, // Default for now
            'categories' => [
                ['name' => 'general', 'count' => $totalTemplates]
            ],
            'most_popular' => [],
            'recent_templates' => SurveyTemplate::latest()->take(5)->get(),
        ]);
    }
}