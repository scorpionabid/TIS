<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Survey Bildirişi' }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        
        .header p {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 16px;
        }
        
        .content {
            margin: 20px 0;
        }
        
        .content h2 {
            color: #333;
            font-size: 22px;
            margin-bottom: 15px;
            border-left: 4px solid #007bff;
            padding-left: 15px;
        }
        
        .survey-info {
            background: #f8f9ff;
            border: 1px solid #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .survey-info h3 {
            color: #1976d2;
            margin: 0 0 15px 0;
            font-size: 18px;
            display: flex;
            align-items: center;
        }
        
        .survey-info h3::before {
            content: "📋";
            margin-right: 8px;
            font-size: 20px;
        }
        
        .info-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            font-weight: 600;
            width: 120px;
            flex-shrink: 0;
            color: #555;
        }
        
        .info-value {
            flex: 1;
            color: #333;
        }
        
        .priority-high {
            color: #d32f2f;
            font-weight: 600;
        }
        
        .priority-normal {
            color: #f57c00;
            font-weight: 600;
        }
        
        .priority-low {
            color: #388e3c;
            font-weight: 600;
        }
        
        .status-pending {
            color: #f57c00;
            background: #fff3e0;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-approved {
            color: #388e3c;
            background: #e8f5e8;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-rejected {
            color: #d32f2f;
            background: #ffebee;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 5px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #81c784);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
        }
        
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,123,255,0.3);
            transition: all 0.3s ease;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,123,255,0.4);
        }
        
        .warning-box {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #f39c12;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .warning-box h4 {
            color: #856404;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
        }
        
        .warning-box h4::before {
            content: "⚠️";
            margin-right: 8px;
        }
        
        .warning-box p {
            color: #856404;
            margin: 0;
        }
        
        .success-box {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-left: 4px solid #28a745;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .success-box h4 {
            color: #155724;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
        }
        
        .success-box h4::before {
            content: "✅";
            margin-right: 8px;
        }
        
        .success-box p {
            color: #155724;
            margin: 0;
        }
        
        .error-box {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-left: 4px solid #dc3545;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .error-box h4 {
            color: #721c24;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
        }
        
        .error-box h4::before {
            content: "❌";
            margin-right: 8px;
        }
        
        .error-box p {
            color: #721c24;
            margin: 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        
        .footer strong {
            color: #007bff;
            font-size: 16px;
        }
        
        .footer p {
            margin: 5px 0;
        }
        
        .deadline-reminder {
            background: #fff3e0;
            border: 2px solid #ff9800;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .deadline-reminder h4 {
            color: #e65100;
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .deadline-reminder p {
            color: #bf360c;
            margin: 0;
            font-weight: 600;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .info-label {
                width: auto;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ATİS</h1>
            <p>Azərbaycan Təhsil İdarəetmə Sistemi</p>
        </div>

        <div class="content">
            <h2>{{ $greeting ?? 'Hörmətli istifadəçi,' }}</h2>
            
            @if(isset($introText))
                <p>{{ $introText }}</p>
            @endif

            @if(isset($surveyInfo))
                <div class="survey-info">
                    <h3>{{ $surveyInfo['survey_title'] ?? 'Survey Məlumatları' }}</h3>
                    
                    <div class="info-row">
                        <span class="info-label">🏢 Müəssisə:</span>
                        <span class="info-value">{{ $surveyInfo['institution_name'] ?? 'N/A' }}</span>
                    </div>
                    
                    @if(isset($surveyInfo['respondent_name']))
                        <div class="info-row">
                            <span class="info-label">👤 Cavab verən:</span>
                            <span class="info-value">{{ $surveyInfo['respondent_name'] }}</span>
                        </div>
                    @endif
                    
                    @if(isset($surveyInfo['survey_category']))
                        <div class="info-row">
                            <span class="info-label">📂 Kateqoriya:</span>
                            <span class="info-value">{{ $surveyInfo['survey_category'] }}</span>
                        </div>
                    @endif
                    
                    @if(isset($surveyInfo['progress_percentage']))
                        <div class="info-row">
                            <span class="info-label">📊 Tamamlanma:</span>
                            <span class="info-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: {{ $surveyInfo['progress_percentage'] }}%">
                                        {{ $surveyInfo['progress_percentage'] }}%
                                    </div>
                                </div>
                            </span>
                        </div>
                    @endif
                    
                    @if(isset($priority))
                        <div class="info-row">
                            <span class="info-label">⚡ Prioritet:</span>
                            <span class="info-value priority-{{ $priority }}">
                                @if($priority === 'high') 🔴 Yüksək
                                @elseif($priority === 'normal') 🟡 Normal
                                @else 🟢 Aşağı
                                @endif
                            </span>
                        </div>
                    @endif
                    
                    @if(isset($deadline))
                        <div class="info-row">
                            <span class="info-label">🕒 Son tarix:</span>
                            <span class="info-value">{{ $deadline }}</span>
                        </div>
                    @endif
                </div>
            @endif

            @if(isset($notificationType))
                @if($notificationType === 'approval_completed')
                    <div class="success-box">
                        <h4>Təsdiq Tamamlandı</h4>
                        <p>Survey cavabınız uğurla təsdiqləndi və sistemdə qeydiyyata alındı.</p>
                        @if(isset($approverName))
                            <p><strong>Təsdiq edən:</strong> {{ $approverName }}</p>
                        @endif
                    </div>
                @elseif($notificationType === 'approval_rejected')
                    <div class="error-box">
                        <h4>Təsdiq Rədd Edildi</h4>
                        <p>Təəssüf ki, survey cavabınız rədd edilmişdir.</p>
                        @if(isset($rejectionReason))
                            <p><strong>Səbəb:</strong> {{ $rejectionReason }}</p>
                        @endif
                        <p>Zəhmət olmasa, cavabınızı yenidən nəzərdən keçirin və təkrar təqdim edin.</p>
                    </div>
                @elseif($notificationType === 'approval_deadline_reminder')
                    <div class="deadline-reminder">
                        <h4>⏰ Deadline Xatırlatması</h4>
                        <p>Survey təsdiq müddəti {{ $daysLeft ?? 1 }} gündə başa çatır!</p>
                    </div>
                @elseif($notificationType === 'approval_delegated')
                    <div class="warning-box">
                        <h4>Səlahiyyət Həvaləsi</h4>
                        <p>Sizə survey təsdiq səlahiyyəti həvalə edilmişdir.</p>
                        @if(isset($delegatorName))
                            <p><strong>Həvalə edən:</strong> {{ $delegatorName }}</p>
                        @endif
                        @if(isset($delegationReason))
                            <p><strong>Səbəb:</strong> {{ $delegationReason }}</p>
                        @endif
                    </div>
                @endif
            @endif

            @if(isset($comments) && $comments)
                <div class="survey-info">
                    <h3>💬 Qeydlər</h3>
                    <p>{{ $comments }}</p>
                </div>
            @endif

            @if(isset($additionalInfo))
                <p>{{ $additionalInfo }}</p>
            @endif

            @if(isset($actionUrl) && isset($actionText))
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ $actionUrl }}" class="action-button">
                        {{ $actionText }}
                    </a>
                </div>
            @endif

            @if(isset($bottomText))
                <p>{{ $bottomText }}</p>
            @endif
        </div>

        <div class="footer">
            <strong>ATİS</strong>
            <p>Azərbaycan Təhsil İdarəetmə Sistemi</p>
            <p>Bu avtomatik göndərilən bildirişdir. Zəhmət olmasa cavab verməyin.</p>
            @if(isset($systemUrl))
                <p><a href="{{ $systemUrl }}" style="color: #007bff;">Sistemə daxil ol</a></p>
            @endif
        </div>
    </div>
</body>
</html>