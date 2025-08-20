<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $subject }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
        }
        .content {
            padding: 20px;
            background-color: #fff;
            border: 1px solid #e9ecef;
            border-top: none;
        }
        .footer {
            margin-top: 20px;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin: 15px 0;
            background-color: #007bff;
            color: #fff !important;
            text-decoration: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>{{ $subject }}</h2>
    </div>
    
    <div class="content">
        @if(isset($notification['greeting']))
            <p>{{ $notification['greeting'] }}</p>
        @endif
        
        @if(isset($notification['message']))
            <div>{!! nl2br(e($notification['message'])) !!}</div>
        @endif
        
        @if(isset($notification['actionUrl']))
            <p>
                <a href="{{ $notification['actionUrl'] }}" class="button">
                    {{ $notification['actionText'] ?? 'View Details' }}
                </a>
            </p>
        @endif
        
        @if(isset($notification['outro']))
            <p>{{ $notification['outro'] }}</p>
        @endif
    </div>
    
    <div class="footer">
        <p>© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
        @if(isset($notification['unsubscribeUrl']))
            <p>
                <a href="{{ $notification['unsubscribeUrl'] }}">Unsubscribe</a> from these emails.
            </p>
        @endif
    </div>
</body>
</html>
