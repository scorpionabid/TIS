import { Card, CardContent } from "@/components/ui/card";
import { Layers, Activity, Building, Users, Loader2 } from "lucide-react";

interface SectorStatisticsProps {
  stats: any;
  statsLoading: boolean;
}

export const SectorStatistics = ({ stats, statsLoading }: SectorStatisticsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Toplam Sektor</p>
              <p className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats.total_sectors
                )}
              </p>
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
              <p className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats.active_sectors
                )}
              </p>
              <p className="text-xs text-green-500">
                {Math.round((stats.active_sectors / stats.total_sectors) * 100)}% aktiv
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
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats.by_region.reduce((sum: number, region: any) => sum + region.total_institutions, 0).toLocaleString()
                )}
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
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats.by_region.reduce((sum: number, region: any) => sum + region.total_students, 0).toLocaleString()
                )}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};