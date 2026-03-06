<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sorğu Cavabı Hesabatı</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 15px;
        }

        .header h1 {
            color: #0066cc;
            font-size: 20px;
            margin: 0;
        }

        .info-section {
            background-color: #f8f9fa;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border-left: 4px solid #0066cc;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: bold;
            color: #555;
            width: 150px;
        }

        .info-value {
            color: #333;
        }

        .questions-section {
            margin-top: 25px;
        }

        .questions-section h2 {
            color: #0066cc;
            font-size: 16px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }

        .question {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            background-color: #fff;
        }

        .question-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .question-answer {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 3px;
            margin-top: 8px;
            color: #555;
        }

        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            color: white;
        }

        .status-submitted { background-color: #6f42c1; }
        .status-approved { background-color: #28a745; }
        .status-rejected { background-color: #dc3545; }
        .status-draft { background-color: #ffc107; color: #333; }
        .status-in_progress { background-color: #007bff; }

        .progress-bar {
            background-color: #e9ecef;
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin-top: 5px;
        }

        .progress-fill {
            background-color: #28a745;
            height: 100%;
            transition: width 0.3s ease;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ATİS - Sorğu Cavabı Hesabatı</h1>
        <p style="margin: 5px 0; color: #666;">{{ $survey->title }}</p>
    </div>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Sorğu:</span>
            <span class="info-value">{{ $survey->title }}</span>
        </div>

        @if($survey->description)
        <div class="info-row">
            <span class="info-label">Təsvir:</span>
            <span class="info-value">{{ $survey->description }}</span>
        </div>
        @endif

        <div class="info-row">
            <span class="info-label">Cavabverən:</span>
            <span class="info-value">{{ $respondent->name ?? $respondent->username ?? 'Naməlum' }}</span>
        </div>

        @if($respondent->email)
        <div class="info-row">
            <span class="info-label">E-poçt:</span>
            <span class="info-value">{{ $respondent->email }}</span>
        </div>
        @endif

        <div class="info-row">
            <span class="info-label">Müəssisə:</span>
            <span class="info-value">{{ $institution->name ?? 'Naməlum' }}</span>
        </div>

        <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">
                <span class="status-badge status-{{ $response->status }}">
                    @switch($response->status)
                        @case('draft') Qaralama @break
                        @case('submitted') Göndərilmiş @break
                        @case('approved') Təsdiqlənmiş @break
                        @case('rejected') Rədd edilmiş @break
                        @case('in_progress') Davam edir @break
                        @default {{ $response->status }} @break
                    @endswitch
                </span>
            </span>
        </div>

        <div class="info-row">
            <span class="info-label">Tamamlanma:</span>
            <span class="info-value">
                {{ $response->progress_percentage }}%
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {{ $response->progress_percentage }}%"></div>
                </div>
            </span>
        </div>

        <div class="info-row">
            <span class="info-label">Göndərilmə tarixi:</span>
            <span class="info-value">{{ $response->submitted_at ? \Carbon\Carbon::parse($response->submitted_at)->format('d.m.Y H:i') : 'Hələ göndərilməyib' }}</span>
        </div>

        <div class="info-row">
            <span class="info-label">Hesabat tarixi:</span>
            <span class="info-value">{{ $generated_at->format('d.m.Y H:i') }}</span>
        </div>
    </div>

    <div class="questions-section">
        <h2>Sorğu Cavabları</h2>

        @if($survey->questions && count($survey->questions) > 0)
            @foreach($survey->questions as $question)
                <div class="question">
                    <div class="question-title">
                        {{ $loop->iteration }}. {{ $question->title }}
                    </div>

                    @if($question->description)
                        <div style="color: #666; font-size: 11px; margin-bottom: 8px;">
                            {{ $question->description }}
                        </div>
                    @endif

                    <div class="question-answer">
                        @php
                            $answer = $response->responses[$question->id] ?? null;
                        @endphp

                        @if($answer !== null && $answer !== '')
                            @if(is_array($answer))
                                @if($question->type === 'table_matrix')
                                    <table>
                                        @if(isset($question->table_headers) && is_array($question->table_headers))
                                            <thead>
                                                <tr>
                                                    <th>Sətir</th>
                                                    @foreach($question->table_headers as $header)
                                                        <th>{{ $header }}</th>
                                                    @endforeach
                                                </tr>
                                            </thead>
                                        @endif
                                        <tbody>
                                            @foreach($answer as $rowIndex => $rowData)
                                                <tr>
                                                    <td>{{ isset($question->table_rows[$rowIndex]) ? $question->table_rows[$rowIndex] : "Sətir " . ($rowIndex + 1) }}</td>
                                                    @if(is_array($rowData))
                                                        @foreach($rowData as $cellData)
                                                            <td>{{ $cellData }}</td>
                                                        @endforeach
                                                    @else
                                                        <td>{{ $rowData }}</td>
                                                    @endif
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                @else
                                    <ul style="margin: 0; padding-left: 20px;">
                                        @foreach($answer as $item)
                                            <li>{{ $item }}</li>
                                        @endforeach
                                    </ul>
                                @endif
                            @else
                                {{ $answer }}
                            @endif
                        @else
                            <em style="color: #999;">Cavab verilməyib</em>
                        @endif
                    </div>
                </div>
            @endforeach
        @else
            <p style="color: #666; font-style: italic;">Bu sorğuda sual tapılmadı.</p>
        @endif
    </div>

    <div class="footer">
        <p>Bu hesabat ATİS sistemi tərəfindən avtomatik yaradılmışdır.</p>
        <p>Yaradılma tarixi: {{ $generated_at->format('d.m.Y H:i:s') }}</p>
    </div>
</body>
</html>