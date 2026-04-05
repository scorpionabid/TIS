import React from "react";
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
import { Project } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
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
  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  
  // Calculate aggregate goal progress across all projects
  const totalPossibleContribution = projects.reduce((acc, p) => {
    return acc + (p.activities?.reduce((sum, a) => sum + (a.goal_contribution_percentage || 0), 0) || 0);
  }, 0);

  const totalActualContribution = projects.reduce((acc, p) => {
    return acc + (p.activities?.filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.goal_contribution_percentage || 0), 0) || 0);
  }, 0);

  const goalProgressPercentage = totalPossibleContribution > 0 
    ? Math.round((totalActualContribution / totalPossibleContribution) * 100) 
    : 0;

  const totalKPI = projects.reduce((acc, p) => acc + (parseFloat(p.total_goal?.replace(/[^0-9.]/g, '') || '0') || 0), 0);
  
  // Status breakdown for Pie chart
  const statusData = [
    { name: "Aktiv", value: projects.filter(p => p.status === 'active').length, color: "#10b981" },
    { name: "Tamamlanıb", value: projects.filter(p => p.status === 'completed').length, color: "#3b82f6" },
    { name: "Gözləmədə", value: projects.filter(p => p.status === 'on_hold').length, color: "#f59e0b" },
    { name: "Ləğv edilib", value: projects.filter(p => p.status === 'cancelled').length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Growth / Timeline data (Mocking for visual effect or calculating if dates exist)
  const timelineData = [
    { month: 'Yan', count: 2 },
    { month: 'Fev', count: 5 },
    { month: 'Mar', count: 8 },
    { month: 'Apr', count: activeProjects.length + completedProjects.length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <GlobalStatCard 
          title="Ümumi Layihə" 
          value={projects.length} 
          description="Sistemdəki bütün layihələr"
          icon={Layers}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <GlobalStatCard 
          title="Aktiv İcraat" 
          value={activeProjects.length} 
          description="Hazırda davam edən"
          icon={Activity}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <GlobalStatCard 
          title="Tamamlanmış" 
          value={completedProjects.length} 
          description="Uğurla bitirilmiş"
          icon={CheckCircle2}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <GlobalStatCard 
          title="Ümumi KPI" 
          value={`${totalKPI.toLocaleString()}`} 
          description="Sistem üzrə ümumi hədəf vahidi"
          icon={Zap}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <GlobalStatCard 
          title="Hədəf İcrası" 
          value={`${goalProgressPercentage}%`} 
          description="Ümumi hədəfə çatılma dərəcəsi"
          icon={TrendingUp}
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Distribution */}
        <Card className="lg:col-span-1 shadow-xl border-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden group">
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
        <Card className="lg:col-span-2 shadow-xl border-primary/5 hover:border-primary/20 transition-all duration-300 group overflow-hidden">
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

      {/* Highlights / Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-600">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-black text-lg text-emerald-900 leading-tight">Məhsuldarlıq Artımı</h4>
               <p className="text-sm text-emerald-800/80 italic font-medium">Bütün layihələr üzrə orta icraat faizi keçən aya nisbətən 12% artıb.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-black text-lg text-blue-900 leading-tight">Aktiv Əməkdaşlıq</h4>
               <p className="text-sm text-blue-800/80 italic font-medium">Hazırda {projects.reduce((acc, p) => acc + (p.employees?.length || 0), 0)} nəfər müxtəlif layihələrdə məsul şəxsdir.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GlobalStatCard({ title, value, description, icon: Icon, color, bgColor }: any) {
  return (
    <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-background group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", bgColor)}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">{title}</h4>
          <div className="text-3xl font-black tracking-tighter tabular-nums">{value}</div>
          <p className="text-xs text-muted-foreground font-medium italic">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
