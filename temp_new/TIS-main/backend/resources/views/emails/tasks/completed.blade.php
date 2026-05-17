<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tapşırıq Tamamlandı</title>
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
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #10b981;
        }
        .logo {
            font-size: 22px;
            font-weight: bold;
            color: #10b981;
        }
        h1 {
            color: #1f2937;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #f9fafb;
            border-radius: 6px;
            overflow: hidden;
        }
        .info-table th, .info-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-table th {
            background-color: #f3f4f6;
            color: #4b5563;
            font-weight: 600;
            width: 120px;
        }
        .success-box {
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #065f46;
        }
        .signature {
            margin-top: 30px;
            font-size: 14px;
            color: #4b5563;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Tapşırıq Tamamlandı</div>
        </div>

        <h1>Salam {{ $userName }},</h1>

        <p>Tapşırıqla bağlı aşağıdakı məlumatları nəzərdən keçirin:</p>

        <table class="info-table">
            <tr>
                <th>Tapşırıq</th>
                <td>{{ $taskTitle }}</td>
            </tr>
            <tr>
                <th>Son tarix</th>
                <td>{{ $deadline }}</td>
            </tr>
        </table>

        <div class="success-box">
            <strong>Təşəkkür edirik:</strong> Təyin edilmiş tapşırıq uğurla tamamlanmışdır. İcranı məsuliyyətlə həyata keçirdiyiniz üçün təşəkkür edirik!
        </div>

        <div class="signature">
            <p>Uğurlar!</p>
            <p><strong>Tapşırıq Meneceri</strong><br>
            Şəki-Zaqatala Regional Təhsil İdarəsi</p>
        </div>

        <div class="footer">
            <p>Bu email avtomatik olaraq ATİS sistemindən göndərilib.</p>
        </div>
    </div>
</body>
</html>
