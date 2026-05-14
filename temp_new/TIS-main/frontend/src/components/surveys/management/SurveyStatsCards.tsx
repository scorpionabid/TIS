import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Calendar, TrendingUp } from 'lucide-react';

interface SurveyStats {
  total: number;
  active: number;
  thisMonth: number;
  totalResponses: number;
}

interface SurveyStatsCardsProps {
  stats: SurveyStats;
}

export function SurveyStatsCards({ stats }: SurveyStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aktiv Sorğular</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bu ay yaradılan</p>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
            </div>
            <Calendar className="h-8 w-8 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ümumi sorğular</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ümumi cavablar</p>
              <p className="text-2xl font-bold">{stats.totalResponses}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
