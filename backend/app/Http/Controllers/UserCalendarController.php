<?php

namespace App\Http\Controllers;

use App\Models\UserCalendarEvent;
use App\Models\UserNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserCalendarController extends Controller
{
    // ─── Events ──────────────────────────────────────────────────────────────

    public function indexEvents(Request $request): JsonResponse
    {
        $events = UserCalendarEvent::where('user_id', $request->user()->id)
            ->orderBy('date')
            ->orderBy('time')
            ->get();

        return response()->json(['data' => $events]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type'  => 'required|string|in:event,meeting,visit,task',
            'date'  => 'required|date',
            'time'  => 'nullable|string|max:10',
            'link'  => 'nullable|url|max:500',
        ]);

        $event = UserCalendarEvent::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $event], 201);
    }

    public function updateEvent(Request $request, UserCalendarEvent $event): JsonResponse
    {
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'İcazə yoxdur'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'type'  => 'sometimes|string|in:event,meeting,visit,task',
            'date'  => 'sometimes|date',
            'time'  => 'nullable|string|max:10',
            'link'  => 'nullable|url|max:500',
        ]);

        $event->update($validated);

        return response()->json(['data' => $event]);
    }

    public function destroyEvent(Request $request, UserCalendarEvent $event): JsonResponse
    {
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'İcazə yoxdur'], 403);
        }

        $event->delete();

        return response()->json(['message' => 'Silindi']);
    }

    // ─── Notes ───────────────────────────────────────────────────────────────

    public function indexNotes(Request $request): JsonResponse
    {
        $notes = UserNote::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['data' => $notes]);
    }

    public function storeNote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => 'required|string|max:2000',
        ]);

        $note = UserNote::create([
            'text'    => $validated['text'],
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $note], 201);
    }

    public function updateNote(Request $request, UserNote $note): JsonResponse
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'İcazə yoxdur'], 403);
        }

        $validated = $request->validate([
            'text' => 'required|string|max:2000',
        ]);

        $note->update($validated);

        return response()->json(['data' => $note]);
    }

    public function destroyNote(Request $request, UserNote $note): JsonResponse
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'İcazə yoxdur'], 403);
        }

        $note->delete();

        return response()->json(['message' => 'Silindi']);
    }
}
