import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye,
  FileText,
  Users
} from 'lucide-react';
import type { ImportResult } from './hooks/useExcelImportExport';

interface ImportResultsDisplayProps {
  importResult: ImportResult;
  onClear: () => void;
}

export const ImportResultsDisplay: React.FC<ImportResultsDisplayProps> = ({
  importResult,
  onClear
}) => {
  const successRate = importResult.total_rows > 0 
    ? (importResult.successful_imports / importResult.total_rows * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            İmport Nəticəsi
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">
              {importResult.successful_imports}
            </div>
            <div className="text-sm text-green-600">Uğurlu</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700">
              {importResult.failed_imports}
            </div>
            <div className="text-sm text-red-600">Xətalı</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {importResult.total_rows}
            </div>
            <div className="text-sm text-blue-600">Ümumi</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-6 w-6 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {successRate}%
            </div>
            <div className="text-sm text-gray-600">Uğur nisbəti</div>
          </div>
        </div>

        {/* Success Message */}
        {importResult.failed_imports === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">İmport uğurla tamamlandı!</AlertTitle>
            <AlertDescription className="text-green-700">
              Bütün {importResult.successful_imports} məlumat uğurla import edildi. Heç bir xəta aşkar edilmədi.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">İmport qismən uğurlu</AlertTitle>
            <AlertDescription className="text-orange-700">
              {importResult.successful_imports} məlumat uğurla import edildi, 
              {importResult.failed_imports} məlumatda xəta aşkar edildi.
            </AlertDescription>
          </Alert>
        )}

        {/* Import Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              İmport ID: {importResult.import_id}
            </Badge>
          </div>

          {/* Error Details */}
          {importResult.errors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Aşkar edilən xətalar:
              </h4>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {importResult.errors.slice(0, 20).map((error, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs px-2 py-0">
                            Sətr {error.row}
                          </Badge>
                          {error.field && (
                            <Badge variant="outline" className="text-xs px-2 py-0">
                              {error.field}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-red-700 break-words">
                          {error.message}
                        </p>
                        {error.student_name && (
                          <p className="text-xs text-red-600 mt-1">
                            Şagird: {error.student_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {importResult.errors.length > 20 && (
                  <div className="text-center py-2">
                    <Badge variant="outline" className="text-xs">
                      və daha {importResult.errors.length - 20} xəta...
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {importResult.warnings && importResult.warnings.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Xəbərdarlıqlar:
              </h4>
              
              <div className="space-y-2">
                {importResult.warnings.map((warning, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="text-sm text-yellow-700">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            İmport prosesi tamamlandı
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClear}>
              Nəticəni Gizlət
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};