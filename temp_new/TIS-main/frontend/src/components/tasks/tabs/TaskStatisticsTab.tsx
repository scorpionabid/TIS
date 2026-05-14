import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TaskStats } from '../TaskStatsWidget';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Users, BarChart2, LayoutDashboard, Download } from 'lucide-react';
import { exportEmployeePerformanceToExcel } from '@/utils/taskStatisticsExport';
import { Button } from '@/components/ui/button';
import { Task } from '@/services/tasks';

interface StatUser {
  id?: number;
  name?: string;
  first_name?: string;
  last_name?: string;
}

interface StatCurrentUser {
  id?: number | string;
}

interface TaskStatisticsTabProps {
  stats: TaskStats;
  tasks: Task[];
  assignedTasks?: Task[];
  availableUsers?: StatUser[];
  currentUser?: StatCurrentUser;
  startDate?: string;
  endDate?: string;
}

const COLORS = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#22c55e",
  overdue: "#ef4444",
  review: "#8b5cf6",
};

function filterByDate(list: Task[], startDate?: string, endDate?: string): Task[] {
  if (!startDate && !endDate) return list;
  return list.filter(t => {
    const d = t.created_at ? new Date(t.created_at) : null;
    if (!d) return true;
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });
}

export function TaskStatisticsTab({
  stats,
  tasks,
  assignedTasks,
  availableUsers = [],
  currentUser,
  startDate,
  endDate,
}: TaskStatisticsTabProps) {
  const currentUserId = Number(currentUser?.id);

  const getUserDisplayName = (u: StatUser | null | undefined): string => {
    if (!u) return 'Naməlum';
    if (u.name) return u.name;
    if (u.first_name || u.last_name) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Naməlum';
    }
    return 'Naməlum';
  };

  // Tarixə görə filterlənmiş tasks
  const filteredTasks = useMemo(
    () => filterByDate(tasks, startDate, endDate),
    [tasks, startDate, endDate]
  );

  // Tarixə görə filterlənmiş assigned tasks (assignedTasks varsa istifadə et, yoxsa tasks)
  const filteredAssignedTasks = useMemo(
    () => filterByDate(assignedTasks ?? tasks, startDate, endDate),
    [assignedTasks, tasks, startDate, endDate]
  );

  // Priority data for BarChart
  const priorityData = useMemo(() => [
    { name: 'Aşağı',  value: filteredTasks.filter(t => t.priority === 'low').length,    color: '#94a3b8' },
    { name: 'Orta',   value: filteredTasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Yüksək', value: filteredTasks.filter(t => t.priority === 'high').length,   color: '#f97316' },
    { name: 'Təcili', value: filteredTasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
  ], [filteredTasks]);

  // Status data for PieChart — server stats-dan (date filter yoxdursa), filterlənmiş tasks-dan (varsa)
  const statusData = useMemo(() => {
    const base = (startDate || endDate)
      ? {
          pending:     filteredTasks.filter(t => t.status === 'pending').length,
          in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
          completed:   filteredTasks.filter(t => t.status === 'completed').length,
          overdue:     filteredTasks.filter(t =>
            t.status !== 'completed' && t.status !== 'cancelled' && t.deadline && new Date(t.deadline) < new Date()
          ).length,
        }
      : stats;

    return [
      { name: 'Gözləyir',    value: base.pending,     color: COLORS.pending },
      { name: 'İcradadır',   value: base.in_progress, color: COLORS.in_progress },
      { name: 'Tamamlanıb',  value: base.completed,   color: COLORS.completed },
      { name: 'Gecikir',     value: base.overdue,     color: COLORS.overdue },
    ].filter(d => d.value > 0);
  }, [stats, filteredTasks, startDate, endDate]);

  // Personal stats
  const personalStats = useMemo(() => {
    const createdByMe = filteredTasks.filter(t => Number(t.created_by) === currentUserId);
    
    // If assignedTasks is passed explicitly, use it; otherwise filter the main tasks list
    const assignedToMe = (assignedTasks && assignedTasks.length > 0)
      ? filteredAssignedTasks
      : filteredTasks.filter(t =>
          t.assignments?.some(a => Number(a.assigned_user_id) === currentUserId) ||
          Number(t.assigned_to) === currentUserId
        );

    const aggregate = (list: Task[]) => ({
      total: list.length,
      completed:   list.filter(t => t.status === 'completed').length,
      in_progress: list.filter(t => t.status === 'in_progress').length,
      pending:     list.filter(t => t.status === 'pending').length,
      overdue:     list.filter(t =>
        t.status !== 'completed' && t.status !== 'cancelled' && t.deadline && new Date(t.deadline) < new Date()
      ).length,
    });

    return {
      created:  aggregate(createdByMe),
      assigned: aggregate(assignedToMe),
    };
  }, [filteredTasks, currentUserId]);

  // Employee performance table
  const employeeStats = useMemo(() => {
    const map = new Map<string, { name: string; overdue: number; pending: number; in_progress: number; completed: number; total: number }>();

    availableUsers.forEach(u => {
      const name = u.name || (u.first_name ? `${u.first_name} ${u.last_name}` : 'Naməlum');
      map.set(name, { name, overdue: 0, pending: 0, in_progress: 0, completed: 0, total: 0 });
    });

    filteredTasks.forEach(t => {
      (t.assignments || []).forEach(a => {
        const userObj = a.assignedUser || a.assigned_user;
        const userName = getUserDisplayName(userObj);
        const cur = map.get(userName) || { name: userName, overdue: 0, pending: 0, in_progress: 0, completed: 0, total: 0 };
        cur.total++;
        if (t.status === 'completed')   cur.completed++;
        else if (t.status === 'in_progress') cur.in_progress++;
        else if (t.status === 'pending')     cur.pending++;
        if (t.status !== 'completed' && t.status !== 'cancelled' && t.deadline && new Date(t.deadline) < new Date()) {
          cur.overdue++;
        }
        map.set(userName, cur);
      });
    });

    return Array.from(map.values())
      .filter(e => e.total > 0)
      .sort((a, b) => b.overdue - a.overdue || b.in_progress - a.in_progress || b.total - a.total);
  }, [filteredTasks, availableUsers]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">

      {/* Personal Dashboard Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mənim Statistikam</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Created by Me */}
          <Card className="border-indigo-100/50 shadow-sm bg-gradient-to-br from-white to-indigo-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Yaratdığım Tapşırıqlar</span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-100 text-indigo-600">
                  {personalStats.created.total} ədəd
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-black text-indigo-900 tabular-nums">{personalStats.created.total}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Cəmi tapşırıq</div>
                </div>
                <div className="flex gap-3 text-right">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-emerald-600">{personalStats.created.completed}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">BİTDİ</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-blue-600">{personalStats.created.in_progress}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">İCRADA</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-rose-600">{personalStats.created.overdue}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">GECİKİR</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(personalStats.created.completed / (personalStats.created.total || 1)) * 100}%` }} />
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(personalStats.created.in_progress / (personalStats.created.total || 1)) * 100}%` }} />
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${(personalStats.created.overdue / (personalStats.created.total || 1)) * 100}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Assigned to Me */}
          <Card className="border-amber-100/50 shadow-sm bg-gradient-to-br from-white to-amber-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Mənə Təyin Olunanlar</span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-100 text-amber-600">
                  {personalStats.assigned.total} ədəd
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-black text-amber-900 tabular-nums">{personalStats.assigned.total}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Həll edilməli</div>
                </div>
                <div className="flex gap-3 text-right">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-emerald-600">{personalStats.assigned.completed}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">İCRA OLUNDU</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-blue-600">{personalStats.assigned.in_progress}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">DAVAM EDİR</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-rose-600">{personalStats.assigned.overdue}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-400">GECİKƏN</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(personalStats.assigned.completed / (personalStats.assigned.total || 1)) * 100}%` }} />
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(personalStats.assigned.in_progress / (personalStats.assigned.total || 1)) * 100}%` }} />
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${(personalStats.assigned.overdue / (personalStats.assigned.total || 1)) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Global/Team Statistics Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ümumi Statistika (Müəssisə üzrə)</h2>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard title="Ümumi Tapşırıqlar" value={stats.total}       icon={<BarChart2 className="h-5 w-5 text-slate-500" />}  color="slate"   />
          <StatusCard title="İcradadır"          value={stats.in_progress} icon={<Clock className="h-5 w-5 text-blue-500" />}       color="blue"    />
          <StatusCard title="Tamamlanıb"         value={stats.completed}   icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} color="emerald" />
          <StatusCard title="Gecikmiş"           value={stats.overdue}     icon={<AlertCircle className="h-5 w-5 text-rose-500" />}  color="rose"    />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                Status üzrə paylanma
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    Məlumat yoxdur
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                Prioritet üzrə paylanma
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Performance Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-3 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Əməkdaşların icra vəziyyəti
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] uppercase font-bold gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => exportEmployeePerformanceToExcel(employeeStats, {
                  currentUser: currentUser as any,
                  startDate,
                  endDate
                })}
              >
                <Download className="h-3.5 w-3.5" />
                Ekspor (Excel)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-6 py-3 text-left">Əməkdaş</th>
                    <th className="px-4 py-3 text-center">Ümumi</th>
                    <th className="px-4 py-3 text-center text-slate-400">Gözləyir</th>
                    <th className="px-4 py-3 text-center text-blue-500">İcradadır</th>
                    <th className="px-4 py-3 text-center text-emerald-500">Tamamlanıb</th>
                    <th className="px-4 py-3 text-center text-rose-500">Gecikir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeStats.length > 0 ? employeeStats.map((emp, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{emp.name}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-700">{emp.total}</td>
                      <td className="px-4 py-4 text-center text-slate-400">{emp.pending > 0 ? emp.pending : '-'}</td>
                      <td className="px-4 py-4 text-center text-blue-600 font-medium">{emp.in_progress > 0 ? emp.in_progress : '-'}</td>
                      <td className="px-4 py-4 text-center text-emerald-600 font-medium">{emp.completed > 0 ? emp.completed : '-'}</td>
                      <td className="px-4 py-4 text-center">
                        {emp.overdue > 0 ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100">
                            {emp.overdue}
                          </Badge>
                        ) : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        Məlumat tapılmadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatusCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    slate:   "bg-slate-50 text-slate-700 border-slate-200",
    blue:    "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose:    "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <Card className={colorClasses[color]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase font-bold tracking-tight opacity-70">{title}</p>
            <p className="text-3xl font-black tabular-nums">{value}</p>
          </div>
          <div className="p-3 bg-white/50 rounded-xl shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
