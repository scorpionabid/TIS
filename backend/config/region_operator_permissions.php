<?php

return [
    'fields' => [
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
        // Documents
        'can_view_documents',
        'can_upload_documents',
        'can_edit_documents',
        'can_delete_documents',
        'can_share_documents',
        // Links
        'can_view_links',
        'can_create_links',
        'can_edit_links',
        'can_delete_links',
        'can_share_links',
    ],
    'defaults' => [
        'can_view_surveys' => true,
    ],
];
