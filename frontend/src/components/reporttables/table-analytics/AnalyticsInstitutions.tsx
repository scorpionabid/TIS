/**
 * AnalyticsInstitutions - Institutions list tab content
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, BarChart3 } from 'lucide-react';
import type { ReportTableResponse, ReportTable } from '@/types/reportTable';

interface AnalyticsInstitutionsProps {
  responses: ReportTableResponse[];
  table: ReportTable;
}

export const AnalyticsInstitutions: React.FC<AnalyticsInstitutionsProps> = ({
  responses,
  table,
}) => {
  // Calculate statistics
  const totalRows = responses.reduce((sum, r) => sum + (r.rows?.length || 0), 0);
  const submittedCount = responses.filter(r => r.status === 'submitted').length;
  const draftCount = responses.filter(r => r.status === 'draft').length;

  if (responses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-gray-600">Hələ cavab yoxdur</p>
        <p className="text-sm mt-1">
          Bu cədvələ hələ heç bir məktəb cavab verməyib.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">Ümumi cavab</p>
          <p className="text-xl font-bold text-blue-700">{responses.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">Göndərilib</p>
          <p className="text-xl font-bold text-emerald-700">{submittedCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">Qaralama</p>
          <p className="text-xl font-bold text-amber-700">{draftCount}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
          <p className="text-xs text-purple-600 mb-1">Ümumi sətir</p>
          <p className="text-xl font-bold text-purple-700">{totalRows}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Müəssisə</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Sətir sayı</th>
              <th className="px-3 py-2 text-right">Son yeniləmə</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {responses.map((response) => (
              <tr key={response.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 align-top">
                  <p className="font-medium text-gray-800 whitespace-normal break-words">
                    {response.institution?.name || 'Unknown'}
                  </p>
                </td>
                <td className="px-3 py-2 align-top">
                  <Badge
                    variant={response.status === 'submitted' ? 'default' : 'secondary'}
                    className={
                      response.status === 'submitted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ''
                    }
                  >
                    {response.status === 'submitted' ? 'Göndərilib' : 'Qaralama'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
                    {response.rows?.length || 0}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-500 align-top">
                  {response.updated_at
                    ? new Date(response.updated_at).toLocaleDateString('az-AZ')
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsInstitutions;
