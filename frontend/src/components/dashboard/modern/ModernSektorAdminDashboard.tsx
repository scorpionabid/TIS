import React, { memo, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { 
  School, 
  GraduationCap, 
  Users, 
  ListChecks, 
  AlertCircle,
  Zap,
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  Clock,
  ExternalLink,
  Edit3,
  StickyNote,
  CheckSquare
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModernDashboardWrapper } from "./ModernDashboardWrapper";
import { ModernStatsCard } from "./ModernStatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "../skeletons";
import { format } from "date-fns";
import { az } from "date-fns/locale";

interface SektorDashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  activeSurveys: number;
  overdueTasks: number;
  sektorInfo: {
    name: string;
    region: string;
  };
  recentActivities: any[];
  schoolsList: any[];
}

export const ModernSektorAdminDashboard = memo(() => {
  const navigate = useNavigate();
  
  const {
    data: stats,
    isLoading,
    error
  } = useQuery<SektorDashboardStats>({
    queryKey: ["sektoradmin-dashboard"],
    queryFn: async () => {
      const response = await dashboardService.getSektorAdminStats();
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data as SektorDashboardStats;
      }
      return response as SektorDashboardStats;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Calendar & Events State
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<any>(null);
  const [newEvent, setNewEvent] = React.useState({ title: '', type: 'monitoring', time: '09:00', link: '' });
  
  const [myEvents, setMyEvents] = React.useState(() => {
    const saved = localStorage.getItem('tis_sektor_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((e: any) => ({ ...e, date: new Date(e.date) }));
      } catch (e) { return []; }
    }
    return [
      { id: 1, date: new Date(), title: "Məktəb monitorinqi (№12)", type: "monitoring", time: "10:00", link: "" },
      { id: 2, date: new Date(), title: "Direktorlar şurası iclası", type: "meeting", time: "15:00", link: "" }
    ];
  });

  // Notes State
  const [notes, setNotes] = React.useState(() => {
    const saved = localStorage.getItem('tis_sektor_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [newNote, setNewNote] = React.useState('');
  const [inlineEditingId, setInlineEditingId] = React.useState<number | null>(null);
  const [inlineNoteText, setInlineNoteText] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('tis_sektor_events', JSON.stringify(myEvents));
  }, [myEvents]);

  React.useEffect(() => {
    localStorage.setItem('tis_sektor_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDate) return;
    if (editingEvent) {
      setMyEvents(myEvents.map((e: any) => e.id === editingEvent.id ? { ...editingEvent, ...newEvent } : e));
      setEditingEvent(null);
    } else {
      setMyEvents([...myEvents, { id: Date.now(), date: selectedDate, ...newEvent }]);
    }
    setNewEvent({ title: '', type: 'monitoring', time: '09:00', link: '' });
    setIsEventModalOpen(false);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setNewEvent({ title: event.title, type: event.type, time: event.time, link: event.link || '' });
    setSelectedDate(event.date);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (id: number) => {
    setMyEvents(myEvents.filter((e: any) => e.id !== id));
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes([{ id: Date.now(), text: newNote }, ...notes]);
    setNewNote('');
  };

  const saveInlineEdit = () => {
    if (!inlineNoteText.trim()) return;
    setNotes(notes.map((n: any) => n.id === inlineEditingId ? { ...n, text: inlineNoteText } : n));
    setInlineEditingId(null);
  };

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return myEvents.filter((e: any) => 
      format(e.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );
  }, [myEvents, selectedDate]);

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-12 text-center glass-card rounded-3xl m-6">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-destructive">Xəta baş verdi</h2>
        <p className="text-muted-foreground mt-2">Məlumatları yükləmək mümkün olmadı.</p>
      </div>
    );
  }

  return (
    <ModernDashboardWrapper showGreeting={true}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8">
        <ModernStatsCard title="Məktəblər" value={stats?.totalSchools || 0} icon={School} trend={{ value: 0, isPositive: true }} color="blue" />
        <ModernStatsCard title="Şagirdlər" value={stats?.totalStudents || 0} icon={GraduationCap} trend={{ value: 0, isPositive: true }} color="emerald" />
        <ModernStatsCard title="Müəllimlər" value={stats?.totalTeachers || 0} icon={Users} trend={{ value: 0, isPositive: true }} color="violet" />
        <ModernStatsCard title="Sorğular" value={stats?.activeSurveys || 0} icon={ListChecks} trend={{ value: 0, isPositive: true }} color="amber" />
      </div>

      <Dialog open={isEventModalOpen} onOpenChange={(open) => {
        setIsEventModalOpen(open);
        if (!open) {
          setEditingEvent(null);
          setNewEvent({ title: '', type: 'monitoring', time: '09:00', link: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Hadisəni Redaktə Edin' : 'Yeni Hadisə Yaradın'}</DialogTitle>
            <DialogDescription>{selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: az }) : ""} üçün plan nizamlayın.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="title">Başlıq</Label><Input id="title" placeholder="Hadisənin adı..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="rounded-xl" /></div>
            <div className="grid gap-2"><Label htmlFor="link">Link (istəyə bağlı)</Label><Input id="link" placeholder="https://..." value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="time">Saat</Label><Input id="time" type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="rounded-xl" /></div>
              <div className="grid gap-2"><Label htmlFor="type">Növ</Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                  <option value="monitoring">Monitorinq</option>
                  <option value="meeting">İclas</option>
                  <option value="deadline">Son Tarix</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEventModalOpen(false)} className="rounded-xl">Ləğv Et</Button><Button onClick={handleAddEvent} className="rounded-xl">Yadda Saxla</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-card border-none modern-shadow rounded-3xl h-full overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-primary/5 flex flex-row items-center justify-between">
              <div><CardTitle className="text-2xl font-bold flex items-center gap-3"><CalendarIcon className="text-primary" size={28} />Sektor İdarəetmə Təqvimi</CardTitle><CardDescription>Monitorinqlər və məktəb hesabatları</CardDescription></div>
              <Button onClick={() => setIsEventModalOpen(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20"><Plus size={18} />Tədbir əlavə et</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row h-full min-h-[500px]">
                <div className="p-6 border-r border-primary/5 flex-1 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-3xl border-none shadow-none scale-110 md:scale-125" modifiers={{ hasEvent: (date) => myEvents.some(e => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) }} modifiersClassNames={{ hasEvent: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full relative" }} />
                </div>
                <div className="w-full md:w-80 p-6 bg-slate-50/50 dark:bg-slate-800/30">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">{selectedDate ? format(selectedDate, "d MMMM", { locale: az }) : "Seçilmiş Gün"}</h3>
                  <div className="space-y-4">
                    {dayEvents.length > 0 ? dayEvents.map((event: any) => (
                      <div key={event.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-primary/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", event.type === 'monitoring' ? "bg-amber-500" : "bg-blue-500")} />
                        <div className="flex justify-between items-start mb-1"><p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Clock size={10} /> {event.time}</p><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditEvent(event)} className="p-1 text-primary hover:bg-primary/5 rounded"><Edit3 size={12} /></button><button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button></div></div>
                        <p className="text-sm font-bold leading-tight mb-2">{event.title}</p>
                        {event.link && <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">Keçid <ExternalLink size={10} /></a>}
                      </div>
                    )) : <div className="py-12 text-center opacity-30"><CalendarIcon size={32} className="mx-auto mb-2" /><p className="text-xs">Plan tapılmadı</p></div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="glass-card border-none modern-shadow rounded-3xl overflow-hidden flex flex-col max-h-[400px]">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center justify-between mb-4"><CardTitle className="text-xl flex items-center gap-2"><StickyNote size={20} className="text-primary" />Şəxsi Qeydlər</CardTitle><span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase">{notes.length} qeyd</span></div>
              <div className="relative w-full">
                <Input placeholder="Vacib qeyd yazın..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} className="rounded-2xl h-12 text-sm bg-white/50 border-primary/10 pl-4 pr-12 w-full shadow-inner" />
                <Button size="sm" onClick={handleAddNote} className="absolute right-1 top-1 rounded-xl h-10 w-10 p-0 bg-primary hover:bg-primary/90 shadow-lg"><Plus size={16} /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">{notes.map((note: any) => (
                <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("p-4 rounded-2xl border transition-all group relative", inlineEditingId === note.id ? "bg-white border-primary/30" : "bg-white/60 dark:bg-slate-900/40 border-primary/5 hover:border-primary/20")}>
                  {inlineEditingId === note.id ? (<div className="space-y-2"><textarea autoFocus className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none min-h-[40px]" value={inlineNoteText} onChange={(e) => setInlineNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); } if (e.key === 'Escape') setInlineEditingId(null); }} /><div className="flex justify-end gap-2"><button onClick={() => setInlineEditingId(null)} className="text-[10px] text-muted-foreground">Ləğv et</button><button onClick={saveInlineEdit} className="text-[10px] font-bold text-primary">Saxla</button></div></div>) : (<div className="flex items-start justify-between gap-4"><p className="text-xs leading-relaxed flex-1">{note.text}</p><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setInlineEditingId(note.id); setInlineNoteText(note.text); }} className="p-1 text-primary hover:bg-primary/5 rounded"><Edit3 size={10} /></button><button onClick={() => handleDeleteNote(note.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={10} /></button></div></div>)}
                </motion.div>
              ))}</AnimatePresence>
            </CardContent>
          </Card>

          <Card className="glass-card border-none modern-shadow rounded-3xl h-full flex flex-col min-h-[300px]">
            <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Zap size={20} className="text-amber-500" />Sektor Fəaliyyəti</CardTitle></CardHeader>
            <CardContent className="space-y-4 flex-1">
              {(stats?.recentActivities ?? []).slice(0, 5).map((activity: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/10">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium leading-tight">{activity.title}</p><p className="text-[10px] text-muted-foreground mt-1">{activity.time || 'İndicə'}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ModernDashboardWrapper>
  );
});

ModernSektorAdminDashboard.displayName = 'ModernSektorAdminDashboard';
