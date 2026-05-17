import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Alert {
  school_id: number;
  name: string;
  rate?: number;
}

interface AttendanceAlertsProps {
  missingReports?: Alert[];
  lowAttendance?: Alert[];
  missingCount?: number;
}

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

export function AttendanceAlerts({ missingReports, lowAttendance, missingCount }: AttendanceAlertsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bildirişlər</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm">Məlumat göndərməyən məktəblər</h4>
          <div className="mt-2 space-y-1">
            {missingReports && missingReports.length > 0 ? (
              <>
                {missingReports.slice(0, 5).map((alert) => (
                  <div key={alert.school_id} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {alert.name}
                  </div>
                ))}
                {missingReports.length > 5 && (
                  <p className="text-[10px] text-muted-foreground italic">
                    və daha {missingReports.length - 5} məktəb...
                  </p>
                )}
              </>
            ) : missingCount ? (
              <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {missingCount} məktəbdən hesabat gözlənilir.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-green-600">Bütün məktəblər hesabat göndərib.</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm">Aşağı davamiyyət</h4>
          <div className="mt-2 space-y-1">
            {lowAttendance && lowAttendance.length > 0 ? (
              lowAttendance.slice(0, 5).map((alert) => (
                <div key={alert.school_id} className="flex items-center justify-between text-sm">
                  <span>{alert.name}</span>
                  <span className="font-semibold text-red-600">{formatPercent(alert.rate)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Aşağı davamiyyət müşahidə edilmir.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
