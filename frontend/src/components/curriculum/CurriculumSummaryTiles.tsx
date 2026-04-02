import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, CheckCircle2, AlertCircle, PieChart, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, icon, color, description, trend }: CardProps) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
    slate: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900/50',
  };

  const iconBgMap = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/50',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/50',
    amber: 'bg-amber-100 dark:bg-amber-900/50',
    rose: 'bg-rose-100 dark:bg-rose-900/50',
    slate: 'bg-slate-100 dark:bg-slate-900/50',
  };

  return (
    <Card className="overflow-hidden border-none shadow-premium bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 transition-all hover:translate-y-[-2px] hover:shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {value}
            </h3>
            {description && (
              <p className="text-xs text-slate-400 font-medium">{description}</p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}>
                {trend.value}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-2xl", iconBgMap[color])}>
            {React.cloneElement(icon as React.ReactElement, { size: 24, className: cn("stroke-[2.5px]", colorMap[color].split(' ')[1]) })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CurriculumSummaryTiles = ({ 
  stats, 
  vacantStats, 
  grandTotal 
}: { 
  stats: any, 
  vacantStats: any, 
  grandTotal: any 
}) => {
  // Split Master Hours (Stats)
  const masterMain = (stats?.total || 0) - (stats?.dernek || 0);
  const masterClub = stats?.dernek || 0;

  // Split Actual Hours (Grand Total)
  const factMain = (grandTotal?.total || 0) - (grandTotal?.club || 0);
  const factClub = grandTotal?.club || 0;

  // Vacancy Split
  const vs = vacantStats || { 
    c2: { tot: 0, ass: 0 }, c3: { tot: 0, ass: 0 }, c4: { tot: 0, ass: 0 }, 
    c5: { tot: 0, ass: 0 }, c6: { tot: 0, ass: 0 }, dernek: { tot: 0, ass: 0 } 
  };

  const assTotal = (vs.c2?.ass || 0) + (vs.c3?.ass || 0) + (vs.c4?.ass || 0) + (vs.c5?.ass || 0) + (vs.c6?.ass || 0) + (vs.dernek?.ass || 0);
  const vacantMain = (vs.c2?.tot || 0) + (vs.c3?.tot || 0) + (vs.c4?.tot || 0) + (vs.c5?.tot || 0) + (vs.c6?.tot || 0) - 
                     ((vs.c2?.ass || 0) + (vs.c3?.ass || 0) + (vs.c4?.ass || 0) + (vs.c5?.ass || 0) + (vs.c6?.ass || 0));
  const vacantClub = (vs.dernek?.tot || 0) - (vs.dernek?.ass || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title="Tədris Planı (Cəmi)" 
        value={masterMain.toFixed(1)} 
        icon={<Target />} 
        color="indigo"
        description="Plan üzrə saatlar"
        {...(masterClub > 0 ? { trend: { value: `+ ${masterClub.toFixed(1)} dərnək`, isPositive: true } } : {})}
      />
      <StatCard 
        title="Faktiki Bölgü" 
        value={factMain.toFixed(1)} 
        icon={<CheckCircle2 />} 
        color="emerald"
        description="Təyin edilmiş saatlar"
        {...(factClub > 0 ? { trend: { value: `+ ${factClub.toFixed(1)} dərnək`, isPositive: true } } : {})}
      />
      <StatCard 
        title="Müəllim Yükü (Cəmi)" 
        value={assTotal.toFixed(1)} 
        icon={<PieChart />} 
        color="amber"
        description="Müəllimlərə verilən dərs"
      />
      <StatCard 
        title="Vakansiya" 
        value={vacantMain.toFixed(1)} 
        icon={<AlertCircle />} 
        color="rose"
        description="Qalan saatlar"
        {...(vacantClub > 0 ? { trend: { value: `+ ${vacantClub.toFixed(1)} dərnək`, isPositive: false } } : {})}
      />
    </div>
  );
};
