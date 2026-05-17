<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserCalendarEvent;
use App\Models\UserNote;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserCalendarController extends Controller
{
    // ─── Events ──────────────────────────────────────────────────────────────

    public function indexEvents(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Own events
        $ownEvents = UserCalendarEvent::where('user_id', $userId)
            ->with('participants:id,first_name,last_name,email')
            ->orderBy('date')
            ->orderBy('time')
            ->get();

        // Events I was invited to (accepted or pending)
        $invitedEvents = UserCalendarEvent::whereHas('participants', function ($q) use ($userId) {
            $q->where('user_id', $userId)->whereIn('status', ['pending', 'accepted']);
        })
            ->with('participants:id,first_name,last_name,email')
            ->orderBy('date')
            ->orderBy('time')
            ->get()
            ->map(fn ($e) => $e->setAttribute('is_invited', true));

        $all = $ownEvents->merge($invitedEvents)->unique('id')->values();

        // Expand recurring events into instances for the next 90 days
        $expanded = collect();
        $horizon = Carbon::now()->addDays(90)->toDateString();

        foreach ($all as $event) {
            $expanded->push($event);

            if ($event->recurrence_rule && $event->recurrence_rule !== 'none') {
                $end = $event->recurrence_end_date
                    ? min($event->recurrence_end_date->toDateString(), $horizon)
                    : $horizon;

                $current = Carbon::parse($event->date);

                while (true) {
                    $current = match ($event->recurrence_rule) {
                        'daily'   => $current->copy()->addDay(),
                        'weekly'  => $current->copy()->addWeek(),
                        'monthly' => $current->copy()->addMonth(),
                        default   => null,
                    };

                    if (!$current || $current->toDateString() > $end) break;

                    $clone = $event->replicate();
                    $clone->id = $event->id; // same ID so frontend knows origin
                    $clone->date = $current->toDateString(); // "Y-m-d" string, not DateTime object
                    $clone->setAttribute('is_recurring_instance', true);
                    $expanded->push($clone);
                }
            }
        }

        return response()->json(['data' => $expanded->values()]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'                => 'required|string|max:255',
            'type'                 => 'required|string|in:event,meeting,visit,task',
            'date'                 => 'required|date',
            'time'                 => 'nullable|string|max:10',
            'link'                 => 'nullable|url|max:500',
            'reminder_minutes'     => 'nullable|integer|min:0|max:10080',
            'recurrence_rule'      => 'nullable|string|in:none,daily,weekly,monthly',
            'recurrence_end_date'  => 'nullable|date|after:date',
            'participant_ids'      => 'nullable|array',
            'participant_ids.*'    => 'integer|exists:users,id',
        ]);

        $event = UserCalendarEvent::create([
            'user_id'              => $request->user()->id,
            'title'                => $validated['title'],
            'type'                 => $validated['type'],
            'date'                 => $validated['date'],
            'time'                 => $validated['time'] ?? null,
            'link'                 => $validated['link'] ?? null,
            'reminder_minutes'     => $validated['reminder_minutes'] ?? null,
            'recurrence_rule'      => $validated['recurrence_rule'] ?? null,
            'recurrence_end_date'  => $validated['recurrence_end_date'] ?? null,
        ]);

        if (!empty($validated['participant_ids'])) {
            $event->participants()->attach($validated['participant_ids'], ['status' => 'pending']);
        }

        $event->load('participants:id,first_name,last_name,email');

        return response()->json(['data' => $event], 201);
    }

    public function updateEvent(Request $request, UserCalendarEvent $event): JsonResponse
    {
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'İcazə yoxdur'], 403);
        }

        $validated = $request->validate([
            'title'                => 'sometimes|string|max:255',
            'type'                 => 'sometimes|string|in:event,meeting,visit,task',
            'date'                 => 'sometimes|date',
            'time'                 => 'nullable|string|max:10',
            'link'                 => 'nullable|url|max:500',
            'reminder_minutes'     => 'nullable|integer|min:0|max:10080',
            'recurrence_rule'      => 'nullable|string|in:none,daily,weekly,monthly',
            'recurrence_end_date'  => 'nullable|date',
            'participant_ids'      => 'nullable|array',
            'participant_ids.*'    => 'integer|exists:users,id',
        ]);

        $event->update(collect($validated)->except('participant_ids')->toArray());

        if (array_key_exists('participant_ids', $validated)) {
            $event->participants()->sync(
                collect($validated['participant_ids'])->mapWithKeys(fn ($id) => [$id => ['status' => 'pending']])
            );
        }

        $event->load('participants:id,first_name,last_name,email');

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
            'text'  => 'required|string|max:2000',
            'color' => 'nullable|string|in:yellow,red,green,blue,purple',
        ]);

        $note = UserNote::create([
            'text'    => $validated['text'],
            'color'   => $validated['color'] ?? 'yellow',
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
            'text'  => 'required|string|max:2000',
            'color' => 'nullable|string|in:yellow,red,green,blue,purple',
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

    // ─── Participant RSVP ────────────────────────────────────────────────────

    public function rsvpEvent(Request $request, UserCalendarEvent $event): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:accepted,declined',
        ]);

        $event->participants()->updateExistingPivot($request->user()->id, [
            'status' => $validated['status'],
        ]);

        return response()->json(['message' => 'Cavabınız qeydə alındı']);
    }

    // ─── User search for participant picker ──────────────────────────────────

    public function searchUsers(Request $request): JsonResponse
    {
        $q = $request->input('q', '');
        $currentUser = $request->user();

        $users = User::where('id', '!=', $currentUser->id)
            ->where(function ($query) use ($q) {
                $query->where('first_name', 'ilike', "%{$q}%")
                      ->orWhere('last_name', 'ilike', "%{$q}%")
                      ->orWhere('email', 'ilike', "%{$q}%");
            })
            ->select('id', 'first_name', 'last_name', 'email')
            ->limit(10)
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => trim("{$u->first_name} {$u->last_name}"),
                'email' => $u->email,
            ]);

        return response()->json(['data' => $users]);
    }
}
