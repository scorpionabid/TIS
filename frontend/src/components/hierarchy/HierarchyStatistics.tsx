import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HierarchyStatistics, hierarchyService } from '@/services/hierarchy';
import { Building2, Users, CheckCircle, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

interface HierarchyStatisticsProps {
  statistics: HierarchyStatistics;
  loading?: boolean;
  className?: string;
}

export const HierarchyStatsCards: React.FC<HierarchyStatisticsProps> = ({
  statistics,
  loading = false,
  className,
}) => {
  const formatStats = hierarchyService.formatStatistics(statistics);
  const activePercentage = statistics.total_institutions > 0 
    ? (statistics.active_institutions / statistics.total_institutions) * 100 
    : 0;

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-md mr-4"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      {formatStats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 flex items-center justify-center rounded-md bg-muted mr-4`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const HierarchyBreakdown: React.FC<HierarchyStatisticsProps> = ({
  statistics,
  loading = false,
  className,
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePercentage = statistics.total_institutions > 0 
    ? (statistics.active_institutions / statistics.total_institutions) * 100 
    : 0;

  const inactiveCount = statistics.total_institutions - statistics.active_institutions;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* By Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Səviyyə üzrə Bölgü
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.by_level).map(([level, count]) => {
              const percentage = statistics.total_institutions > 0 
                ? (Number(count) / statistics.total_institutions) * 100 
                : 0;
              
              const levelNames: Record<string, string> = {
                '1': 'Nazirlik',
                '2': 'Regional İdarələr',
                '3': 'Sektorlar',
                '4': 'Məktəblər/Bağçalar',
                '5': 'Alt Bölmələr',
              };

              return (
                <div key={level} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {levelNames[level] || `Səviyyə ${level}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {count}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Növ üzrə Bölgü
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.by_type).map(([type, count]) => {
              const percentage = statistics.total_institutions > 0 
                ? (Number(count) / statistics.total_institutions) * 100 
                : 0;
              
              const displayName = hierarchyService.getTypeDisplayName(type);
              const icon = hierarchyService.getTypeIcon(type);

              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {count}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Aktivlik Statusu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Active Institutions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Aktiv Müəssisələr</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {statistics.active_institutions}
                  </span>
                  <Badge variant="outline" className="text-xs text-green-600">
                    {activePercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress value={activePercentage} className="h-2" />
            </div>

            {/* Inactive Institutions */}
            {inactiveCount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Qeyri-aktiv Müəssisələr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {inactiveCount}
                    </span>
                    <Badge variant="outline" className="text-xs text-amber-600">
                      {(100 - activePercentage).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={100 - activePercentage} className="h-2" />
              </div>
            )}

            {/* Summary */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Ümumi Effektivlik</span>
                <span className={`font-bold ${activePercentage >= 90 ? 'text-green-600' : 
                  activePercentage >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {activePercentage >= 90 ? 'Əla' : 
                   activePercentage >= 70 ? 'Yaxşı' : 'Təkmilləşdirmə lazım'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Sürətli Məlumatlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ən çox müəssisə növü</span>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  {(() => {
                    const entries = Object.entries(statistics?.by_type || {});
                    const mostCommonType = entries.length > 0 
                      ? entries.reduce((a, b) => Number(a[1]) > Number(b[1]) ? a : b)[0]
                      : 'school';
                    return hierarchyService.getTypeIcon(mostCommonType);
                  })()}
                </span>
                <span className="text-sm font-medium">
                  {(() => {
                    const entries = Object.entries(statistics?.by_type || {});
                    const mostCommonType = entries.length > 0 
                      ? entries.reduce((a, b) => Number(a[1]) > Number(b[1]) ? a : b)[0]
                      : 'school';
                    return hierarchyService.getTypeDisplayName(mostCommonType);
                  })()}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Hierarchy dərinliyi</span>
              <Badge variant="outline">
                {statistics.max_depth} səviyyə
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Orta aktivlik</span>
              <Badge 
                variant={activePercentage >= 90 ? 'default' : 'secondary'}
                className={activePercentage >= 90 ? 'bg-green-100 text-green-800' : ''}
              >
                {activePercentage.toFixed(1)}%
              </Badge>
            </div>

            {statistics.root_institutions > 1 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Kök müəssisələr</span>
                <Badge variant="outline">
                  {statistics.root_institutions}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HierarchyStatsCards;