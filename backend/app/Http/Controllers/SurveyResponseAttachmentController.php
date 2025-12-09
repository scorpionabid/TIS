<?php

namespace App\Http\Controllers;

use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\SurveyResponseDocument;
use App\Services\SurveyAttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SurveyResponseAttachmentController extends BaseController
{
    public function __construct(private readonly SurveyAttachmentService $attachmentService) {}

    public function store(Request $request, SurveyResponse $response, SurveyQuestion $question): JsonResponse
    {
        $this->ensureQuestionMatchesResponse($response, $question);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:51200', // safety max 50MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl yüklənə bilmədi',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $this->guardQuestionConstraints($question, $file->getClientOriginalExtension(), $file->getSize());

        try {
            $attachment = $this->attachmentService->uploadAttachment($response, $question, $file, $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Fayl uğurla yükləndi',
                'data' => [
                    'attachment' => $this->transformAttachment($attachment),
                ],
            ], 201);
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    public function destroy(Request $request, SurveyResponse $response, SurveyQuestion $question): JsonResponse
    {
        $this->ensureQuestionMatchesResponse($response, $question);
        $this->attachmentService->assertCanModifyResponse($response, $request->user());

        $attachment = $this->findAttachment($response, $question);
        if (! $attachment) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sual üçün fayl tapılmadı',
            ], 404);
        }

        $this->attachmentService->deleteAttachment($attachment);

        return response()->json([
            'success' => true,
            'message' => 'Fayl silindi',
        ]);
    }

    public function download(Request $request, SurveyResponse $response, SurveyQuestion $question): StreamedResponse|JsonResponse
    {
        $this->ensureQuestionMatchesResponse($response, $question);
        if (! $this->canViewResponse($response, $request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fayla baxmaq icazəniz yoxdur',
            ], 403);
        }

        $attachment = $this->findAttachment($response, $question);
        if (! $attachment || ! $attachment->document) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl tapılmadı',
            ], 404);
        }

        $document = $attachment->document;
        if (! Storage::disk('local')->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl mövcud deyil',
            ], 404);
        }

        return Storage::disk('local')->download($document->file_path, $document->original_filename);
    }

    private function ensureQuestionMatchesResponse(SurveyResponse $response, SurveyQuestion $question): void
    {
        if ($question->survey_id !== $response->survey_id) {
            abort(404, 'Bu sorğuya aid sual tapılmadı');
        }
    }

    private function transformAttachment(SurveyResponseDocument $attachment): array
    {
        $attachment->loadMissing('document');
        $document = $attachment->document;

        return [
            'id' => $attachment->id,
            'survey_question_id' => $attachment->survey_question_id,
            'document' => $document ? [
                'id' => $document->id,
                'original_filename' => $document->original_filename,
                'file_size' => $document->file_size,
                'mime_type' => $document->mime_type,
                'created_at' => $document->created_at,
            ] : null,
            'uploaded_by' => $attachment->uploaded_by,
            'created_at' => $attachment->created_at,
        ];
    }

    private function findAttachment(SurveyResponse $response, SurveyQuestion $question): ?SurveyResponseDocument
    {
        return $response->attachments()
            ->where('survey_question_id', $question->id)
            ->first();
    }

    private function guardQuestionConstraints(SurveyQuestion $question, string $extension, int $sizeBytes): void
    {
        $allowedTypes = $question->allowed_file_types ?? [];
        if (! empty($allowedTypes) && ! in_array(strtolower($extension), $allowedTypes, true)) {
            throw new \InvalidArgumentException('Bu fayl növünə icazə verilmir.');
        }

        $maxSize = $question->max_file_size ?? null;
        if ($maxSize && $sizeBytes > $maxSize) {
            $maxMb = round($maxSize / (1024 * 1024), 2);
            throw new \InvalidArgumentException("Fayl ölçüsü {$maxMb}MB-dan çox ola bilməz.");
        }
    }

    private function canViewResponse(SurveyResponse $response, $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($response->respondent_id === $user->id) {
            return true;
        }

        if ($response->survey?->creator_id === $user->id) {
            return true;
        }

        if ($user->can('surveys.write')) {
            return true;
        }

        return $response->institution_id === $user->institution_id;
    }
}
