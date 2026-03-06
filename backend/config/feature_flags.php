<?php

return [
    // Toggle for permission preview/dry-run UI. Set to false to disable preview overlay
    // and skip dry-run validation on save. Default true for safety during rollout.
    'permission_preview' => env('FEATURE_PERMISSION_PREVIEW', true),
];
