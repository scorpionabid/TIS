<?php

namespace App\Services;

use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\SurveyResponseDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class SurveyAttachmentService extends BaseService
{
    public function __construct(private readonly DocumentService $documentService)
    {
    }

    /**
     * Upload or replace an attachment for a survey question response.
     */
    public function uploadAttachment(
        SurveyResponse $response,
        SurveyQuestion $question,
        UploadedFile $file,
        User $user
    ): SurveyResponseDocument {
        $this->assertCanModifyResponse($response, $user);

        if ($question->survey_id !== $response->survey_id || $question->type !== 'file_upload') {
            throw new \InvalidArgumentException('Bu sual fayl yükləmə üçün nəzərdə tutulmayıb.');
        }

        $response->loadMissing('survey.creator');

        // Remove previous attachment if exists
        $existing = $response->attachments()
            ->where('survey_question_id', $question->id)
            ->first();

        if ($existing) {
            $this->deleteAttachment($existing);
        }

        $documentData = $this->buildDocumentPayload($response, $question);
        $document = $this->documentService->createDocument($documentData, $file);

        return SurveyResponseDocument::create([
            'survey_response_id' => $response->id,
            'survey_question_id' => $question->id,
            'document_id' => $document->id,
            'uploaded_by' => $user->id,
        ]);
    }

    /**
     * Delete the attachment and underlying document file.
     */
    public function deleteAttachment(SurveyResponseDocument $attachment): void
    {
        $document = $attachment->document;
        if ($document && $document->file_path) {
            if (Storage::disk('local')->exists($document->file_path)) {
                Storage::disk('local')->delete($document->file_path);
            }
            $document->delete();
        }

        $attachment->delete();
    }

    public function assertCanModifyResponse(SurveyResponse $response, User $user): void
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz sorğu cavablarınıza fayl yükləyə bilərsiniz.');
        }

        if ($response->status !== 'draft') {
            throw new \InvalidArgumentException('Yalnız qaralama statusundakı cavablara fayl əlavə etmək olar.');
        }
    }

    private function buildDocumentPayload(SurveyResponse $response, SurveyQuestion $question): array
    {
        $surveyTitle = $response->survey?->title;
        $questionTitle = $question->question;

        $allowedUsers = array_values(array_filter([
            $response->respondent_id,
            $response->survey?->creator?->id,
        ]));

        return [
            'title' => trim(($surveyTitle ? $surveyTitle . ' - ' : '') . ($questionTitle ?: 'Fayl')), 
            'description' => 'Sorğu fayl yükləməsi',
            'category' => 'forms',
            'access_level' => 'institution',
            'allowed_users' => $allowedUsers,
            'accessible_institutions' => [$response->institution_id],
            'cascade_deletable' => true,
            'is_downloadable' => true,
            'is_viewable_online' => false,
        ];
    }
}
