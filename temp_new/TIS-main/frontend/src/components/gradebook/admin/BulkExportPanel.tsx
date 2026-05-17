import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { gradeBookAdminService, BulkExportParams } from '@/services/gradeBookAdmin';
import { AdminLevel } from '@/hooks/useGradeBookAdmin';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText, FileJson, Building2, GraduationCap, MapPin } from 'lucide-react';

interface BulkExportPanelProps {
  level: AdminLevel;
  regionId?: number | null;
  sectorId?: number | null;
}

export function BulkExportPanel({ level, regionId, sectorId }: BulkExportPanelProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [includeGrades, setIncludeGrades] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    try {
      setExporting(true);
      setProgress(0);

      const params: BulkExportParams = {
        level,
        format,
        region_id: regionId || undefined,
        sector_id: sectorId || undefined,
        include: [
          ...(includeGrades ? ['grades'] : []),
          ...(includeStats ? ['statistics'] : []),
          ...(includeAttendance ? ['attendance'] : []),
        ],
      };

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const blob = await gradeBookAdminService.bulkExport(params);

      clearInterval(progressInterval);
      setProgress(100);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const filename = `jurnal-export-${level}-${timestamp}.${extension}`;

      gradeBookAdminService.downloadExport(blob, filename);

      toast({
        title: 'Export tamamlandı',
        description: `${filename} faylı yükləndi`,
      });
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Options */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Export Parametrləri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Level Display */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {level === 'region' && <MapPin className="w-5 h-5 text-blue-600" />}
              {level === 'sector' && <Building2 className="w-5 h-5 text-emerald-600" />}
              {level === 'institution' && <GraduationCap className="w-5 h-5 text-purple-600" />}
              <div>
                <p className="font-medium">Səviyyə</p>
                <p className="text-sm text-slate-500">
                  {level === 'region' && 'Region'}
                  {level === 'sector' && 'Sektor'}
                  {level === 'institution' && 'Məktəb'}
                </p>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <div className="flex gap-2">
                <Button
                  variant={format === 'excel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('excel')}
                  className="flex-1 gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
                <Button
                  variant={format === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('csv')}
                  className="flex-1 gap-2"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Include Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Daxil et</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="grades"
                    checked={includeGrades}
                    onCheckedChange={(checked) => setIncludeGrades(checked as boolean)}
                  />
                  <label htmlFor="grades" className="text-sm">
                    Qiymətlər
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stats"
                    checked={includeStats}
                    onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
                  />
                  <label htmlFor="stats" className="text-sm">
                    Statistika
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="attendance"
                    checked={includeAttendance}
                    onCheckedChange={(checked) => setIncludeAttendance(checked as boolean)}
                  />
                  <label htmlFor="attendance" className="text-sm">
                    Davamiyyət
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Preview */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Səviyyə:</span>
                <Badge variant="secondary">
                  {level === 'region' && 'Region'}
                  {level === 'sector' && 'Sektor'}
                  {level === 'institution' && 'Məktəb'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Format:</span>
                <Badge variant="secondary">{format.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Məlumat:</span>
                <span className="text-sm">
                  {[
                    includeGrades && 'Qiymətlər',
                    includeStats && 'Statistika',
                    includeAttendance && 'Davamiyyət',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Heç biri'}
                </span>
              </div>
            </div>

            {exporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Export gedir...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={exporting || (!includeGrades && !includeStats && !includeAttendance)}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Export gedir...' : 'Export Başlat'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-slate-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Məlumat</p>
              <p className="text-sm text-blue-700 mt-1">
                Toplu export seçilmiş səviyyədəki bütün jurnalları əhatə edir.
                Excel formatı birdən çox səhifə ilə jurnalları ayrı-ayrılıqda göstərir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
