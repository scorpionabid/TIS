import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { ProjectActivity, ProjectStats } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Activity,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectDashboardProps {
  stats: ProjectStats;
  activities?: ProjectActivity[];
  totalGoal?: string;
}

const STATUS_COLORS = [
  { name: "pending", color: "#f59e0b" }, // Amber
  { name: "in_progress", color: "#3b82f6" }, // Blue
  { name: "completed", color: "#10b981" }, // Emerald
  { name: "stuck", color: "#ef4444" }, // Red
];

export function ProjectDashboard({ stats, activities = [], totalGoal }: ProjectDashboardProps) {
  // Goal contribution cəmi
  const { goalSum, goalWarning, budgetWarning } = useMemo(() => {
    const topLevel = activities.filter(a => !a.parent_id);
    const sum = topLevel.reduce((acc, a) => acc + (a.goal_contribution_percentage || 0), 0);
    const gWarn = sum > 0 && Math.round(sum) !== 100;
    const bWarn = stats.total_budget > 0 && stats.overdue_count > 0;
    return { goalSum: Math.round(sum), goalWarning: gWarn, budgetWarning: bWarn };
  }, [activities, stats]);

  const pieData = Object.entries(stats.status_breakdown).map(([name, value]) => ({
    name: name === "pending" ? "Gözləyir" : 
          name === "in_progress" ? "İcradadır" :
          name === "completed" ? "Tamamlanıb" : "Problem var",
    value,
    originalName: name
  }));

  const barData = stats.owner_breakdown;

  return (
    <div className="space-y-6">
      {/* ── Xəbərdarlıqlar ── */}
      {(goalWarning || budgetWarning) && (
        <div className="flex flex-col gap-2">
          {goalWarning && (
            <div className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
              goalSum > 100
                ? 'bg-destructive/5 border-destructive/20 text-destructive'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            )}>
              <Target className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-xs">
                  Hədəf payı {goalSum > 100 ? '100%-i aşır' : '100%-ə çatmır'}
                </p>
                <p className="text-[11px] opacity-80">
                  Fəaliyyətlərin hədəf payları cəmi <strong>{goalSum}%</strong>-dir.
                  {goalSum > 100
                    ? ` ${goalSum - 100}% artıqdır — bölüşdürməni düzəldin.`
                    : ` ${100 - goalSum}% boş qalır — hədəf tam bölüşdürülməyib.`}
                </p>
              </div>
            </div>
          )}
          {budgetWarning && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-orange-50 border-orange-200 text-orange-800 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-xs">Büdcə riski mövcuddur</p>
                <p className="text-[11px] opacity-80">
                  <strong>{stats.overdue_count}</strong> gecikmiş fəaliyyət büdcəyə təsir edə bilər.
                  Ümumi planlaşdırılmış büdcə: <strong>{stats.total_budget.toLocaleString()} ₼</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Ümumi Tərəqqi" 
          value={`${stats.progress_percentage}%`} 
          description="Tamamlanmış işlərin faizi"
          icon={TrendingUp}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Ümumi Büdcə" 
          value={`${stats.total_budget} ₼`} 
          description="Planlaşdırılmış ümumi xərc"
          icon={DollarSign}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Gecikən İşlər" 
          value={stats.overdue_count} 
          description="Vaxtı keçmiş aktiv fəaliyyətlər"
          icon={AlertCircle}
          color="text-red-600"
          bgColor="bg-red-50"
          isAlert={stats.overdue_count > 0}
        />
        <StatCard 
          title="Effektivlik" 
          value={`${stats.efficiency}%`} 
          description="Plan vs Faktiki saatlar"
          icon={Activity}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Status Bölgüsü
            </CardTitle>
            <CardDescription className="text-xs">Fəaliyyətlərin cari vəziyyəti</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS.find(c => c.name === entry.originalName)?.color || "#8884d8"} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workload by Owner */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-primary" />
              İş Yükü (Əməkdaşlar üzrə)
            </CardTitle>
            <CardDescription className="text-xs">Tapşırıqların paylanması</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Breakdown */}
      <Card className="shadow-sm border-muted/60 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-lg font-bold tracking-tight">Saatlıq Analitika</h3>
              <p className="text-muted-foreground text-xs max-w-xs">
                Planlaşdırılmış <b>{stats.planned_hours} saatlıq</b> işin <b>{stats.actual_hours} saatı</b> (faktiki) tamamlanıb.
              </p>
            </div>
            
            <div className="flex items-center gap-12">
               <div className="text-center">
                  <div className="text-2xl font-black text-primary">{stats.planned_hours}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Plan Saat</div>
               </div>
               <div className="h-10 w-px bg-muted-foreground/20" />
               <div className="text-center">
                  <div className="text-2xl font-black text-emerald-600">{stats.actual_hours}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Faktiki Saat</div>
               </div>
               <div className="h-10 w-px bg-muted-foreground/20" />
               <div className="text-center">
                  <div className={cn("text-2xl font-black", stats.efficiency >= 100 ? "text-emerald-600" : "text-amber-600")}>
                    {stats.efficiency}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Effektivlik</div>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon, color, bgColor, isAlert }: any) {
  return (
    <Card className="relative overflow-hidden group border-muted/60 shadow-sm hover:shadow-md transition-all duration-300">
      <div className={cn("absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform", color)}>
        <Icon className="w-12 h-12" />
      </div>
      <CardContent className="p-4 h-28 flex flex-col justify-between relative z-10">
        <div className="flex items-center justify-between">
          <div className={cn("p-1.5 rounded-lg", bgColor)}>
            <Icon className={cn("w-3.5 h-3.5", color)} />
          </div>
          {isAlert && <Badge variant="destructive" className="animate-pulse h-4 text-[8px] px-1 font-bold">VACİB</Badge>}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{title}</h4>
          <div className="text-2xl font-black tracking-tighter leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {value}
          </div>
          <p className="text-[9px] text-muted-foreground/70 font-medium leading-none">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
