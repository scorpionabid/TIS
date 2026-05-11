import React, { useState, useMemo, useEffect, memo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { regionAdminService } from "@/services/regionAdmin";
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Clock, 
  StickyNote, 
  Zap, 
  CheckSquare,
  Activity,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { ModernDashboardWrapper } from "./ModernDashboardWrapper";
import { ModernStatsCard } from "./ModernStatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "../skeletons";
import { format } from "date-fns";
import { az } from "date-fns/locale";

export const ModernRegionAdminDashboard = memo(() => {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["regionadmin", "dashboard"],
    queryFn: () => regionAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'meeting', time: '09:00', link: '' });
  
  const [myEvents, setMyEvents] = useState(() => {
    const saved = localStorage.getItem('tis_admin_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((e: any) => ({ ...e, date: new Date(e.date) }));
      } catch (e) { return []; }
    }
    return [
      { id: 1, date: new Date(), title: "Region Direktorları İclası", type: "meeting", time: "10:30", link: "" },
      { id: 2, date: new Date(), title: "Məktəb №14 Monitorinq", type: "visit", time: "14:00", link: "" }
    ];
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('tis_admin_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [newNote, setNewNote] = useState('');
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineNoteText, setInlineNoteText] = useState('');

  useEffect(() => {
    localStorage.setItem('tis_admin_events', JSON.stringify(myEvents));
  }, [myEvents]);

  useEffect(() => {
    localStorage.setItem('tis_admin_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDate) return;
    if (editingEvent) {
      setMyEvents(myEvents.map((e: any) => e.id === editingEvent.id ? { ...editingEvent, ...newEvent } : e));
      setEditingEvent(null);
    } else {
      setMyEvents([...myEvents, { id: Date.now(), date: selectedDate, ...newEvent }]);
    }
    setNewEvent({ title: '', type: 'meeting', time: '09:00', link: '' });
    setIsEventModalOpen(false);
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
    return myEvents.filter((e: any) => format(e.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
  }, [myEvents, selectedDate]);

  const activities = useMemo(() => [
    { type: 'task', action: 'Həftəlik hesabat təsdiqləndi', time: '10 dəq əvvəl', user: 'Region Admin' },
    { type: 'survey', action: 'Yeni monitorinq sorğusu yaradıldı', time: '1 saat əvvəl', user: 'Region Operator' },
    { type: 'report', action: 'Məktəb №5 məlumatları yeniləndi', time: '2 saat əvvəl', user: 'Sektor Admin' },
  ], []);

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-12 text-center glass-card rounded-3xl m-6 border-2 border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-destructive">Məlumatlar yüklənmədi</h2>
        <p className="text-muted-foreground mt-2 font-medium">Sistem API ilə əlaqə qura bilmir və ya verilənlərdə uyğunsuzluq var.</p>
        <div className="mt-6 p-4 bg-white/50 rounded-xl text-xs font-mono text-left overflow-auto max-w-md mx-auto border border-destructive/10">
          <span className="text-destructive font-bold">Texniki xəta:</span> {(error as any)?.message || "Naməlum xəta"}
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-6 rounded-xl gap-2 border-primary/20 hover:bg-primary/5"
        >
          <RotateCcw size={16} /> Yenidən yoxla
        </Button>
      </div>
    );
  }

  return (
    <ModernDashboardWrapper>
      {/* Compact Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <ModernStatsCard title="Məktəblər" value={dashboard?.overview?.schools?.total || dashboard?.schools?.total || 0} icon={Users} variant="primary" index={0} />
        <ModernStatsCard title="Şagirdlər" value={dashboard?.overview?.students?.total || dashboard?.students?.total || 0} icon={TrendingUp} variant="success" index={1} />
        <ModernStatsCard title="Müəllimlər" value={dashboard?.overview?.teachers?.total || dashboard?.teachers?.total || 0} icon={MapPin} variant="info" index={2} />
        <ModernStatsCard title="Tapşırıqlar" value={dashboard?.overview?.tasks?.active || dashboard?.tasks?.active || 0} icon={CheckSquare} variant="warning" index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Main Calendar View */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-card border-none modern-shadow rounded-3xl h-full overflow-hidden flex flex-col">
            <CardHeader className="border-b border-primary/5 bg-primary/5 flex flex-row items-center justify-between">
              <div><CardTitle className="text-2xl font-bold flex items-center gap-3"><CalendarIcon className="text-primary" size={28} />Region Admin Təqvimi</CardTitle><CardDescription>Tədbirlər və iclas planı</CardDescription></div>
              <Button onClick={() => setIsEventModalOpen(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20"><Plus size={18} />Tədbir əlavə et</Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="flex h-full min-h-[500px]">
                <div className="p-6 border-r border-primary/5 flex-1 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-3xl border-none shadow-none scale-110" modifiers={{ hasEvent: (date) => myEvents.some(e => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) }} modifiersClassNames={{ hasEvent: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full relative" }} />
                </div>
                <div className="w-80 p-6 bg-slate-50/50 dark:bg-slate-800/30">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">{selectedDate ? format(selectedDate, "d MMMM", { locale: az }) : "Günün Planı"}</h3>
                  <div className="space-y-4">
                    {dayEvents.length > 0 ? dayEvents.map((event: any) => (
                      <div key={event.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-primary/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", event.type === 'meeting' ? "bg-blue-500" : "bg-rose-500")} />
                        <div className="flex justify-between items-start mb-1"><p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Clock size={10} /> {event.time}</p><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setMyEvents(myEvents.filter((e:any)=>e.id!==event.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button></div></div>
                        <p className="text-sm font-bold leading-tight">{event.title}</p>
                      </div>
                    )) : <div className="py-12 text-center opacity-30"><CalendarIcon size={32} className="mx-auto mb-2" /><p className="text-xs">Tədbir yoxdur</p></div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Notes & Activity */}
        <motion.div className="flex flex-col gap-8 h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="glass-card border-none modern-shadow rounded-3xl overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center justify-between mb-4"><CardTitle className="text-xl flex items-center gap-2"><StickyNote size={20} className="text-primary" />Şəxsi Qeydlər</CardTitle><span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase">{notes.length} qeyd</span></div>
              <div className="relative w-full">
                <Input placeholder="Vacib qeyd yazın..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} className="rounded-2xl h-12 text-sm bg-white/50 border-primary/10 pl-4 pr-12 w-full shadow-inner" />
                <Button onClick={handleAddNote} className="absolute right-1 top-1 rounded-xl h-10 w-10 p-0 bg-primary shadow-lg"><Plus size={16} /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">{notes.map((note: any) => (
                <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("p-4 rounded-2xl border transition-all group relative", inlineEditingId === note.id ? "bg-white border-primary/30" : "bg-white/60 dark:bg-slate-900/40 border-primary/5 hover:border-primary/20")}>
                  {inlineEditingId === note.id ? (<div className="space-y-2"><textarea autoFocus className="w-full text-sm bg-transparent border-none focus:ring-0 resize-none min-h-[40px]" value={inlineNoteText} onChange={(e) => setInlineNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); } if (e.key === 'Escape') setInlineEditingId(null); }} /><div className="flex justify-end gap-2"><button onClick={() => setInlineEditingId(null)} className="text-[10px] text-muted-foreground">Ləğv et</button><button onClick={saveInlineEdit} className="text-[10px] font-bold text-primary">Saxla</button></div></div>) : (<div className="flex items-start justify-between gap-4"><p className="text-xs leading-relaxed flex-1">{note.text}</p><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setInlineEditingId(note.id); setInlineNoteText(note.text); }} className="p-1 text-primary hover:bg-primary/5 rounded"><Edit3 size={10} /></button><button onClick={() => setNotes(notes.filter((n:any)=>n.id!==note.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={10} /></button></div></div>)}
                </motion.div>
              ))}</AnimatePresence>
            </CardContent>
          </Card>

          <Card className="glass-card border-none modern-shadow rounded-3xl flex-1 flex flex-col overflow-hidden">
            <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Zap size={20} className="text-amber-500" />Son Fəaliyyətlər</CardTitle></CardHeader>
            <CardContent className="space-y-4 flex-1">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/10">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium leading-tight">{activity.action}</p><p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader><DialogTitle>Yeni Tədbir</DialogTitle><DialogDescription>Seçilmiş gün üçün plan daxil edin.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid gap-2"><Label>Başlıq</Label><Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="rounded-xl" /></div></div>
          <DialogFooter><Button onClick={handleAddEvent} className="rounded-xl">Yadda Saxla</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernDashboardWrapper>
  );
});

ModernRegionAdminDashboard.displayName = 'ModernRegionAdminDashboard';
