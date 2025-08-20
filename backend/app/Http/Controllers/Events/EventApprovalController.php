<?php

namespace App\Http\Controllers\Events;

use App\Http\Controllers\Controller;
use App\Models\SchoolEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class EventApprovalController extends Controller
{
    /**
     * Approve an event.
     */
    public function approve(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check permissions
        if (!$this->canApproveEvent($user, $event)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri təsdiqləmək üçün icazəniz yoxdur',
            ], 403);
        }

        // Validate current status
        if (!in_array($event->status, ['draft', 'pending'])) {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız hazırlıq və ya gözləmə vəziyyətindəki tədbirlər təsdiqlənə bilər',
                'current_status' => $event->status,
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'approval_notes' => 'sometimes|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Validate event details before approval
            $validationResult = $this->validateEventForApproval($event);
            if (!$validationResult['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tədbir təsdiq üçün uyğun deyil',
                    'validation_errors' => $validationResult['errors'],
                ], 422);
            }

            $event->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_notes' => $request->approval_notes,
            ]);

            // If event start date is today or in the past, set it to active
            if ($event->start_date <= now()->toDateString()) {
                $event->update(['status' => 'active']);
            }

            DB::commit();

            // Load relationships for response
            $event->load([
                'institution:id,name,type',
                'organizer:id,name,email',
                'approver:id,name,email'
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'event' => [
                        'id' => $event->id,
                        'title' => $event->title,
                        'status' => $event->status,
                        'status_label' => $event->status_label,
                        'approved_at' => $event->approved_at,
                        'approval_notes' => $event->approval_notes,
                        'approved_by' => $event->approver ? [
                            'id' => $event->approver->id,
                            'name' => $event->approver->name,
                            'email' => $event->approver->email,
                        ] : null,
                    ],
                ],
                'message' => 'Tədbir uğurla təsdiqləndi',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Tədbir təsdiqlənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an event.
     */
    public function cancel(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check permissions
        if (!$this->canCancelEvent($user, $event)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri ləğv etmək üçün icazəniz yoxdur',
            ], 403);
        }

        // Validate current status
        if (in_array($event->status, ['cancelled', 'completed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbir artıq ləğv edilib və ya tamamlanıb',
                'current_status' => $event->status,
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'required|string|min:10|max:1000',
            'notify_participants' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Store old status for notification purposes
            $oldStatus = $event->status;

            $event->update([
                'status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
                'cancelled_reason' => $request->cancellation_reason,
            ]);

            // Handle registrations - mark them as cancelled
            if ($event->registration_required) {
                $activeRegistrations = $event->registrations()
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->get();

                foreach ($activeRegistrations as $registration) {
                    $registration->update([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                        'cancellation_reason' => 'Tədbir ləğv edildi: ' . $request->cancellation_reason,
                    ]);
                }

                // TODO: Send notifications to participants if notify_participants is true
                if ($request->boolean('notify_participants', true)) {
                    // This would typically trigger email notifications
                    // For now, we'll just log the intent
                    \Log::info('Event cancelled - notifications should be sent', [
                        'event_id' => $event->id,
                        'participants_count' => $activeRegistrations->count(),
                        'cancelled_by' => $user->id,
                    ]);
                }
            }

            DB::commit();

            // Load relationships for response
            $event->load([
                'institution:id,name,type',
                'organizer:id,name,email',
                'canceller:id,name,email'
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'event' => [
                        'id' => $event->id,
                        'title' => $event->title,
                        'status' => $event->status,
                        'status_label' => $event->status_label,
                        'cancelled_at' => $event->cancelled_at,
                        'cancelled_reason' => $event->cancelled_reason,
                        'cancelled_by' => $event->canceller ? [
                            'id' => $event->canceller->id,
                            'name' => $event->canceller->name,
                            'email' => $event->canceller->email,
                        ] : null,
                    ],
                ],
                'message' => 'Tədbir uğurla ləğv edildi',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Tədbir ləğv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit event for approval.
     */
    public function submitForApproval(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check permissions - only organizer or hierarchy managers can submit
        if (!$this->canSubmitForApproval($user, $event)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri təsdiqə göndərmək üçün icazəniz yoxdur',
            ], 403);
        }

        // Validate current status
        if ($event->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız hazırlıq vəziyyətindəki tədbirlər təsdiqə göndərilə bilər',
                'current_status' => $event->status,
            ], 422);
        }

        try {
            // Validate event completeness
            $validationResult = $this->validateEventForSubmission($event);
            if (!$validationResult['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tədbir təsdiqə göndərilmək üçün tam doldurulmalıdır',
                    'validation_errors' => $validationResult['errors'],
                ], 422);
            }

            $event->update([
                'status' => 'pending',
                'submitted_at' => now(),
                'submitted_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'event' => [
                        'id' => $event->id,
                        'title' => $event->title,
                        'status' => $event->status,
                        'status_label' => $event->status_label,
                        'submitted_at' => $event->submitted_at,
                    ],
                ],
                'message' => 'Tədbir təsdiqə göndərildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir təsdiqə göndərilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user can approve an event.
     */
    private function canApproveEvent($user, SchoolEvent $event): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Users cannot approve their own events
        if ($event->organizer_id == $user->id) {
            return false;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // Region admin can approve sector and school events in their region
        if ($user->hasRole(['regionadmin', 'regionoperator']) && $userInstitution->level <= 2) {
            $eventInstitution = $event->institution;
            return str_starts_with($eventInstitution->path, $userInstitution->path);
        }

        // Sector admin can approve school events in their sector
        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            return $event->institution->parent_id == $userInstitution->id;
        }

        // School admin can approve events in their school
        if ($user->hasRole('schooladmin') && $userInstitution->level == 4) {
            return $event->institution_id == $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can cancel an event.
     */
    private function canCancelEvent($user, SchoolEvent $event): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Event organizer can cancel their own event
        if ($event->organizer_id == $user->id) {
            return true;
        }

        // Same permission logic as approval
        return $this->canApproveEvent($user, $event);
    }

    /**
     * Check if user can submit event for approval.
     */
    private function canSubmitForApproval($user, SchoolEvent $event): bool
    {
        // Event organizer can submit
        if ($event->organizer_id == $user->id) {
            return true;
        }

        // Same institution hierarchy checks as management
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        return $userInstitution->id == $event->institution_id;
    }

    /**
     * Validate event for approval.
     */
    private function validateEventForApproval(SchoolEvent $event): array
    {
        $errors = [];

        // Check if event is in the future
        if ($event->start_date < now()->toDateString()) {
            $errors[] = 'Keçmiş tarixli tədbir təsdiqlənə bilməz';
        }

        // Check required fields
        if (empty($event->title) || empty($event->description) || empty($event->location)) {
            $errors[] = 'Tədbirin başlıq, təsvir və məkan məlumatları tam olmalıdır';
        }

        // Check registration deadline
        if ($event->registration_required && $event->registration_deadline) {
            if ($event->registration_deadline >= $event->start_date) {
                $errors[] = 'Qeydiyyat son tarixi tədbir başlama tarixindən əvvəl olmalıdır';
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Validate event for submission.
     */
    private function validateEventForSubmission(SchoolEvent $event): array
    {
        $errors = [];

        // Required fields check
        $requiredFields = ['title', 'description', 'event_type', 'start_date', 'end_date', 'location'];
        foreach ($requiredFields as $field) {
            if (empty($event->$field)) {
                $errors[] = "'{$field}' sahəsi tələb olunur";
            }
        }

        // Date validations
        if ($event->start_date && $event->end_date) {
            if ($event->start_date > $event->end_date) {
                $errors[] = 'Bitiş tarixi başlama tarixindən əvvəl ola bilməz';
            }
        }

        // Time validations
        if ($event->start_time && $event->end_time) {
            $startDateTime = Carbon::parse($event->start_date . ' ' . $event->start_time);
            $endDateTime = Carbon::parse($event->end_date . ' ' . $event->end_time);
            
            if ($startDateTime >= $endDateTime) {
                $errors[] = 'Bitiş vaxtı başlama vaxtından sonra olmalıdır';
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }
}