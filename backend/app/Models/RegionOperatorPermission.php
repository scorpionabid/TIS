<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegionOperatorPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        // DEPRECATED: Old simple permissions (kept for backward compatibility)
        'can_manage_surveys',
        'can_manage_tasks',
        'can_manage_documents',
        'can_manage_folders',
        'can_manage_links',
        // NEW: Granular CRUD-based permissions
        // Surveys
        'can_view_surveys',
        'can_create_surveys',
        'can_edit_surveys',
        'can_delete_surveys',
        'can_publish_surveys',
        // Tasks
        'can_view_tasks',
        'can_create_tasks',
        'can_edit_tasks',
        'can_delete_tasks',
        'can_assign_tasks',
        // Documents
        'can_view_documents',
        'can_upload_documents',
        'can_edit_documents',
        'can_delete_documents',
        'can_share_documents',
        // Folders
        'can_view_folders',
        'can_create_folders',
        'can_edit_folders',
        'can_delete_folders',
        'can_manage_folder_access',
        // Links
        'can_view_links',
        'can_create_links',
        'can_edit_links',
        'can_delete_links',
        'can_share_links',
    ];

    protected $casts = [
        // DEPRECATED: Old simple permissions
        'can_manage_surveys' => 'boolean',
        'can_manage_tasks' => 'boolean',
        'can_manage_documents' => 'boolean',
        'can_manage_folders' => 'boolean',
        'can_manage_links' => 'boolean',
        // NEW: Granular CRUD permissions
        // Surveys
        'can_view_surveys' => 'boolean',
        'can_create_surveys' => 'boolean',
        'can_edit_surveys' => 'boolean',
        'can_delete_surveys' => 'boolean',
        'can_publish_surveys' => 'boolean',
        // Tasks
        'can_view_tasks' => 'boolean',
        'can_create_tasks' => 'boolean',
        'can_edit_tasks' => 'boolean',
        'can_delete_tasks' => 'boolean',
        'can_assign_tasks' => 'boolean',
        // Documents
        'can_view_documents' => 'boolean',
        'can_upload_documents' => 'boolean',
        'can_edit_documents' => 'boolean',
        'can_delete_documents' => 'boolean',
        'can_share_documents' => 'boolean',
        // Folders
        'can_view_folders' => 'boolean',
        'can_create_folders' => 'boolean',
        'can_edit_folders' => 'boolean',
        'can_delete_folders' => 'boolean',
        'can_manage_folder_access' => 'boolean',
        // Links
        'can_view_links' => 'boolean',
        'can_create_links' => 'boolean',
        'can_edit_links' => 'boolean',
        'can_delete_links' => 'boolean',
        'can_share_links' => 'boolean',
    ];

    /**
     * User relationship.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

