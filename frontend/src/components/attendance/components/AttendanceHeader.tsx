import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, School } from 'lucide-react';

interface AttendanceHeaderProps {
  currentUser: any;
  onRefresh: () => void;
  onExport?: () => void;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ 
  currentUser, 
  onRefresh, 
  onExport 
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isRegionAdmin = currentUser?.role === 'regionadmin';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-foreground">Davamiyyət Qeydiyyatı</h2>
          {currentUser?.institution && (
            <Badge variant="secondary" className="text-sm">
              <School className="h-3 w-3 mr-1" />
              {currentUser.institution.name}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Şagirdlərin davamiyyətini qeydə alın və izləyin
        </p>
        {currentUser?.role === 'məktəbadmin' && (
          <p className="text-xs text-blue-600 mt-1">
            💡 Sizin məktəbinizin şagirdləri üçün davamiyyət qeydiyyatı
          </p>
        )}
        {(isSuperAdmin || isRegionAdmin) && (
          <p className="text-xs text-green-600 mt-1">
            🌐 Bütün məktəblər üçün davamiyyət idarəetməsi və izləmə
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenilə
        </Button>
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
        )}
      </div>
    </div>
  );
};