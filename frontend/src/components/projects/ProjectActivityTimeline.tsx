import React, { useMemo, useEffect, useRef } from "react";
import { 
  format, 
  addDays, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isToday,
  isWeekend
} from "date-fns";
import { az } from "date-fns/locale";
import { ProjectActivity } from "@/services/projects";
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, MessageSquare, Clock, Target as TargetIcon, CornerDownRight } from "lucide-react";

// ── Mətn render köməkçiləri ───────────────────────────────────────────────
function renderContent(text: string | null | undefined): string {
  if (!text) return '';
  if (/<[a-zA-Z]/.test(text)) return text;
  return legacyMarkdownToHtml(text);
}

function legacyMarkdownToHtml(text: string): string {
  if (!text) return '';
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');
  const out: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listTag) { out.push(`</${listTag}>`); listTag = null; } };
  for (const line of lines) {
    const bm = line.match(/^- (.*)$/);
    const nm = line.match(/^\d+\. (.*)$/);
    if (bm) {
      if (listTag === 'ol') closeList();
      if (!listTag) { out.push('<ul style="list-style-type:disc;padding-left:1.1rem;margin:2px 0">'); listTag = 'ul'; }
      out.push(`<li>${bm[1]}</li>`);
    } else if (nm) {
      if (listTag === 'ul') closeList();
      if (!listTag) { out.push('<ol style="list-style-type:decimal;padding-left:1.1rem;margin:2px 0">'); listTag = 'ol'; }
      out.push(`<li>${nm[1]}</li>`);
    } else {
      closeList();
      out.push(line.length ? `${line}<br>` : '<br>');
    }
  }
  closeList();
  return out.join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n<>]+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/<br>$/, '');
}

interface ProjectActivityTimelineProps {
  activities: ProjectActivity[];
}

const STATUS_COLORS = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  checking: "bg-purple-500",
  completed: "bg-emerald-500",
  stuck: "bg-red-500",
};

export function ProjectActivityTimeline({ activities }: ProjectActivityTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine date range for the timeline
  const { startDate, endDate, days } = useMemo(() => {
    const now = new Date();
    if (activities.length === 0) {
      const start = startOfMonth(now);
      const end = endOfMonth(addDays(now, 30));
      return { startDate: start, endDate: end, days: eachDayOfInterval({ start, end }) };
    }

    const startDates = activities.map(a => a.start_date ? new Date(a.start_date) : now).filter(d => !isNaN(d.getTime()));
    const endDates = activities.map(a => a.end_date ? new Date(a.end_date) : now).filter(d => !isNaN(d.getTime()));
    
    // Always include Today in the scope
    startDates.push(now);
    endDates.push(now);
    
    let start = new Date(Math.min(...startDates.map(d => d.getTime())));
    let end = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    // Add padding
    start = addDays(start, -7);
    end = addDays(end, 14);

    // If interval is too short, expand it
    if (differenceInDays(end, start) < 31) {
      end = addDays(start, 31);
    }

    return { 
      startDate: start, 
      endDate: end, 
      days: eachDayOfInterval({ start, end }) 
    };
  }, [activities]);

  const months = useMemo(() => {
    const monthGroups: { month: Date; daysCount: number }[] = [];
    if (days.length === 0) return monthGroups;

    let currentMonth = startOfMonth(days[0]);
    let count = 0;

    days.forEach((day, index) => {
      if (index > 0 && (day.getMonth() !== days[index - 1].getMonth() || day.getFullYear() !== days[index - 1].getFullYear())) {
        monthGroups.push({ month: currentMonth, daysCount: count });
        currentMonth = startOfMonth(day);
        count = 1;
      } else {
        count++;
      }
    });

    monthGroups.push({ month: currentMonth, daysCount: count });
    return monthGroups;
  }, [days]);

  const calculatePosition = (dateStr?: string | Date) => {
    if (!dateStr) return 0;
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return Math.max(0, differenceInDays(date, startDate));
  };

  const calculateWidth = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    return Math.max(1, differenceInDays(end, start) + 1);
  };

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      const today = new Date();
      const todayPos = calculatePosition(today);
      const scrollPos = (todayPos * 40) - (scrollContainerRef.current.clientWidth / 2) + 150;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        const today = new Date();
        const todayPos = calculatePosition(today);
        const scrollPos = (todayPos * 40) - (scrollContainerRef.current.clientWidth / 2) + 150;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPos);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [startDate, activities.length]);

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card shadow-xl overflow-hidden flex flex-col h-[320px] sm:h-[450px] md:h-[600px] relative">
        {/* Floating Action Button */}
        <div className="absolute right-6 bottom-16 z-50">
          <Button 
            onClick={scrollToToday}
            className="rounded-full shadow-2xl h-12 px-6 gap-2 bg-primary hover:scale-105 active:scale-95 transition-all text-white font-bold border-2 border-white dark:border-gray-800"
          >
            <TargetIcon className="w-5 h-5" /> Bugün
          </Button>
        </div>

        {/* Main Scrollable Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-muted/5 scroll-smooth"
        >
          <div className="min-w-max relative flex flex-col">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-40 flex flex-col shadow-md">
              {/* Month Header Row */}
              <div className="flex bg-background/95 backdrop-blur-sm border-b">
                <div className="sticky left-0 z-50 w-[120px] sm:w-[200px] md:w-[300px] min-w-[120px] sm:min-w-[200px] md:min-w-[300px] bg-background border-r p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 h-10 flex items-center">
                  Təqvim / Aylar
                </div>
                <div className="flex">
                  {months.map((m, idx) => (
                    <div 
                      key={idx} 
                      className="border-r py-2 px-4 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 flex items-center"
                      style={{ width: `${m.daysCount * 40}px` }}
                    >
                      {format(m.month, "MMMM yyyy", { locale: az })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Header Row */}
              <div className="flex bg-background/90 backdrop-blur-sm border-b">
                <div className="sticky left-0 z-50 w-[120px] sm:w-[200px] md:w-[300px] min-w-[120px] sm:min-w-[200px] md:min-w-[300px] bg-background border-r p-4 font-black text-xs uppercase tracking-widest text-muted-foreground h-14 flex items-start">
                  Fəaliyyət / İcraçı
                </div>
                <div className="flex">
                  {days.map((day) => {
                    const isStartOfMonth = day.getDate() === 1;
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "min-w-[40px] w-[40px] border-r flex flex-col items-center justify-center py-2 transition-colors h-14",
                          isToday(day) && "bg-primary/10",
                          isWeekend(day) && "bg-muted/10",
                          isStartOfMonth && "border-l-2 border-l-primary/30"
                        )}
                      >
                        <span className="text-[9px] font-bold text-muted-foreground/70">{format(day, "eee", { locale: az })}</span>
                        <span className={cn("text-[11px] font-black", isToday(day) && "text-primary")}>{format(day, "d")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BODY ROWS */}
            <div className="flex flex-col">
              {activities.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground opacity-50 flex flex-col items-center gap-4">
                  <Clock className="w-12 h-12 animate-pulse" />
                  <p className="font-bold">Heç bir fəaliyyət tapılmadı.</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const startPos = calculatePosition(activity.start_date);
                  const widthDays = calculateWidth(activity.start_date, activity.end_date);
                  const hasDates = !!activity.start_date && !!activity.end_date;

                  return (
                    <div 
                      key={activity.id} 
                      className={cn(
                        "flex border-b group hover:bg-primary/[0.02] transition-colors h-16",
                        activity.parent_id && "bg-[#f5f8fe]/60 dark:bg-[#141b2d]/20"
                      )}
                    >
                      {/* Fixed Left Column */}
                      <div className={cn(
                        "sticky left-0 z-20 w-[120px] sm:w-[200px] md:w-[300px] min-w-[120px] sm:min-w-[200px] md:min-w-[300px] border-r p-3 flex items-center gap-3 shadow-[4px_0_10px_rgba(0,0,0,0.02)]",
                        activity.parent_id ? "bg-[#f5f8fe] dark:bg-[#141b2d] pl-6 sm:pl-9" : "bg-background"
                      )}>
                        {activity.parent_id && <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                        <div className={cn("w-1.5 h-8 rounded-full shrink-0 shadow-sm", STATUS_COLORS[activity.status])} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span 
                                className="text-xs font-bold truncate group-hover:text-primary transition-colors cursor-pointer" 
                                dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} 
                              />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3 max-w-[300px] bg-popover text-popover-foreground border shadow-xl rounded-lg">
                              <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                                  {activity.parent_id ? "Alt fəaliyyət" : "Fəaliyyət"}
                                </div>
                                <div className="text-xs font-bold whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />
                                {activity.parentName && (
                                  <div className="text-[9px] text-muted-foreground mt-1">
                                    Əsas: <span className="font-semibold" dangerouslySetInnerHTML={{ __html: renderContent(activity.parentName) }} />
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              {activity.employee ? (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4 border">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.employee.name}`} />
                                    <AvatarFallback>U</AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[60px] sm:max-w-[100px]">{activity.employee.name}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/60 italic">Məsul yoxdur</span>
                              )}
                            </div>
                            {!hasDates && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-200 bg-amber-50 text-amber-700 shrink-0">
                                Tarix yoxdur
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Canvas */}
                      <div className="flex relative items-center">
                        {/* Grid */}
                        {days.map((day) => (
                          <div 
                            key={day.toISOString()} 
                            className={cn(
                              "min-w-[40px] w-[40px] h-full border-r transition-colors",
                              isToday(day) && "bg-primary/[0.03]",
                              isWeekend(day) && "bg-muted/5",
                              day.getDate() === 1 && "border-l-2 border-l-primary/5",
                              activity.parent_id && "bg-[#f5f8fe]/40 dark:bg-[#141b2d]/10"
                            )} 
                          />
                        ))}

                        {/* Bar */}
                        {hasDates && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={cn(
                                  "absolute h-9 rounded-lg shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:brightness-110 flex items-center px-4 gap-2 overflow-hidden border border-white/20 whitespace-nowrap",
                                  STATUS_COLORS[activity.status]
                                )}
                                style={{ 
                                  left: `${startPos * 40}px`, 
                                  width: `${widthDays * 40}px`,
                                  zIndex: 5
                                }}
                              >
                                <div className="shrink-0 bg-white/20 p-1 rounded-md">
                                  <Clock className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-white text-[10px] font-black truncate shadow-sm" dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-4 w-[350px] max-w-[90vw] shadow-2xl border-primary/20 bg-popover rounded-xl backdrop-blur-md">
                               <div className="space-y-3">
                                 <div className="border-b pb-2">
                                   <h5 className="font-black text-xs uppercase tracking-wider text-primary">Fəaliyyət Təfərrüatları</h5>
                                 </div>
                                 <div className="grid grid-cols-3 gap-y-2.5 gap-x-2 text-[11px] leading-relaxed">
                                   <div className="font-extrabold text-muted-foreground">Fəaliyyət Adı:</div>
                                   <div className="col-span-2 font-bold text-foreground whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />

                                   <div className="font-extrabold text-muted-foreground">Məsul Şəxs:</div>
                                   <div className="col-span-2 font-bold text-foreground whitespace-normal">
                                     {activity.employee?.name || <span className="italic font-medium text-muted-foreground/60">Təyin edilməyib</span>}
                                   </div>

                                   <div className="font-extrabold text-muted-foreground">Status:</div>
                                   <div className="col-span-2">
                                     <Badge className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded shadow-sm", STATUS_COLORS[activity.status])}>
                                       {activity.status}
                                     </Badge>
                                   </div>

                                   <div className="font-extrabold text-muted-foreground">Prioritet:</div>
                                   <div className="col-span-2">
                                     <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0.5 rounded border-muted-foreground/30 text-muted-foreground shadow-sm">
                                       {activity.priority?.toUpperCase() || 'MEDIUM'}
                                     </Badge>
                                   </div>

                                   <div className="font-extrabold text-muted-foreground">Bitmə Tarixi:</div>
                                   <div className="col-span-2 font-bold text-foreground">
                                     {activity.end_date ? format(new Date(activity.end_date), 'dd.MM.yyyy', { locale: az }) : '-'}
                                   </div>

                                   {activity.expected_outcome && (
                                     <>
                                       <div className="font-extrabold text-muted-foreground">Gözlənilən nəticə:</div>
                                       <div className="col-span-2 font-medium text-foreground/80 whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.expected_outcome) }} />
                                     </>
                                   )}

                                   {activity.monitoring_mechanism && (
                                     <>
                                       <div className="font-extrabold text-muted-foreground">Mexanizm:</div>
                                       <div className="col-span-2 font-medium text-foreground/80 whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.monitoring_mechanism) }} />
                                     </>
                                   )}

                                   {activity.description && (
                                     <>
                                       <div className="font-extrabold text-muted-foreground">Təsvir:</div>
                                       <div className="col-span-2 font-medium text-foreground/80 whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.description) }} />
                                     </>
                                   )}
                                 </div>
                               </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Legend */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between relative z-50">
           <div className="flex gap-4">
             {Object.entries(STATUS_COLORS).map(([status, color]) => (
               <div key={status} className="flex items-center gap-1.5">
                 <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{status}</span>
               </div>
             ))}
           </div>
           <div className="text-[10px] font-medium text-muted-foreground italic flex items-center gap-2">
              <TargetIcon className="w-3 h-3 text-primary" /> Mövcud tarixə qayıtmaq üçün "Bugün" düyməsindən istifadə edin.
           </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
