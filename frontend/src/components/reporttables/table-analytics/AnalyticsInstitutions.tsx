/**
 * AnalyticsInstitutions - Institutions list tab content
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ReportTableResponse } from '@/types/reportTable';

interface AnalyticsInstitutionsProps {
  responses: ReportTableResponse[];
}

export const AnalyticsInstitutions: React.FC<AnalyticsInstitutionsProps> = ({
  responses,
}) => {
  return (
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
            <tr key={response.id}>
              <td className="px-3 py-2">{response.institution?.name || 'Unknown'}</td>
              <td className="px-3 py-2">
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
              <td className="px-3 py-2 text-right">{response.rows?.length || 0}</td>
              <td className="px-3 py-2 text-right text-gray-500">
                {response.updated_at
                  ? new Date(response.updated_at).toLocaleDateString('az-AZ')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnalyticsInstitutions;
