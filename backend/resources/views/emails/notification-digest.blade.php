<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bildiriş Xülasəsi</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; color: #333; }
        .wrapper { max-width: 600px; margin: 0 auto; }
        .header { background: #1a56db; color: #fff; padding: 24px 32px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p  { margin: 6px 0 0; font-size: 14px; opacity: .85; }
        .body { background: #fff; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none; }
        .summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;
                   padding: 12px 16px; margin-bottom: 24px; font-size: 14px; }
        .group-title { font-size: 13px; font-weight: bold; color: #6b7280;
                       text-transform: uppercase; letter-spacing: .5px;
                       border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;
                       margin: 20px 0 10px; }
        .notif-item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .notif-item:last-child { border-bottom: none; }
        .notif-title   { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .notif-message { font-size: 13px; color: #6b7280; }
        .notif-time    { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        .badge { display: inline-block; padding: 1px 7px; border-radius: 9999px;
                 font-size: 11px; font-weight: 600; }
        .badge-task     { background: #dbeafe; color: #1e40af; }
        .badge-survey   { background: #d1fae5; color: #065f46; }
        .badge-document { background: #fef3c7; color: #92400e; }
        .badge-system   { background: #f3e8ff; color: #6b21a8; }
        .cta { text-align: center; margin: 28px 0 8px; }
        .cta a { background: #1a56db; color: #fff; padding: 12px 28px;
                 border-radius: 6px; text-decoration: none; font-size: 14px;
                 font-weight: 600; }
        .footer { text-align: center; font-size: 11px; color: #9ca3af;
                  padding: 16px; background: #f9fafb; border: 1px solid #e2e8f0;
                  border-top: none; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>{{ $period === 'weekly' ? 'Həftəlik' : 'Gündəlik' }} Bildiriş Xülasəsi</h1>
        <p>Salam, {{ $user->name ?? $user->username }}! Sizin üçün {{ $totalCount }} yeni bildiriş var.</p>
    </div>

    <div class="body">
        <div class="summary">
            📋 Cəmi <strong>{{ $totalCount }}</strong> oxunmamış bildiriş mövcuddur.
        </div>

        @foreach($groups as $key => $items)
            @if(count($items) > 0)
                @php
                    $labels = [
                        'tasks'     => 'Tapşırıqlar',
                        'surveys'   => 'Sorğular',
                        'documents' => 'Sənədlər',
                        'system'    => 'Sistem bildirişləri',
                    ];
                    $badgeClass = "badge-{$key}";
                @endphp
                <div class="group-title">
                    {{ $labels[$key] ?? ucfirst($key) }}
                    <span class="badge {{ $badgeClass }}">{{ count($items) }}</span>
                </div>

                @foreach(array_slice($items, 0, 5) as $notif)
                    <div class="notif-item">
                        <div class="notif-title">{{ $notif['title'] }}</div>
                        <div class="notif-message">{{ \Illuminate\Support\Str::limit($notif['message'], 120) }}</div>
                        <div class="notif-time">{{ \Carbon\Carbon::parse($notif['created_at'])->diffForHumans() }}</div>
                    </div>
                @endforeach

                @if(count($items) > 5)
                    <p style="font-size:13px; color:#6b7280; margin: 8px 0 0;">
                        + {{ count($items) - 5 }} daha bildiriş...
                    </p>
                @endif
            @endif
        @endforeach

        <div class="cta">
            <a href="{{ $appUrl }}/notifications">Bütün bildirişlərə bax</a>
        </div>
    </div>

    <div class="footer">
        © {{ date('Y') }} {{ $appName }}. Bütün hüquqlar qorunur.<br>
        Bu email-i almaq istəmirsinizsə, <a href="{{ $appUrl }}/settings/notifications" style="color:#6b7280;">bildiriş ayarlarından</a> deaktiv edə bilərsiniz.
    </div>
</div>
</body>
</html>
