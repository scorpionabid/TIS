<?php

return [
    'template_version' => '2025.01',
    'required_columns' => [
        'link_title',
        'url',
        'description',
        'institution_unique_name',
        'link_type',
    ],
    'allowed_link_types' => ['external', 'video', 'form', 'document'],
    'max_rows' => 500,
];
