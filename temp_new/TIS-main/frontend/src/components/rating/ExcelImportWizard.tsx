/**
 * ExcelImportWizard Component
 *
 * 3-tab wizard for importing teacher rating data from Excel
 * Supports: Awards, Certificates, Academic Results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  Medal,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { importService } from '../../services/teacherRating';
import type { ImportDataType, ImportResult } from '../../types/teacherRating';

interface ExcelImportWizardProps {
  onImportComplete?: (result: ImportResult) => void;
}

type ImportStatus = 'idle' | 'uploading' | 'success' | 'error';

interface TabState {
  file: File | null;
  status: ImportStatus;
  result: ImportResult | null;
  error: string | null;
  progress: number;
}

export function ExcelImportWizard({ onImportComplete }: ExcelImportWizardProps) {
  const [activeTab, setActiveTab] = useState<ImportDataType>('awards');
  const [tabStates, setTabStates] = useState<Record<ImportDataType, TabState>>({
    awards: { file: null, status: 'idle', result: null, error: null, progress: 0 },
    certificates: { file: null, status: 'idle', result: null, error: null, progress: 0 },
    'academic-results': { file: null, status: 'idle', result: null, error: null, progress: 0 },
  });

  const tabConfig = {
    awards: {
      label: 'Mükafatlar',
      icon: Award,
      color: 'red',
      description: 'Müəllim mükafatlarını Excel faylından idxal edin',
      columns: ['UTIS Kod', 'Mükafat Növü', 'Mükafat Tarixi', 'Təsvir', 'Təsdiqlənib'],
    },
    certificates: {
      label: 'Sertifikatlar',
      icon: Medal,
      color: 'pink',
      description: 'Müəllim sertifikatlarını Excel faylından idxal edin',
      columns: ['UTIS Kod', 'Sertifikat Növü', 'Verilmə Tarixi', 'Təşkilat', 'Təsvir', 'Təsdiqlənib'],
    },
    'academic-results': {
      label: 'Akademik Nəticələr',
      icon: BookOpen,
      color: 'blue',
      description: 'Müəllim akademik nəticələrini Excel faylından idxal edin',
      columns: ['UTIS Kod', 'Tədris İli', 'Fənn', 'Orta Qiymət', 'Uğur Faizi', 'Tələbə Sayı'],
    },
  };

  const handleFileSelect = (type: ImportDataType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      setTabStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error: 'Yalnız .xlsx və ya .xls formatında fayllar qəbul edilir',
          status: 'error',
        },
      }));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setTabStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error: 'Fayl ölçüsü 10MB-dan çox ola bilməz',
          status: 'error',
        },
      }));
      return;
    }

    setTabStates((prev) => ({
      ...prev,
      [type]: {
        file,
        status: 'idle',
        result: null,
        error: null,
        progress: 0,
      },
    }));
  };

  const handleUpload = async (type: ImportDataType) => {
    const tabState = tabStates[type];
    if (!tabState.file) return;

    setTabStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], status: 'uploading', progress: 0, error: null },
    }));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setTabStates((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            progress: Math.min(prev[type].progress + 10, 90),
          },
        }));
      }, 200);

      const response = await importService.importData(type, tabState.file);

      clearInterval(progressInterval);

      setTabStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'success',
          result: response.data,
          progress: 100,
        },
      }));

      onImportComplete?.(response.data);
    } catch (error: any) {
      setTabStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'error',
          error: error.response?.data?.message || 'İdxal zamanı xəta baş verdi',
          progress: 0,
        },
      }));
    }
  };

  const handleDownloadTemplate = async (type: ImportDataType) => {
    try {
      const blob = await importService.downloadTemplate(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Template download error:', error);
    }
  };

  const handleReset = (type: ImportDataType) => {
    setTabStates((prev) => ({
      ...prev,
      [type]: {
        file: null,
        status: 'idle',
        result: null,
        error: null,
        progress: 0,
      },
    }));
  };

  const renderTabContent = (type: ImportDataType) => {
    const config = tabConfig[type];
    const state = tabStates[type];
    const Icon = config.icon;

    return (
      <div className="space-y-6">
        {/* Description */}
        <Alert>
          <Icon className="h-4 w-4" />
          <AlertDescription>{config.description}</AlertDescription>
        </Alert>

        {/* Template Download */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Şablon Yüklə</CardTitle>
            <CardDescription>
              Excel şablonunu yükləyin və lazımi məlumatları doldurun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleDownloadTemplate(type)}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel Şablonunu Yüklə
            </Button>

            <div className="mt-4 text-sm text-muted-foreground">
              <div className="font-medium mb-2">Şablon sütunları:</div>
              <div className="flex flex-wrap gap-2">
                {config.columns.map((col) => (
                  <Badge key={col} variant="secondary">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Fayl Seç</CardTitle>
            <CardDescription>
              Doldurulmuş Excel faylını seçin (.xlsx və ya .xls)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id={`file-input-${type}`}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(type, e)}
                disabled={state.status === 'uploading'}
              />
              <label
                htmlFor={`file-input-${type}`}
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                {state.file ? (
                  <div className="space-y-1">
                    <p className="font-medium">{state.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(state.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">Fayl seçmək üçün klikləyin</p>
                    <p className="text-sm text-muted-foreground">
                      və ya faylı bu sahəyə sürüyün
                    </p>
                  </>
                )}
              </label>
            </div>

            {state.file && state.status !== 'uploading' && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleUpload(type)}>
                  <Upload className="h-4 w-4 mr-2" />
                  İdxal Et
                </Button>
                <Button variant="outline" onClick={() => handleReset(type)}>
                  Sıfırla
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {state.status === 'uploading' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">İdxal edilir...</span>
                  <span className="text-sm text-muted-foreground">{state.progress}%</span>
                </div>
                <Progress value={state.progress} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fayl yüklənir və emal edilir</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Result */}
        {state.status === 'success' && state.result && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-green-900">İdxal uğurla tamamlandı!</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Uğurlu:</span>{' '}
                    <span className="font-medium text-green-700">
                      {state.result.successful_rows}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uğursuz:</span>{' '}
                    <span className="font-medium text-red-700">{state.result.failed_rows}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ümumi:</span>{' '}
                    <span className="font-medium">{state.result.total_rows}</span>
                  </div>
                </div>

                {state.result.errors && state.result.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Xətalar:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {state.result.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                          Sətir {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {state.status === 'error' && state.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">İdxal zamanı xəta baş verdi</p>
              <p className="text-sm mt-1">{state.error}</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel İdxal Sihirbazı</CardTitle>
        <CardDescription>
          Müəllim reytinq məlumatlarını Excel fayllarından idxal edin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportDataType)}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(tabConfig).map(([key, config]) => {
              const Icon = config.icon;
              const state = tabStates[key as ImportDataType];
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}
                  {state.status === 'success' && <CheckCircle className="h-3 w-3 text-green-600" />}
                  {state.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(tabConfig).map((key) => (
            <TabsContent key={key} value={key} className="mt-6">
              {renderTabContent(key as ImportDataType)}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
