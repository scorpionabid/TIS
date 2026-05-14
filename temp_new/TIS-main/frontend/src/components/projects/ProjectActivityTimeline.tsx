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
import { Link as LinkIcon, MessageSquare, Clock, Target as TargetIcon } from "lucide-react";

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
      <div className="rounded-xl border bg-card shadow-xl overflow-hidden flex flex-col h-[600px] relative">
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
                <div className="sticky left-0 z-50 w-[300px] bg-background border-r p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 h-10 flex items-center">
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
                <div className="sticky left-0 z-50 w-[300px] bg-background border-r p-4 font-black text-xs uppercase tracking-widest text-muted-foreground h-14 flex items-start">
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
                    <div key={activity.id} className="flex border-b group hover:bg-primary/[0.02] transition-colors h-16">
                      {/* Fixed Left Column */}
                      <div className="sticky left-0 z-20 w-[300px] bg-background border-r p-3 flex items-center gap-3 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                        <div className={cn("w-1.5 h-8 rounded-full shrink-0 shadow-sm", STATUS_COLORS[activity.status])} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                            {activity.name}
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              {activity.employee ? (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4 border">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.employee.name}`} />
                                    <AvatarFallback>U</AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[100px]">{activity.employee.name}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/60 italic">Məsul yoxdur</span>
                              )}
                            </div>
                            {!hasDates && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-200 bg-amber-50 text-amber-700">
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
                              day.getDate() === 1 && "border-l-2 border-l-primary/5"
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
                                <span className="text-white text-[10px] font-black truncate shadow-sm">
                                  {activity.name}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-3 max-w-[250px] shadow-2xl border-primary/20">
                               <div className="space-y-2">
                                  <p className="font-black text-sm">{activity.name}</p>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                                      {format(new Date(activity.start_date!), 'dd.MM')} - {format(new Date(activity.end_date!), 'dd.MM.yyyy')}
                                    </Badge>
                                    <Badge className={cn("text-[9px] uppercase font-bold", STATUS_COLORS[activity.status])}>
                                      {activity.status}
                                    </Badge>
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
