<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Şifrə Sıfırlama Tələbi</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 300;
        }
        .header .subtitle {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: #34495e;
        }
        .reset-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff !important;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            transition: all 0.3s ease;
        }
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 25px 0;
        }
        .security-notice .icon {
            color: #856404;
            font-weight: bold;
        }
        .security-notice .text {
            color: #856404;
            font-size: 14px;
            margin-top: 5px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
            text-align: center;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .link-text {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
            border: 1px solid #e9ecef;
        }
        .institution-info {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🔐 Şifrə Sıfırlama</h1>
            <p class="subtitle">Azərbaycan Təhsil İdarəetmə Sistemi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Salam {{ $notification['user_name'] ?? 'İstifadəçi' }},
            </div>
            
            @if(isset($notification['metadata']['institution_name']))
            <div class="institution-info">
                <strong>🏫 Müəssisə:</strong> {{ $notification['metadata']['institution_name'] }}
            </div>
            @endif
            
            <div class="message">
                ATİS sistemində hesabınız üçün şifrə sıfırlama tələbi daxil olub. 
                Şifrənizi dəyişmək üçün aşağıdakı düyməyə basın:
            </div>
            
            <div class="button-container">
                <a href="{{ $notification['metadata']['reset_url'] }}" class="reset-button">
                    🔑 Şifrəni Yenilə
                </a>
            </div>
            
            <div class="security-notice">
                <div class="icon">⚠️ Təhlükəsizlik bildirişi:</div>
                <div class="text">
                    • Bu link yalnız <strong>1 saat</strong> ərzində keçərlidir<br>
                    • Link vaxtı: {{ $notification['metadata']['expires_at'] ? \Carbon\Carbon::parse($notification['metadata']['expires_at'])->format('d.m.Y H:i') : '' }}<br>
                    • Əgər şifrə sıfırlama tələbi etməmisinizsə, bu emaili nəzərə almayın<br>
                    • Şübhəli fəaliyyət halında dərhal sistem inzibatçısı ilə əlaqə saxlayın
                </div>
            </div>
            
            <div class="message">
                Düymə işləməzsə, aşağıdakı linki brauzerinizə kopyalayın:
            </div>
            
            <div class="link-text">
                {{ $notification['metadata']['reset_url'] }}
            </div>
        </div>
        
        <div class="footer">
            <p>© {{ date('Y') }} {{ config('app.name') }}. Bütün hüquqlar qorunur.</p>
            <p>Bu email avtomatik göndərilir. Zəhmət olmasa cavab verməyin.</p>
            <p>Email ünvanı: {{ $notification['metadata']['user_email'] ?? '' }}</p>
        </div>
    </div>
</body>
</html>