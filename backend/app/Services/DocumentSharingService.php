<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DocumentSharingService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Share document with users
     */
    public function shareDocument(Document $document, array $shareData): DocumentShare
    {
        $user = Auth::user();

        // Check if user can share this document
        if (! $this->canUserShareDocument($user, $document)) {
            throw new \Exception('Bu sənədi paylaşmaq icazəniz yoxdur.');
        }

        // Create share record
        $share = DocumentShare::create([
            'document_id' => $document->id,
            'shared_by' => $user->id,
            'share_token' => DocumentShare::generateShareToken(),
            'shared_with_users' => $shareData['user_ids'] ?? [],
            'shared_with_roles' => $shareData['role_names'] ?? [],
            'shared_with_institutions' => $shareData['institution_ids'] ?? [],
            'share_type' => $shareData['share_type'] ?? 'view',
            'message' => $shareData['message'] ?? null,
            'expires_at' => $shareData['expires_at'] ?? now()->addDays(7),
            'is_active' => true,
            'allow_download' => $shareData['allow_download'] ?? true,
            'allow_reshare' => $shareData['allow_reshare'] ?? false,
            'password_protected' => ! empty($shareData['password']),
            'access_password' => ! empty($shareData['password']) ? bcrypt($shareData['password']) : null,
            'requires_password' => ! empty($shareData['password']),
            'password_hash' => ! empty($shareData['password']) ? bcrypt($shareData['password']) : null,
            'max_downloads' => $shareData['max_downloads'] ?? null,
        ]);

        // Send notifications to shared users
        $this->sendShareNotifications($share);

        return $share->load(['document', 'sharedBy']);
    }

    /**
     * Create public share link
     */
    public function createPublicLink(Document $document, array $linkData): DocumentShare
    {
        $user = Auth::user();

        // Check permissions
        if (! $this->canUserShareDocument($user, $document)) {
            throw new \Exception('Bu sənəd üçün ictimai link yaratmaq icazəniz yoxdur.');
        }

        // Generate unique token
        $token = Str::random(32);

        $share = DocumentShare::create([
            'document_id' => $document->id,
            'shared_by' => $user->id,
            'share_token' => DocumentShare::generateShareToken(),
            'share_type' => 'public_link',
            'public_token' => $token,
            'expires_at' => $linkData['expires_at'] ?? now()->addDays(7),
            'is_active' => true,
            'allow_download' => $linkData['allow_download'] ?? false,
            'max_downloads' => $linkData['max_downloads'] ?? null,
            'password_protected' => ! empty($linkData['password']),
            'access_password' => ! empty($linkData['password']) ? bcrypt($linkData['password']) : null,
            'requires_password' => ! empty($linkData['password']),
            'password_hash' => ! empty($linkData['password']) ? bcrypt($linkData['password']) : null,
        ]);

        return $share;
    }

    /**
     * Access document via public link
     */
    public function accessViaPublicLink(string $token, ?string $password = null): Document
    {
        $share = DocumentShare::where('public_token', $token)
            ->where('is_active', true)
            ->first();

        if (! $share) {
            throw new \Exception('Keçərsiz və ya vaxtı keçmiş link.');
        }

        // Check expiration
        if ($share->expires_at && $share->expires_at->isPast()) {
            throw new \Exception('Linkin vaxtı keçmişdir.');
        }

        // Check password if required
        if ($share->password_protected) {
            if (! $password || ! password_verify($password, $share->access_password)) {
                throw new \Exception('Yanlış parol.');
            }
        }

        // Check download limit
        if ($share->max_downloads && $share->access_count >= $share->max_downloads) {
            throw new \Exception('Maximum yükləmə limiti aşılmışdır.');
        }

        // Increment access count
        $share->increment('access_count');

        return $share->document;
    }

    /**
     * Revoke document share
     */
    public function revokeShare(DocumentShare $share): bool
    {
        $user = Auth::user();

        // Check permissions
        if (! $this->canUserManageShare($user, $share)) {
            throw new \Exception('Bu paylaşımı ləğv etmək icazəniz yoxdur.');
        }

        return $share->update(['is_active' => false]);
    }

    /**
     * Get share statistics
     */
    public function getShareStatistics(Document $document): array
    {
        $shares = DocumentShare::where('document_id', $document->id)->get();

        return [
            'total_shares' => $shares->count(),
            'active_shares' => $shares->where('is_active', true)->count(),
            'public_links' => $shares->where('share_type', 'public_link')->count(),
            'private_shares' => $shares->where('share_type', 'view')->count(),
            'total_accesses' => $shares->sum('access_count'),
            'recent_shares' => $shares->where('is_active', true)
                ->sortByDesc('created_at')
                ->take(5)
                ->values(),
        ];
    }

    /**
     * Get user's shared documents
     */
    public function getUserSharedDocuments($userId): array
    {
        $user = User::find($userId);

        // Documents shared by user
        $sharedByUser = DocumentShare::where('shared_by', $userId)
            ->where('is_active', true)
            ->with(['document', 'document.uploader'])
            ->get();

        // Documents shared with user
        $sharedWithUser = DocumentShare::where('is_active', true)
            ->where(function ($query) use ($user) {
                $query->whereJsonContains('shared_with_users', $user->id)
                    ->orWhereIn('shared_with_roles', $user->getRoleNames())
                    ->orWhereJsonContains('shared_with_institutions', $user->institution_id);
            })
            ->with(['document', 'sharedBy'])
            ->get();

        return [
            'shared_by_me' => $sharedByUser,
            'shared_with_me' => $sharedWithUser,
        ];
    }

    /**
     * Send share notifications
     */
    private function sendShareNotifications(DocumentShare $share): void
    {
        $document = $share->document;
        $sharer = $share->sharedBy;

        try {
            // Prepare notification variables
            $variables = [
                'document_title' => $document->original_name ?? $document->file_name,
                'creator_name' => $sharer->name ?? 'Sistem',
                'share_message' => $share->message ?? '',
            ];

            // Prepare recipients array for NotificationService
            $recipients = [];

            // Add specific users
            if (! empty($share->shared_with_users)) {
                $recipients['users'] = $share->shared_with_users;
            }

            // Add users by institution (if institutions are specified)
            if (! empty($share->shared_with_institutions)) {
                $recipients['institutions'] = $share->shared_with_institutions;
                $recipients['target_roles'] = $share->shared_with_roles ?? null;
            }

            // Send notification if we have recipients
            if (! empty($recipients)) {
                $options = [
                    'related' => $document,
                    'priority' => 'normal',
                ];

                Log::info('Sending document share notification', [
                    'document_id' => $document->id,
                    'share_id' => $share->id,
                    'recipients' => array_keys($recipients),
                    'variables' => array_keys($variables),
                ]);

                $this->notificationService->sendFromTemplate('document_shared', $recipients, $variables, $options);
            }

            // Fallback: Handle role-based sharing without institutions
            if (! empty($share->shared_with_roles) && empty($share->shared_with_institutions)) {
                $roleUsers = User::whereHas('roles', function ($query) use ($share) {
                    $query->whereIn('name', $share->shared_with_roles);
                })->pluck('id')->toArray();

                if (! empty($roleUsers)) {
                    $roleRecipients = ['users' => $roleUsers];
                    $this->notificationService->sendFromTemplate('document_shared', $roleRecipients, $variables, $options);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send document sharing notification', [
                'document_id' => $document->id,
                'share_id' => $share->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if user can share document
     */
    private function canUserShareDocument($user, Document $document): bool
    {
        // SuperAdmin can share everything
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Owner can share
        if ($document->uploaded_by === $user->id) {
            return true;
        }

        // Regional/Sector admins can share institution documents
        if ($user->hasRole(['regionadmin', 'sektoradmin']) &&
            $document->institution_id === $user->institution_id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can manage share
     */
    private function canUserManageShare($user, DocumentShare $share): bool
    {
        // SuperAdmin can manage all shares
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Share creator can manage
        if ($share->shared_by === $user->id) {
            return true;
        }

        // Document owner can manage shares
        if ($share->document->uploaded_by === $user->id) {
            return true;
        }

        return false;
    }
}
