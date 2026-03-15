<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Events\NewMessageReceived;
use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Institution;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * GET /api/messages
     * Inbox: current user recipient olduğu üst-səviyyəli mesajlar.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $userId = auth()->id();

        $messages = Message::whereHas('messageRecipients', function ($q) use ($userId) {
                $q->where('recipient_id', $userId)->whereNull('deleted_at');
            })
            ->whereNull('parent_id')
            ->withCount('replies')
            ->with([
                'sender.role',
                'sender.institution',
                'messageRecipients' => fn ($q) => $q->where('recipient_id', $userId),
                'replies'           => fn ($q) => $q->with('sender.role')->orderBy('created_at', 'asc'),
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return MessageResource::collection($messages);
    }

    /**
     * GET /api/messages/sent
     * Göndərilənlər: current user tərəfindən göndərilmiş üst-səviyyəli mesajlar.
     */
    public function sent(Request $request): AnonymousResourceCollection
    {
        $userId = auth()->id();

        $messages = Message::where('sender_id', $userId)
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->withCount('replies')
            ->with([
                'sender.role',
                'messageRecipients.recipient',
                'replies' => fn ($q) => $q->with('sender.role')->orderBy('created_at', 'asc'),
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return MessageResource::collection($messages);
    }

    /**
     * GET /api/messages/unread-count
     * Oxunmamış mesaj sayı.
     */
    public function unreadCount(): JsonResponse
    {
        $count = MessageRecipient::where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->whereNull('deleted_at')
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * GET /api/messages/recipients
     * Rol əsaslı alıcı siyahısı. ?search= parametri ilə filterlənə bilər.
     */
    public function recipients(Request $request): JsonResponse
    {
        $user       = auth()->user();
        $search     = strtolower(trim($request->string('search')->value()));
        $recipients = $this->getRecipientsCollectionForUser($user);

        if ($search !== '') {
            $recipients = $recipients->filter(fn ($r) =>
                str_contains(strtolower($r['name']), $search) ||
                str_contains(strtolower($r['institution_name']), $search)
            );
        }

        return response()->json([
            'data' => $recipients->values(),
        ]);
    }

    /**
     * GET /api/messages/{id}
     * Tək mesajın ətraflı görünüşü.
     */
    public function show(int $id): MessageResource
    {
        $userId = auth()->id();

        $message = Message::where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)
                  ->orWhereHas('messageRecipients', fn ($q2) =>
                      $q2->where('recipient_id', $userId)->whereNull('deleted_at')
                  );
            })
            ->with([
                'sender.role',
                'sender.institution',
                'messageRecipients.recipient',
                'replies' => fn ($q) => $q->with('sender.role', 'messageRecipients')->orderBy('created_at', 'asc'),
            ])
            ->findOrFail($id);

        return new MessageResource($message);
    }

    /**
     * POST /api/messages
     * Yeni mesaj göndər.
     */
    public function store(SendMessageRequest $request): JsonResponse
    {
        $user      = auth()->user();
        $validated = $request->validated();
        $recipientIds = $validated['recipient_ids'] ?? [];

        // Resolve targets if provided
        if (! empty($validated['target_institutions'])) {
            $resolvedIds = $this->resolveTargets(
                $user,
                $validated['target_institutions'],
                $validated['target_roles'] ?? []
            );
            $recipientIds = array_unique(array_merge($recipientIds, $resolvedIds));
        }

        if (empty($recipientIds)) {
            return response()->json([
                'message' => 'Ən azı bir alıcı seçilməlidir.',
            ], 422);
        }

        // Göndərənin öz rol səlahiyyəti daxilindəki alıcılara məhdudlaşdır
        $allowedIds      = $this->getRecipientsCollectionForUser($user)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->toArray();
        $unauthorizedIds = array_diff($recipientIds, $allowedIds);

        if (! empty($unauthorizedIds) && ! $user->hasRole('superadmin')) {
            return response()->json([
                'message' => 'Bu istifadəçilərə mesaj göndərmək icazəniz yoxdur.',
            ], 403);
        }

        $message = DB::transaction(function () use ($validated, $recipientIds) {
            $msg = Message::create([
                'sender_id' => auth()->id(),
                'parent_id' => $validated['parent_id'] ?? null,
                'body'      => $validated['body'],
            ]);

            // Bulk insert: N ayrı INSERT əvəzinə bir sorğu
            $now  = now();
            $rows = array_map(fn ($recipientId) => [
                'message_id'   => $msg->id,
                'recipient_id' => $recipientId,
                'is_read'      => false,
                'created_at'   => $now,
                'updated_at'   => $now,
            ], $recipientIds);

            MessageRecipient::insert($rows);

            return $msg;
        });

        $message->load('sender.role', 'sender.institution', 'messageRecipients.recipient');

        // Real-time broadcast
        foreach ($recipientIds as $recipientId) {
            event(new NewMessageReceived($message, $recipientId));
        }

        return response()->json(['data' => new MessageResource($message)], 201);
    }

    /**
     * POST /api/messages/{id}/read
     * Mesajı oxunmuş kimi işarələ.
     */
    public function markAsRead(int $id): JsonResponse
    {
        $userId = auth()->id();

        $recipient = MessageRecipient::where('message_id', $id)
            ->where('recipient_id', $userId)
            ->whereNull('deleted_at')
            ->firstOrFail();

        if (! $recipient->is_read) {
            $recipient->update([
                'is_read'    => true,
                'read_at'    => now(),
                'expires_at' => now()->addDay(),
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * DELETE /api/messages/{id}
     * Göndərən tərəfindən mesajı soft-delete et.
     */
    public function destroy(int $id): JsonResponse
    {
        $message = Message::where('sender_id', auth()->id())
            ->findOrFail($id);

        $message->delete();

        return response()->json(['success' => true]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helper metodlar
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cari istifadəçinin roluna uyğun icazəli alıcılar kolleksiyasını qaytar.
     * recipients() və store() hər ikisi bu metoddan istifadə edir — duplicate match yoxdur.
     */
    private function getRecipientsCollectionForUser(User $user): Collection
    {
        // Spatie roles mənbəyi daha etibarlıdır (role_id sinxron olmaya bilər)
        $roleName = strtolower(
            $user->roles->first()?->name ?? $user->role?->name ?? ''
        );

        return match ($roleName) {
            'schooladmin'                   => $this->getRecipientsForSchoolAdmin($user),
            'regionadmin', 'regionoperator' => $this->getRecipientsForRegionAdmin($user),
            'sektoradmin'                   => $this->getRecipientsForSektorAdmin($user),
            'superadmin'                    => $this->getRecipientsForSuperAdmin(),
            default                         => collect([]),
        };
    }

    /**
     * User modelini standart recipient massivə çevir.
     * Bütün getRecipientsFor* metodları bu helper-i istifadə edir — identik map closure yoxdur.
     */
    private function mapUserToRecipient(User $u, ?string $fixedRole = null): array
    {
        return [
            'type'             => 'user',
            'id'               => $u->id,
            'name'             => $u->name,
            'role'             => $fixedRole ?? ($u->roles->first()?->name ?? $u->role?->name ?? ''),
            'institution_name' => $u->institution?->name ?? '',
            'institution_id'   => $u->institution_id,
        ];
    }

    /**
     * SchoolAdmin: öz region/sektorundakı yuxarı rol sahiblərini görür.
     */
    private function getRecipientsForSchoolAdmin(User $user): Collection
    {
        $institution = $user->institution;
        if (! $institution) {
            return collect([]);
        }

        // Get all ancestors (Sektor, Region, Ministry)
        $ancestorIds = $institution->getAncestors()->pluck('id')->toArray();

        if (empty($ancestorIds)) {
            return collect([]);
        }

        // Return all active admins in parent institutions
        return User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['regionadmin', 'regionoperator', 'sektoradmin']);
            })
            ->whereIn('institution_id', $ancestorIds)
            ->where('is_active', true)
            ->with(['roles', 'institution'])
            ->get()
            ->map(fn (User $u) => $this->mapUserToRecipient($u));
    }

    /**
     * RegionAdmin / RegionOperator: öz region altındakı sektoradmin (level 3) və
     * schooladmin (level 4) istifadəçilərini görür.
     * Bir tək query ilə hər iki rolu birlikdə çəkir.
     */
    private function getRecipientsForRegionAdmin(User $user): Collection
    {
        $regionInstitution = $user->institution;
        if (! $regionInstitution) {
            return collect([]);
        }

        $allChildIds = $regionInstitution->getAllChildrenIds();
        if (empty($allChildIds)) {
            return collect([]);
        }

        return User::whereHas('roles', fn ($q) => $q->whereIn('name', ['sektoradmin', 'schooladmin']))
            ->whereHas('institution', fn ($q) =>
                $q->whereIn('id', $allChildIds)
                  ->whereIn('level', [3, 4])
                  ->where('is_active', true)
            )
            ->where('is_active', true)
            ->with(['roles', 'institution'])
            ->get()
            ->map(fn (User $u) => $this->mapUserToRecipient($u));
    }

    /**
     * SektorAdmin: öz sektoru (level 3) altındakı məktəblərin schooladminlərini görür.
     */
    private function getRecipientsForSektorAdmin(User $user): Collection
    {
        $sektorInstitution = $user->institution;
        if (! $sektorInstitution) {
            return collect([]);
        }

        return User::whereHas('roles', fn ($q) => $q->where('name', 'schooladmin'))
            ->whereHas('institution', fn ($q) =>
                $q->where('parent_id', $sektorInstitution->id)
                  ->where('level', 4)
                  ->where('is_active', true)
            )
            ->where('is_active', true)
            ->with(['roles', 'institution'])
            ->get()
            ->map(fn (User $u) => $this->mapUserToRecipient($u, 'schooladmin'));
    }

    /**
     * SuperAdmin: sistemdəki bütün aktiv schooladminlər.
     */
    private function getRecipientsForSuperAdmin(): Collection
    {
        return User::whereHas('roles', fn ($q) => $q->where('name', 'schooladmin'))
            ->where('is_active', true)
            ->with(['roles', 'institution'])
            ->get()
            ->map(fn (User $u) => $this->mapUserToRecipient($u, 'schooladmin'));
    }

    /**
     * Hədəf müəssisə və rolları istifadəçi ID-lərinə çevirir.
     */
    private function resolveTargets(User $user, array $targetInstitutions, array $targetRoles): array
    {
        if (empty($targetInstitutions)) {
            return [];
        }

        // Default rol olaraq schooladmin götürülür
        if (empty($targetRoles)) {
            $targetRoles = ['schooladmin'];
        }

        // İstifadəçinin səlahiyyəti çatan müəssisələri müəyyən et
        $allowedInstitutionIds = $this->getAllowedInstitutionIdsForUser($user);
        $validInstitutions     = array_intersect($targetInstitutions, $allowedInstitutionIds);

        if (empty($validInstitutions)) {
            return [];
        }

        return User::whereIn('institution_id', $validInstitutions)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $targetRoles))
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();
    }

    /**
     * İstifadəçinin mesaj göndərə biləcəyi müəssisə ID-lərini qaytarır.
     */
    private function getAllowedInstitutionIdsForUser(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        $ids = $institution->getAllChildrenIds();

        // Add ancestors for upward messaging support
        $ancestorIds = $institution->getAncestors()->pluck('id')->toArray();
        $ids = array_merge($ids, $ancestorIds);

        return array_values(array_unique($ids));
    }
}
