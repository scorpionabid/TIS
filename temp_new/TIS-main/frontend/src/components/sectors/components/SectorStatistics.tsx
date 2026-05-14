import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Activity, Building, Users, Loader2 } from 'lucide-react';

interface SectorStatisticsProps {
  statistics: any;
  isLoading: boolean;
}

export function SectorStatistics({ statistics, isLoading }: SectorStatisticsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-20 bg-secondary rounded mb-2"></div>
                  <div className="h-8 w-16 bg-secondary rounded"></div>
                </div>
                <div className="h-8 w-8 bg-secondary rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Toplam Sektor</p>
              <p className="text-2xl font-bold">{statistics.total_sectors}</p>
            </div>
            <Layers className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aktiv Sektor</p>
              <p className="text-2xl font-bold">{statistics.active_sectors}</p>
              <p className="text-xs text-green-500">
                {Math.round((statistics.active_sectors / statistics.total_sectors) * 100)}% aktiv
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Müəssisələr</p>
              <p className="text-2xl font-bold">
                {statistics.by_region.reduce((sum: number, region: any) => sum + region.total_institutions, 0).toLocaleString()}
              </p>
            </div>
            <Building className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Şagirdlər</p>
              <p className="text-2xl font-bold">
                {statistics.by_region.reduce((sum: number, region: any) => sum + region.total_students, 0).toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}