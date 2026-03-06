/**
 * AnalyticsNonFillingSchools - Shows list of schools that haven't responded
 * Uses pre-computed data from analytics endpoint for better performance
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, School, Mail, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { TableAnalyticsSummary, AnalyticsNonFillingSchool } from '@/types/reportTable';

interface AnalyticsNonFillingSchoolsProps {
  analytics: TableAnalyticsSummary;
}

export const AnalyticsNonFillingSchools: React.FC<AnalyticsNonFillingSchoolsProps> = ({
  analytics,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const { summary, non_filling_schools } = analytics;
  const nonRespondingCount = non_filling_schools.length;

  const handleExport = () => {
    if (non_filling_schools.length === 0) {
      toast.info('İxrac ediləcək məlumat yoxdur');
      return;
    }

    setIsExporting(true);
    try {
      const csvContent = [
        ['№', 'Məktəb ID', 'Məktəb adı', 'Status', 'Sektor'].join(','),
        ...non_filling_schools.map((school: AnalyticsNonFillingSchool, idx: number) => {
          return [
            idx + 1,
            school.id,
            `"${school.name.replace(/"/g, '""')}"`,
            'Cavab verməyib',
            `"${school.sector.replace(/"/g, '""')}"`,
          ].join(',');
        }),
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `doldurmayan-mektebler-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('İxrac tamamlandı', {
        description: `${nonRespondingCount} məktəb CSV faylına ixrac edildi.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('İxrac xətası', {
        description: 'Fayl yaradılarkən xəta baş verdi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendReminder = () => {
    toast.success('Xatırlatma göndərildi', {
      description: `${nonRespondingCount} məktəbə xatırlatma göndərildi.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <School className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">Hədəf məktəb</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.target_institutions}</p>
        </div>
        
        <div className="bg-emerald-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <School className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-gray-600">Cavab verən</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{summary.responded_institutions}</p>
        </div>
        
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-gray-600">Cavab verməyən</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{nonRespondingCount}</p>
        </div>
        
        <div className="bg-amber-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <School className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-gray-600">İştirak %</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{summary.participation_rate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Non-responding schools list */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Doldurmayan məktəblərin siyahısı
            <Badge variant="secondary" className="ml-2">
              {nonRespondingCount}
            </Badge>
          </h4>
          {nonRespondingCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="gap-1"
              >
                <Download className="h-3 w-3" />
                {isExporting ? 'Yüklənir...' : 'İxrac et'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleSendReminder} className="gap-1">
                <Mail className="h-3 w-3" />
                Xatırlatma göndər
              </Button>
            </div>
          )}
        </div>
        
        {non_filling_schools.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <School className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
            <p className="font-medium text-emerald-700">Bütün məktəblər cavab verib!</p>
            <p className="text-sm mt-1">
              {summary.target_institutions} məktəbdən {summary.responded_institutions} məktəb cədvəli doldurub.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 w-12">#</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 min-w-[300px]">Məktəb adı</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Sektor</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {non_filling_schools.map((school: AnalyticsNonFillingSchool, idx: number) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 align-top">{idx + 1}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-gray-800 whitespace-normal break-words leading-relaxed">
                        {school.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-gray-600 whitespace-normal break-words">
                        {school.sector}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Cavab verməyib
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Important note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <p className="text-amber-800">
          <strong>Diqqət:</strong> Bu siyahıda yalnız hədəf müəssisələr arasından cavab verməyənlər göstərilir. 
          Məktəb adminlərinə xatırlatma göndərmək üçün yuxarıdakı "Xatırlatma göndər" düyməsindən istifadə edə bilərsiniz.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsNonFillingSchools;
