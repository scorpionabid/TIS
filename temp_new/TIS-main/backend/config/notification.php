<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Duplicate Prevention Window (minutes)
    |--------------------------------------------------------------------------
    | Eyni user-ə, eyni type/related_id üçün qısa müddətdə yenidən
    | bildiriş göndərilməsinin qarşısını alır.
    */
    'dedup_minutes' => env('NOTIFICATION_DEDUP_MINUTES', 5),

    /*
    |--------------------------------------------------------------------------
    | Cleanup Settings
    |--------------------------------------------------------------------------
    */
    'cleanup_read_after_days' => env('NOTIFICATION_CLEANUP_READ_DAYS', 30),
    'cleanup_unread_after_days' => env('NOTIFICATION_CLEANUP_UNREAD_DAYS', 90),
];
