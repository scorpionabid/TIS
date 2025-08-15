<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentAuthorityMatrix extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_role',
        'upload_scope',
        'can_share_to_types',
        'can_assign_roles',
        'can_create_public_links',
        'can_set_expiry',
        'max_file_size_mb',
        'allowed_file_types',
    ];

    protected $casts = [
        'can_share_to_types' => 'array',
        'can_assign_roles' => 'array',
        'can_create_public_links' => 'boolean',
        'can_set_expiry' => 'boolean',
        'max_file_size_mb' => 'integer',
        'allowed_file_types' => 'array',
    ];

    /**
     * Get authority matrix for specific role
     */
    public static function getForRole(string $role): ?self
    {
        return static::where('user_role', $role)->first();
    }

    /**
     * Check if role can share to specific type
     */
    public function canShareToType(string $type): bool
    {
        return in_array($type, $this->can_share_to_types ?? []);
    }

    /**
     * Check if role can assign to specific role
     */
    public function canAssignToRole(string $role): bool
    {
        return in_array($role, $this->can_assign_roles ?? []);
    }

    /**
     * Check if file type is allowed
     */
    public function isFileTypeAllowed(string $fileType): bool
    {
        if (!$this->allowed_file_types) {
            return true; // No restrictions
        }
        
        return in_array($fileType, $this->allowed_file_types);
    }

    /**
     * Check if file size is within limits
     */
    public function isFileSizeAllowed(int $fileSizeBytes): bool
    {
        $maxBytes = $this->max_file_size_mb * 1024 * 1024;
        return $fileSizeBytes <= $maxBytes;
    }

    /**
     * Get default authority matrix for role
     */
    public static function getDefaultForRole(string $role): array
    {
        $defaults = [
            'superadmin' => [
                'upload_scope' => 'cross_regional',
                'can_share_to_types' => ['region', 'sector', 'school'],
                'can_assign_roles' => ['regionadmin', 'regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
                'can_create_public_links' => true,
                'can_set_expiry' => true,
                'max_file_size_mb' => 500,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image', 'video', 'other'],
            ],
            'regionadmin' => [
                'upload_scope' => 'own_region',
                'can_share_to_types' => ['sector', 'school'],
                'can_assign_roles' => ['regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => true,
                'max_file_size_mb' => 200,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'regionoperator' => [
                'upload_scope' => 'own_region',
                'can_share_to_types' => ['school'],
                'can_assign_roles' => ['schooladmin', 'deputy', 'teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => true,
                'max_file_size_mb' => 100,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'sektoradmin' => [
                'upload_scope' => 'own_sector',
                'can_share_to_types' => ['school'],
                'can_assign_roles' => ['sektoroperator', 'schooladmin', 'deputy', 'teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => true,
                'max_file_size_mb' => 100,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'sektoroperator' => [
                'upload_scope' => 'own_sector',
                'can_share_to_types' => ['school'],
                'can_assign_roles' => ['schooladmin', 'deputy', 'teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => true,
                'max_file_size_mb' => 50,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'schooladmin' => [
                'upload_scope' => 'own_institution',
                'can_share_to_types' => [],
                'can_assign_roles' => ['deputy', 'teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => true,
                'max_file_size_mb' => 50,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'deputy' => [
                'upload_scope' => 'own_institution',
                'can_share_to_types' => [],
                'can_assign_roles' => ['teacher'],
                'can_create_public_links' => false,
                'can_set_expiry' => false,
                'max_file_size_mb' => 25,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
            'teacher' => [
                'upload_scope' => 'own_institution',
                'can_share_to_types' => [],
                'can_assign_roles' => [],
                'can_create_public_links' => false,
                'can_set_expiry' => false,
                'max_file_size_mb' => 25,
                'allowed_file_types' => ['pdf', 'excel', 'word', 'image'],
            ],
        ];

        return $defaults[$role] ?? $defaults['teacher'];
    }
}