import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle,
  Info,
  School,
  Target
} from 'lucide-react';
import { FileUpload } from './FileUpload';
import type { ImportFormData } from './hooks/useExcelImportExport';

interface ImportFormProps {
  importForm: ImportFormData;
  setImportForm: (form: ImportFormData) => void;
  institutions: any[];
  assessmentTypes: any[];
  selectedFile: File | null;
  importing: boolean;
  loadingData: boolean;
  validateImportForm: () => boolean;
  getGradeLevels: () => Array<{value: string, label: string}>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadTemplate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const ImportForm: React.FC<ImportFormProps> = ({
  importForm,
  setImportForm,
  institutions,
  assessmentTypes,
  selectedFile,
  importing,
  loadingData,
  validateImportForm,
  getGradeLevels,
  onFileSelect,
  onImport,
  onDownloadTemplate,
  fileInputRef
}) => {
  const handleFormChange = (field: keyof ImportFormData, value: string | number) => {
    setImportForm({
      ...importForm,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            İmport təlimatları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1. Addım:</strong> Excel şablonunu yükləyin və məlumatlarınızı doldurun</p>
            <p><strong>2. Addım:</strong> Müəssisə və qiymətləndirmə növünü seçin</p>
            <p><strong>3. Addım:</strong> Doldurulmuş Excel faylını seçin və import edin</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Excel Şablonunu Yüklə
            </Button>
            <Badge variant="secondary" className="text-xs">
              .xlsx formatı tövsiyə olunur
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            İmport konfiqurasiyası
          </CardTitle>
          <CardDescription>
            İmport ediləcək məlumatların parametrlərini təyin edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Institution */}
            <div className="space-y-2">
              <Label htmlFor="import-institution">
                Müəssisə <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={importForm.institution_id.toString()} 
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

            {/* Assessment Type */}
            <div className="space-y-2">
              <Label htmlFor="import-assessment-type">
                Qiymətləndirmə Növü <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={importForm.assessment_type_id.toString()} 
                onValueChange={(value) => handleFormChange('assessment_type_id', parseInt(value))}
                disabled={loadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Növ seçin" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Level */}
            <div className="space-y-2">
              <Label htmlFor="import-grade">Sinif Səviyyəsi</Label>
              <Select 
                value={importForm.grade_level} 
                onValueChange={(value) => handleFormChange('grade_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin (ixtiyari)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Hamısı</SelectItem>
                  {getGradeLevels().map(grade => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Name */}
            <div className="space-y-2">
              <Label htmlFor="import-class">Sinif Adı</Label>
              <Input
                id="import-class"
                value={importForm.class_name}
                onChange={(e) => handleFormChange('class_name', e.target.value)}
                placeholder="məs. 9-A, 10-B (ixtiyari)"
              />
            </div>

            {/* Assessment Date */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="import-date">
                Qiymətləndirmə Tarixi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="import-date"
                type="date"
                value={importForm.assessment_date}
                onChange={(e) => handleFormChange('assessment_date', e.target.value)}
                className="w-full md:w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <FileUpload
        selectedFile={selectedFile}
        onFileSelect={onFileSelect}
        fileInputRef={fileInputRef}
        accept=".xlsx,.xls,.csv"
        disabled={importing}
      />

      {/* Import Action */}
      <Card>
        <CardContent className="pt-6">
          {!validateImportForm() && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Tələb olunan sahələr:</span>
              </div>
              <ul className="mt-2 text-sm text-orange-600 space-y-1">
                {!importForm.institution_id && <li>• Müəssisə seçin</li>}
                {!importForm.assessment_type_id && <li>• Qiymətləndirmə növü seçin</li>}
                {!selectedFile && <li>• Excel faylını seçin</li>}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <Badge variant="outline">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              )}
            </div>
            
            <Button 
              onClick={onImport}
              disabled={!validateImportForm() || importing}
              className="min-w-32"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  İmport edilir...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  İmport Et
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};