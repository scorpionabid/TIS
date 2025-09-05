import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Download, 
  FileSpreadsheet, 
  Calendar,
  Filter,
  School,
  Target,
  AlertTriangle
} from 'lucide-react';
import type { ExportFormData } from './hooks/useExcelImportExport';

interface ExportFormProps {
  exportForm: ExportFormData;
  setExportForm: (form: ExportFormData) => void;
  institutions: any[];
  assessmentTypes: any[];
  exporting: boolean;
  loadingData: boolean;
  validateExportForm: () => boolean;
  getGradeLevels: () => Array<{value: string, label: string}>;
  getFormatOptions: () => Array<{value: string, label: string}>;
  onExport: () => void;
}

export const ExportForm: React.FC<ExportFormProps> = ({
  exportForm,
  setExportForm,
  institutions,
  assessmentTypes,
  exporting,
  loadingData,
  validateExportForm,
  getGradeLevels,
  getFormatOptions,
  onExport
}) => {
  const handleFormChange = (field: keyof ExportFormData, value: string | number) => {
    setExportForm({
      ...exportForm,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            Export təlimatları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1. Addım:</strong> Export ediləcək məlumatların filtrlərini təyin edin</p>
            <p><strong>2. Addım:</strong> Export formatını seçin</p>
            <p><strong>3. Addım:</strong> Export edin və faylı yükləyin</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Excel, CSV və PDF formatları dəstəklənir
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export filtrlər
          </CardTitle>
          <CardDescription>
            Export ediləcək məlumatları filtrləyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Institution - Required */}
            <div className="space-y-2">
              <Label htmlFor="export-institution">
                Müəssisə <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={exportForm.institution_id.toString()} 
                onValueChange={(value) => handleFormChange('institution_id', parseInt(value))}
                disabled={loadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müəssisə seçin" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id.toString()}>
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4" />
                        {inst.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assessment Type - Optional */}
            <div className="space-y-2">
              <Label htmlFor="export-assessment-type">Qiymətləndirmə Növü</Label>
              <Select 
                value={exportForm.assessment_type_id.toString()} 
                onValueChange={(value) => handleFormChange('assessment_type_id', value === "" ? "" : parseInt(value))}
                disabled={loadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı (ixtiyari)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  {assessmentTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Level - Optional */}
            <div className="space-y-2">
              <Label htmlFor="export-grade">Sinif Səviyyəsi</Label>
              <Select 
                value={exportForm.grade_level} 
                onValueChange={(value) => handleFormChange('grade_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı (ixtiyari)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  {getGradeLevels().map(grade => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Name - Optional */}
            <div className="space-y-2">
              <Label htmlFor="export-class">Sinif Adı</Label>
              <Input
                id="export-class"
                value={exportForm.class_name}
                onChange={(e) => handleFormChange('class_name', e.target.value)}
                placeholder="məs. 9-A, 10-B (ixtiyari)"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="export-date-from">Başlanğıc Tarixi</Label>
              <Input
                id="export-date-from"
                type="date"
                value={exportForm.date_from}
                onChange={(e) => handleFormChange('date_from', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-date-to">Bitiş Tarixi</Label>
              <Input
                id="export-date-to"
                type="date"
                value={exportForm.date_to}
                onChange={(e) => handleFormChange('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export formatı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">Format seçin</Label>
              <Select 
                value={exportForm.format} 
                onValueChange={(value) => handleFormChange('format', value)}
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Format seçin" />
                </SelectTrigger>
                <SelectContent>
                  {getFormatOptions().map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-green-700">Excel (.xlsx)</div>
                <div className="text-muted-foreground mt-1">
                  Ən çox tövsiyə olunan format. Bütün məlumatları dəstəkləyir.
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-blue-700">CSV (.csv)</div>
                <div className="text-muted-foreground mt-1">
                  Sadə mətn formatı. Digər proqramlarla uyğunluq üçün.
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-red-700">PDF (.pdf)</div>
                <div className="text-muted-foreground mt-1">
                  Hesabat formatı. Çap və paylaşım üçün uyğundur.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Action */}
      <Card>
        <CardContent className="pt-6">
          {!validateExportForm() && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Tələb olunan sahələr:</span>
              </div>
              <ul className="mt-2 text-sm text-orange-600 space-y-1">
                {!exportForm.institution_id && <li>• Müəssisə seçin</li>}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Export ediləcək məlumatlar:
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">
                  Müəssisə: {institutions.find(i => i.id.toString() === exportForm.institution_id.toString())?.name || 'Seçilməyib'}
                </Badge>
                {exportForm.assessment_type_id && (
                  <Badge variant="outline">
                    Növ: {assessmentTypes.find(t => t.id.toString() === exportForm.assessment_type_id.toString())?.name}
                  </Badge>
                )}
                {exportForm.grade_level && (
                  <Badge variant="outline">
                    Sinif: {exportForm.grade_level}
                  </Badge>
                )}
                {(exportForm.date_from || exportForm.date_to) && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Tarix filtri
                  </Badge>
                )}
              </div>
            </div>
            
            <Button 
              onClick={onExport}
              disabled={!validateExportForm() || exporting}
              className="min-w-32"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Export edilir...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Et
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};