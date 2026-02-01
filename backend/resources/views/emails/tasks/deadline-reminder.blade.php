<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tapşırıq Xatırlatması</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        .alert-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .alert-urgent {
            background-color: #fef2f2;
            color: #dc2626;
        }
        .alert-warning {
            background-color: #fffbeb;
            color: #d97706;
        }
        .alert-info {
            background-color: #eff6ff;
            color: #2563eb;
        }
        h1 {
            color: #1f2937;
            font-size: 20px;
            margin-bottom: 20px;
        }
        .task-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .task-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
        }
        .task-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 15px;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            color: #6b7280;
        }
        .meta-label {
            font-weight: 500;
        }
        .priority-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .priority-low { background-color: #f3f4f6; color: #6b7280; }
        .priority-medium { background-color: #dbeafe; color: #2563eb; }
        .priority-high { background-color: #ffedd5; color: #ea580c; }
        .priority-urgent { background-color: #fee2e2; color: #dc2626; }
        .task-description {
            color: #4b5563;
            font-size: 14px;
            margin-top: 10px;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .cta-button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
        }
        .deadline-highlight {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">ATİS</div>
            <p style="color: #6b7280; margin: 5px 0 0;">Tapşırıq İdarəetmə Sistemi</p>
        </div>

        @if($daysRemaining === 0)
            <span class="alert-badge alert-urgent">Bu gün bitir!</span>
        @elseif($daysRemaining <= 1)
            <span class="alert-badge alert-warning">Sabah bitir!</span>
        @else
            <span class="alert-badge alert-info">{{ $daysRemaining }} gün qalıb</span>
        @endif

        <h1>Hörmətli {{ $user->name }},</h1>

        <p>Sizə təyin olunmuş tapşırığın son tarixi yaxınlaşır:</p>

        <div class="task-card">
            <div class="task-title">{{ $task->title }}</div>

            <div class="task-meta">
                <div class="meta-item">
                    <span class="meta-label">Son tarix:</span>
                    <strong>{{ $deadlineDate }}@if($deadlineTime) {{ $deadlineTime }}@endif</strong>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Prioritet:</span>
                    <span class="priority-badge priority-{{ $task->priority }}">{{ $priorityLabel }}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Kateqoriya:</span>
                    <span>{{ $categoryLabel }}</span>
                </div>
            </div>

            @if($task->description)
                <div class="task-description">
                    {{ Str::limit($task->description, 200) }}
                </div>
            @endif
        </div>

        @if($daysRemaining === 0)
            <div class="deadline-highlight">
                Bu gün son gündür!
            </div>
        @endif

        <p>Tapşırığı vaxtında tamamlamaq üçün aşağıdakı düyməyə klikləyin:</p>

        <center>
            <a href="{{ $appUrl }}/tasks?task={{ $task->id }}" class="cta-button">
                Tapşırığa keç
            </a>
        </center>

        <div class="footer">
            <p>Bu email avtomatik olaraq ATİS sistemindən göndərilib.</p>
            <p>Suallarınız varsa, sistem administratoru ilə əlaqə saxlayın.</p>
        </div>
    </div>
</body>
</html>
