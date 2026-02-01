<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskChecklistController extends Controller
{
    /**
     * Get all checklist items for a task
     */
    public function index(Task $task): JsonResponse
    {
        $items = $task->checklistItems()
            ->orderBy('position')
            ->with('completedByUser:id,first_name,last_name,username')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Create a new checklist item
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        // Get the max position
        $maxPosition = $task->checklistItems()->max('position') ?? -1;

        $item = $task->checklistItems()->create([
            'title' => $validated['title'],
            'position' => $maxPosition + 1,
            'is_completed' => false,
        ]);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Checklist elementi əlavə edildi',
        ], 201);
    }

    /**
     * Update a checklist item
     */
    public function update(Request $request, Task $task, TaskChecklistItem $checklist): JsonResponse
    {
        // Ensure the checklist item belongs to this task
        if ($checklist->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'Checklist elementi bu tapşırığa aid deyil',
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'is_completed' => 'sometimes|boolean',
        ]);

        // Handle completion status
        if (isset($validated['is_completed'])) {
            if ($validated['is_completed'] && ! $checklist->is_completed) {
                $checklist->markCompleted(Auth::id());
            } elseif (! $validated['is_completed'] && $checklist->is_completed) {
                $checklist->markIncomplete();
            }
            unset($validated['is_completed']);
        }

        // Update other fields
        if (! empty($validated)) {
            $checklist->update($validated);
        }

        $checklist->load('completedByUser:id,first_name,last_name,username');

        return response()->json([
            'success' => true,
            'data' => $checklist,
            'message' => 'Checklist elementi yeniləndi',
        ]);
    }

    /**
     * Delete a checklist item
     */
    public function destroy(Task $task, TaskChecklistItem $checklist): JsonResponse
    {
        // Ensure the checklist item belongs to this task
        if ($checklist->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'Checklist elementi bu tapşırığa aid deyil',
            ], 404);
        }

        $checklist->delete();

        return response()->json([
            'success' => true,
            'message' => 'Checklist elementi silindi',
        ]);
    }

    /**
     * Reorder checklist items
     */
    public function reorder(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'integer|exists:task_checklists,id',
        ]);

        foreach ($validated['item_ids'] as $position => $itemId) {
            TaskChecklistItem::where('id', $itemId)
                ->where('task_id', $task->id)
                ->update(['position' => $position]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sıralama yeniləndi',
        ]);
    }
}
