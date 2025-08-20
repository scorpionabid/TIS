<?php

namespace App\Http\Controllers\Psychology;

use App\Http\Controllers\Controller;
use App\Models\PsychologySession;
use App\Models\PsychologyNote;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class PsychologyNotesController extends Controller
{
    /**
     * Store a new note for a psychology session.
     */
    public function store(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'note_type' => 'required|in:session_note,behavioral_observation,progress_note,intervention_note,parent_communication,follow_up_note',
            'content' => 'required|string|max:2000',
            'is_confidential' => 'boolean',
            'visibility' => 'required|in:psychologist_only,school_staff,parents_included',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
            'attachments' => 'sometimes|array',
            'attachments.*' => 'file|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canAddNote($user, $session)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to add notes to this session'
                ], 403);
            }

            DB::beginTransaction();

            // Process attachments if any
            $attachments = [];
            if ($request->hasFile('attachments')) {
                $attachments = $this->processAttachments($request->file('attachments'), $session);
            }

            // Create the note
            $note = PsychologyNote::create([
                'psychology_session_id' => $session->id,
                'author_id' => $user->id,
                'note_type' => $request->note_type,
                'content' => $request->content,
                'is_confidential' => $request->get('is_confidential', false),
                'visibility' => $request->visibility,
                'tags' => $request->tags ?? [],
                'attachments' => $attachments,
                'note_metadata' => [
                    'created_by' => $user->id,
                    'created_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            ]);

            // Log the activity
            activity()
                ->performedOn($note)
                ->causedBy($user)
                ->withProperties([
                    'session_id' => $session->id,
                    'note_type' => $request->note_type,
                    'student_name' => $session->student->name
                ])
                ->log('Psychology session note added');

            DB::commit();

            $note->load('author:id,name,email');

            return response()->json([
                'success' => true,
                'data' => $this->transformNote($note),
                'message' => 'Note added successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error adding note: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all notes for a psychology session.
     */
    public function index(Request $request, PsychologySession $session): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canViewNotes($user, $session)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to view notes for this session'
                ], 403);
            }

            $query = $session->notes()->with('author:id,name,email');

            // Apply visibility filters based on user role
            $this->applyVisibilityFilters($query, $user, $session);

            // Apply request filters
            if ($request->has('note_type')) {
                $query->where('note_type', $request->note_type);
            }

            if ($request->has('author_id')) {
                $query->where('author_id', $request->author_id);
            }

            if ($request->has('is_confidential')) {
                $query->where('is_confidential', $request->boolean('is_confidential'));
            }

            $notes = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $notes->map(function($note) {
                    return $this->transformNote($note);
                }),
                'total' => $notes->count(),
                'message' => 'Notes retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a specific note.
     */
    public function update(Request $request, PsychologyNote $note): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'content' => 'sometimes|required|string|max:2000',
            'is_confidential' => 'sometimes|boolean',
            'visibility' => 'sometimes|in:psychologist_only,school_staff,parents_included',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canEditNote($user, $note)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to edit this note'
                ], 403);
            }

            // Update the note
            $note->update([
                'content' => $request->get('content', $note->content),
                'is_confidential' => $request->get('is_confidential', $note->is_confidential),
                'visibility' => $request->get('visibility', $note->visibility),
                'tags' => $request->get('tags', $note->tags),
                'note_metadata' => array_merge($note->note_metadata ?? [], [
                    'last_edited_by' => $user->id,
                    'last_edited_at' => now(),
                    'edit_history' => array_merge($note->note_metadata['edit_history'] ?? [], [[
                        'edited_by' => $user->id,
                        'edited_at' => now(),
                        'changes' => $request->only(['content', 'is_confidential', 'visibility', 'tags'])
                    ]])
                ])
            ]);

            // Log the activity
            activity()
                ->performedOn($note)
                ->causedBy($user)
                ->withProperties([
                    'session_id' => $note->psychology_session_id,
                    'changes' => $request->only(['content', 'is_confidential', 'visibility', 'tags'])
                ])
                ->log('Psychology session note updated');

            return response()->json([
                'success' => true,
                'data' => $this->transformNote($note->fresh('author')),
                'message' => 'Note updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating note: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a specific note.
     */
    public function destroy(PsychologyNote $note): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canDeleteNote($user, $note)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to delete this note'
                ], 403);
            }

            // Soft delete the note
            $note->delete();

            // Log the activity
            activity()
                ->performedOn($note)
                ->causedBy($user)
                ->withProperties([
                    'session_id' => $note->psychology_session_id,
                    'note_type' => $note->note_type
                ])
                ->log('Psychology session note deleted');

            return response()->json([
                'success' => true,
                'message' => 'Note deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting note: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get note statistics for a session or institution.
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $validator = Validator::make($request->all(), [
                'session_id' => 'sometimes|exists:psychology_sessions,id',
                'institution_id' => 'sometimes|exists:institutions,id',
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date|after_or_equal:start_date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = PsychologyNote::query();

            // Apply user-based filtering
            $this->applyUserFiltering($query, $user);

            // Apply request filters
            if ($request->has('session_id')) {
                $query->where('psychology_session_id', $request->session_id);
            }

            if ($request->has('institution_id')) {
                $query->whereHas('session', function($q) use ($request) {
                    $q->where('institution_id', $request->institution_id);
                });
            }

            if ($request->has('start_date')) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }

            if ($request->has('end_date')) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            // Calculate statistics
            $stats = [
                'total_notes' => $query->count(),
                'by_type' => $query->groupBy('note_type')->pluck(DB::raw('count(*) as count'), 'note_type'),
                'by_visibility' => $query->groupBy('visibility')->pluck(DB::raw('count(*) as count'), 'visibility'),
                'confidential_notes' => $query->where('is_confidential', true)->count(),
                'notes_with_attachments' => $query->whereJsonLength('attachments', '>', 0)->count(),
                'recent_notes' => $query->where('created_at', '>=', now()->subDays(7))->count(),
                'avg_notes_per_session' => $this->getAverageNotesPerSession($query),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'filters' => $request->only(['session_id', 'institution_id', 'start_date', 'end_date']),
                'message' => 'Note statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving note statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper methods
    private function processAttachments($files, $session): array
    {
        $attachments = [];
        
        foreach ($files as $file) {
            if ($file->isValid()) {
                $path = $file->store('psychology/attachments/' . $session->id, 'local');
                $attachments[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'stored_name' => basename($path),
                    'path' => $path,
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'uploaded_at' => now(),
                ];
            }
        }

        return $attachments;
    }

    private function transformNote($note): array
    {
        return [
            'id' => $note->id,
            'psychology_session_id' => $note->psychology_session_id,
            'author' => $note->author ? [
                'id' => $note->author->id,
                'name' => $note->author->name,
                'email' => $note->author->email,
            ] : null,
            'note_type' => $note->note_type,
            'content' => $note->content,
            'is_confidential' => $note->is_confidential,
            'visibility' => $note->visibility,
            'tags' => $note->tags ?? [],
            'attachments' => $note->attachments ?? [],
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
            'can_edit' => $this->canEditNote(Auth::user(), $note),
            'can_delete' => $this->canDeleteNote(Auth::user(), $note),
        ];
    }

    // Permission methods
    private function canAddNote($user, $session): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        if ($user->id === $session->psychologist_id) return true;
        return false;
    }

    private function canViewNotes($user, $session): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        if ($user->id === $session->psychologist_id) return true;
        if ($user->hasRole('SchoolAdmin') && $user->institution_id === $session->institution_id) return true;
        return false;
    }

    private function canEditNote($user, $note): bool
    {
        return $user->id === $note->author_id;
    }

    private function canDeleteNote($user, $note): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        return $user->id === $note->author_id;
    }

    private function applyVisibilityFilters($query, $user, $session)
    {
        if ($user->hasRole('SuperAdmin') || $user->id === $session->psychologist_id) {
            return; // Can see all notes
        }

        if ($user->hasRole('SchoolAdmin')) {
            $query->whereIn('visibility', ['school_staff', 'parents_included']);
        }
    }

    private function applyUserFiltering($query, $user)
    {
        if ($user->hasRole('SuperAdmin')) {
            return;
        }

        if ($user->hasRole('psixoloq')) {
            $query->where('author_id', $user->id);
        } elseif ($user->hasRole('SchoolAdmin')) {
            $query->whereHas('session', function($q) use ($user) {
                $q->where('institution_id', $user->institution_id);
            });
        }
    }

    private function getAverageNotesPerSession($baseQuery): float
    {
        $totalSessions = PsychologySession::whereIn('id', 
            $baseQuery->pluck('psychology_session_id')->unique()
        )->count();

        if ($totalSessions == 0) return 0;

        return round($baseQuery->count() / $totalSessions, 2);
    }
}