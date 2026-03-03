/**
 * AnalyticsNonFillingSchools - Shows list of schools that haven't responded
 * This is crucial for admins to track which institutions need reminders
 */

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, School, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import type { ReportTable, ReportTableResponse } from '@/types/reportTable';
import { institutionService } from '@/services/institutions';

interface AnalyticsNonFillingSchoolsProps {
  table: ReportTable;
  responses: ReportTableResponse[];
}

interface Institution {
  id: number;
  name: string;
  parent?: {
    id: number;
    name: string;
  } | null;
}

export const AnalyticsNonFillingSchools: React.FC<AnalyticsNonFillingSchoolsProps> = ({
  table,
  responses,
}) => {
  // Get responded institution IDs
  const respondedIds = useMemo(() => new Set(responses.map((r) => r.institution_id)), [responses]);
  
  // Target institutions that haven't responded
  const targetInstitutions = table.target_institutions || [];
  const nonRespondingIds = useMemo(
    () => targetInstitutions.filter((id) => !respondedIds.has(id)),
    [targetInstitutions, respondedIds]
  );

  // Fetch institution details for non-responding schools
  const { data: institutionsData, isLoading } = useQuery({
    queryKey: ['institution-summaries', nonRespondingIds],
    queryFn: async () => {
      if (nonRespondingIds.length === 0) return {};
      return institutionService.getSummaries(nonRespondingIds);
    },
    enabled: nonRespondingIds.length > 0,
  });
  
  // Calculate statistics
  const totalTarget = targetInstitutions.length;
  const respondedCount = respondedIds.size;
  const nonRespondingCount = nonRespondingIds.length;
  const responseRate = totalTarget > 0 ? ((respondedCount / totalTarget) * 100).toFixed(1) : '0';

  // Helper to get institution name
  const getInstitutionName = (id: number): string => {
    const inst = institutionsData?.[id];
    return inst?.name || `Məktəb #${id}`;
  };

  const handleSendReminder = () => {
    toast.success('Xatırlatma göndərildi', {
      description: `${nonRespondingCount} məktəbə xatırlatma göndərildi.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <School className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">Hədəf məktəb</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalTarget}</p>
        </div>
        
        <div className="bg-emerald-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <School className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-gray-600">Cavab verən</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{respondedCount}</p>
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
          <p className="text-2xl font-bold text-amber-700">{responseRate}%</p>
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
            <Button size="sm" variant="outline" onClick={handleSendReminder} className="gap-1">
              <Mail className="h-3 w-3" />
              Xatırlatma göndər
            </Button>
          )}
        </div>
        
        {nonRespondingIds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <School className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
            <p className="font-medium text-emerald-700">Bütün məktəblər cavab verib!</p>
            <p className="text-sm mt-1">
              {totalTarget} məktəbdən {respondedCount} məktəb cədvəli doldurub.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">#</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Məktəb adı</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {nonRespondingIds.map((id, idx) => (
                  <tr key={id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 align-top">{idx + 1}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-gray-800 whitespace-normal break-words">
                        {getInstitutionName(id)}
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
