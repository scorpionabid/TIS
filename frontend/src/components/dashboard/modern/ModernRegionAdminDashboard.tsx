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
  RotateCcw,
  Link as LinkIcon
} from "lucide-react";
import { ModernDashboardWrapper } from "./ModernDashboardWrapper";
import { ModernStatsCard } from "./ModernStatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      setMyEvents(myEvents.map((e: any) => e.id === editingEvent.id ? { ...e, ...newEvent } : e));
      setEditingEvent(null);
    } else {
      setMyEvents([...myEvents, { id: Date.now(), date: selectedDate, ...newEvent }]);
    }
    setNewEvent({ title: '', type: 'meeting', time: '09:00', link: '' });
    setIsEventModalOpen(false);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setNewEvent({ title: event.title, type: event.type, time: event.time, link: event.link || '' });
    setSelectedDate(event.date);
    setIsEventModalOpen(true);
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
        <p className="text-muted-foreground mt-2 font-medium">Sistem API ilə əlaqə qura bilmir.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6 rounded-xl gap-2"><RotateCcw size={16} /> Yenidən yoxla</Button>
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
        {/* Expanded Calendar View */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-card border-none modern-shadow rounded-[32px] h-full overflow-hidden flex flex-col min-h-[600px]">
            <CardHeader className="border-b border-primary/5 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4 p-8">
              <div>
                <CardTitle className="text-3xl font-black flex items-center gap-3"><CalendarIcon className="text-primary" size={32} />Region Admin Təqvimi</CardTitle>
                <CardDescription className="text-base">Mühüm tədbirlər, monitorinqlər və iclas planı</CardDescription>
              </div>
              <Button onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }} className="rounded-2xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-xl shadow-primary/20 h-14 px-8 text-lg font-bold">
                <Plus size={20} /> Tədbir əlavə et
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="flex flex-col md:flex-row h-full">
                <div className="p-10 border-r border-primary/5 flex-1 flex items-center justify-center bg-white/40 dark:bg-slate-900/40">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={setSelectedDate} 
                    className="rounded-3xl border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 p-8 scale-125"
                    modifiers={{ hasEvent: (date) => myEvents.some(e => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) }}
                    modifiersClassNames={{ hasEvent: "after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:bg-primary after:rounded-full relative" }}
                  />
                </div>
                <div className="w-full md:w-96 p-8 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">{selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: az }) : "Günün Planı"}</h3>
                    <Badge variant="outline" className="rounded-full px-3">{dayEvents.length} Tədbir</Badge>
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {dayEvents.length > 0 ? dayEvents.map((event: any) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={event.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-primary/10 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: event.type === 'meeting' ? '#3b82f6' : '#f43f5e' }}>
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Clock size={14} /> {event.time}</p>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditEvent(event)} className="p-1.5 text-primary hover:bg-primary/5 rounded-lg"><Edit3 size={14} /></button>
                            <button onClick={() => setMyEvents(myEvents.filter((e:any)=>e.id!==event.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-base font-black leading-tight mb-2">{event.title}</p>
                        {event.link && (
                          <a href={event.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                            <LinkIcon size={10} /> Linkə keçid
                          </a>
                        )}
                      </motion.div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 italic py-20 text-center">
                        <CalendarIcon size={64} className="mb-4" />
                        <p className="font-bold">Bu gün üçün planlaşdırılmış tədbir tapılmadı.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Notes & Activity */}
        <motion.div className="flex flex-col gap-8 h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="glass-card border-none modern-shadow rounded-[32px] overflow-hidden flex flex-col h-[450px]">
            <CardHeader className="pb-6 bg-gradient-to-r from-primary/10 to-transparent p-8">
              <div className="flex items-center justify-between mb-6">
                <CardTitle className="text-2xl font-black flex items-center gap-3"><StickyNote size={28} className="text-primary" />Şəxsi Qeydlər</CardTitle>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full font-black text-xs uppercase">{notes.length} qeyd</Badge>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <Input 
                  placeholder="Vacib qeydinizi buraya yazın..." 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} 
                  className="rounded-2xl h-14 text-base bg-white/50 border-primary/10 pl-6 shadow-inner flex-1" 
                />
                <Button 
                  onClick={handleAddNote} 
                  className="rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 px-8 shrink-0"
                >
                  <Plus size={18} /> QEYD ƏLAVƏ ET
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 p-8 pt-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">{notes.map((note: any) => (
                <motion.div key={note.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("p-5 rounded-2xl border transition-all group relative", inlineEditingId === note.id ? "bg-white border-primary/30 shadow-xl scale-[1.02]" : "bg-white/60 dark:bg-slate-900/40 border-primary/5 hover:border-primary/20 hover:shadow-md")}>
                  {inlineEditingId === note.id ? (
                    <div className="space-y-3">
                      <textarea autoFocus className="w-full text-base bg-transparent border-none focus:ring-0 resize-none min-h-[60px]" value={inlineNoteText} onChange={(e) => setInlineNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); } if (e.key === 'Escape') setInlineEditingId(null); }} />
                      <div className="flex justify-end gap-3 border-t pt-3"><button onClick={() => setInlineEditingId(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground">Ləğv et</button><button onClick={saveInlineEdit} className="text-xs font-black text-primary">Yadda saxla</button></div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold leading-relaxed flex-1 text-slate-700 dark:text-slate-200">{note.text}</p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setInlineEditingId(note.id); setInlineNoteText(note.text); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Edit3 size={14} /></button>
                        <button onClick={() => setNotes(notes.filter((n:any)=>n.id!==note.id))} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}</AnimatePresence>
            </CardContent>
          </Card>

          <Card className="glass-card border-none modern-shadow rounded-[32px] flex-1 flex flex-col overflow-hidden">
            <CardHeader className="p-8 pb-4"><CardTitle className="text-2xl font-black flex items-center gap-3"><Zap size={24} className="text-amber-500" />Son Fəaliyyətlər</CardTitle></CardHeader>
            <CardContent className="space-y-4 flex-1 p-8 pt-0 overflow-y-auto custom-scrollbar">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-[24px] bg-muted/20 border border-transparent hover:border-primary/10 transition-all hover:bg-muted/30">
                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-black leading-tight text-slate-800 dark:text-slate-100">{activity.action}</p><p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-tighter">{activity.time}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] glass-card border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black">{editingEvent ? 'Tədbiri Redaktə Et' : 'Yeni Tədbir'}</DialogTitle>
            <DialogDescription className="text-base font-medium">Planlaşdırılan tədbir məlumatlarını daxil edin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Tədbirin Başlığı</Label>
              <Input placeholder="Məs: Region Direktorları İclası..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="rounded-2xl h-14 text-base" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Saat</Label>
                <Input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="rounded-2xl h-14" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Tədbir Növü</Label>
                <select className="flex h-14 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20" value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                  <option value="meeting">İclas</option>
                  <option value="visit">Monitorinq</option>
                  <option value="other">Digər</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Keçid Linki (Könüllü)</Label>
              <div className="relative">
                <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="https://..." value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="rounded-2xl h-14 pl-12" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddEvent} className="w-full rounded-2xl h-16 text-lg font-black shadow-2xl shadow-primary/30 uppercase tracking-widest">
              {editingEvent ? 'DƏYİŞİKLİKLƏRİ YADDA SAXLA' : 'TƏDBİRİ TƏSDİQLƏ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernDashboardWrapper>
  );
});

ModernRegionAdminDashboard.displayName = 'ModernRegionAdminDashboard';
