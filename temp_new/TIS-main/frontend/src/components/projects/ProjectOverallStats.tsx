import React, { useMemo } from "react";
import { motion } from "framer-motion";
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
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { Project, WorkloadStat, projectService } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Activity,
  Layers,
  Calendar,
  Zap,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectOverallStatsProps {
  projects: Project[];
}

export function ProjectOverallStats({ projects }: ProjectOverallStatsProps) {
  // Aggregate Stats
  const { activeProjects, completedProjects, totalKPI, goalProgressPercentage, statusData, timelineData } = useMemo(() => {
    const active = projects.filter(p => p.status === 'active');
    const completed = projects.filter(p => p.status === 'completed');
    
    const totalPossible = projects.reduce((acc, p) => {
      return acc + (p.activities?.reduce((sum, a) => sum + (a.goal_contribution_percentage || 0), 0) || 0);
    }, 0);

    const totalActual = projects.reduce((acc, p) => {
      return acc + (p.activities?.filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.goal_contribution_percentage || 0), 0) || 0);
    }, 0);

    const progress = totalPossible > 0 ? Math.round((totalActual / totalPossible) * 100) : 0;
    const kpi = projects.reduce((acc, p) => acc + (parseFloat(p.total_goal?.replace(/[^0-9.]/g, '') || '0') || 0), 0);
    
    const status = [
      { name: "Aktiv", value: active.length, color: "#10b981" },
      { name: "Tamamlanıb", value: completed.length, color: "#3b82f6" },
      { name: "Gözləmədə", value: projects.filter(p => p.status === 'on_hold').length, color: "#f59e0b" },
      { name: "Ləğv edilib", value: projects.filter(p => p.status === 'cancelled').length, color: "#ef4444" },
    ].filter(d => d.value > 0);

    const timeline = [
      { month: 'Yan', count: 2 },
      { month: 'Fev', count: 5 },
      { month: 'Mar', count: 8 },
      { month: 'Apr', count: active.length + completed.length },
    ];

    return {
      activeProjects: active,
      completedProjects: completed,
      totalKPI: kpi,
      goalProgressPercentage: progress,
      statusData: status,
      timelineData: timeline
    };
  }, [projects]);

  const { data: workloadData, isLoading: isWorkloadLoading } = useQuery({
    queryKey: ['projectWorkloadStats'],
    queryFn: () => projectService.getWorkloadStats()
  });

  return (
    <div className="space-y-8 py-2">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { title: "Ümumi Layihə", value: projects.length, description: "Sistemdəki bütün layihələr", icon: Layers, color: "text-primary", bgColor: "bg-primary/10" },
          { title: "Aktiv İcraat", value: activeProjects.length, description: "Hazırda davam edən", icon: Activity, color: "text-success", bgColor: "bg-success/10" },
          { title: "Tamamlanmış", value: completedProjects.length, description: "Uğurla bitirilmiş", icon: CheckCircle2, color: "text-primary", bgColor: "bg-primary/10" },
          { title: "Ümumi KPI", value: totalKPI.toLocaleString(), description: "Sistem üzrə ümumi hədəf vahidi", icon: Zap, color: "text-warning", bgColor: "bg-warning/10" },
          { title: "Hədəf İcrası", value: `${goalProgressPercentage}%`, description: "Ümumi hədəfə çatılma dərəcəsi", icon: TrendingUp, color: "text-accent-foreground", bgColor: "bg-accent/20" }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <GlobalStatCard {...item} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Distribution */}
        <Card className="lg:col-span-1 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-all duration-500 overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Status Bölgüsü
            </CardTitle>
            <CardDescription className="text-xs italic">Layihələrin cari vəziyyəti üzrə paylanma</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: '800' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Chart */}
        <Card className="lg:col-span-2 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-all duration-500 group overflow-hidden">
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full -ml-24 -mb-24 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Artım Dinamikası
            </CardTitle>
            <CardDescription className="text-xs italic">Aylıq üzrə layihə artımı</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} fontWeight={700} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} fontWeight={700} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       {/* Workload Analytics */}
      <Card className="shadow-2xl border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-all duration-500 group overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black flex items-center gap-2">
             <Users className="w-6 h-6 text-primary" />
             Əməkdaşların İş Yükü Analitikası
          </CardTitle>
          <CardDescription className="text-sm font-medium italic">Hər bir əməkdaş üzrə aktiv tapşırıqların paylanması</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isWorkloadLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center gap-4">
               <Skeleton className="h-full w-20" />
               <Skeleton className="h-full w-20" />
               <Skeleton className="h-full w-20" />
               <Skeleton className="h-full w-20" />
            </div>
          ) : (
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workloadData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={12} fontStyle="bold" axisLine={false} tickLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    fontSize={11} 
                    fontWeight={700}
                    width={150}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="in_progress" name="İcraatda" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="Gözləmədə" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="checking" name="Yoxlamada" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="stuck" name="Problem" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completed" name="Tamamlanıb" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Highlights / Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        <Card className="bg-success/5 border-success/20 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-background rounded-2xl shadow-sm text-success">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-bold text-lg leading-tight">Məhsuldarlıq Artımı</h4>
               <p className="text-sm text-muted-foreground">Bütün layihələr üzrə orta icraat faizi keçən aya nisbətən 12% artıb.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-background rounded-2xl shadow-sm text-primary">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-bold text-lg leading-tight">Aktiv Əməkdaşlıq</h4>
               <p className="text-sm text-muted-foreground">Hazırda {projects.reduce((acc, p) => acc + (p.employees?.length || 0), 0)} nəfər müxtəlif layihələrdə məsul şəxsdir.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GlobalStatCard({ title, value, description, icon: Icon, color, bgColor }: any) {
  return (
    <Card className="border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-card/40 backdrop-blur-md hover:bg-card/60 group rounded-2xl overflow-hidden relative">
      <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 rounded-full -mr-8 -mt-8", bgColor)} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-2xl transition-transform group-hover:rotate-12 group-hover:scale-110 duration-500", bgColor)}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
          <div className="text-3xl font-bold tabular-nums">{value}</div>
          <p className="text-[10px] text-muted-foreground font-medium italic opacity-70 group-hover:opacity-100 transition-opacity">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
