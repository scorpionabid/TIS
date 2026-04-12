import React, { useMemo } from "react";
import { 
  format, 
  addDays, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameDay,
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
import { Link as LinkIcon, MessageSquare, Clock } from "lucide-react";

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
  // Determine date range for the timeline
  const { startDate, endDate, days } = useMemo(() => {
    if (activities.length === 0) {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      return { startDate: start, endDate: end, days: eachDayOfInterval({ start, end }) };
    }

    const startDates = activities.map(a => a.start_date ? new Date(a.start_date) : new Date()).filter(d => !isNaN(d.getTime()));
    const endDates = activities.map(a => a.end_date ? new Date(a.end_date) : new Date()).filter(d => !isNaN(d.getTime()));
    
    let start = new Date(Math.min(...startDates.map(d => d.getTime())));
    let end = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    // Add some padding
    start = addDays(start, -2);
    end = addDays(end, 7);

    // If interval is too short, expand it
    if (differenceInDays(end, start) < 14) {
      end = addDays(start, 14);
    }

    return { 
      startDate: start, 
      endDate: end, 
      days: eachDayOfInterval({ start, end }) 
    };
  }, [activities]);

  const calculatePosition = (dateStr?: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return Math.max(0, differenceInDays(date, startDate));
  };

  const calculateWidth = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    return Math.max(1, differenceInDays(end, start) + 1);
  };

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card shadow-xl overflow-hidden flex flex-col h-[600px]">
        {/* Timeline Header */}
        <div className="flex border-b bg-muted/30 sticky top-0 z-20">
          <div className="w-[280px] p-4 border-r font-black text-xs uppercase tracking-widest text-muted-foreground bg-background/50 backdrop-blur-md">
            Fəaliyyət / Əməkdaş
          </div>
          <div className="flex-1 overflow-x-auto no-scrollbar flex bg-background/50 backdrop-blur-md">
            {days.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "min-w-[40px] flex-1 border-r text-center py-2 flex flex-col items-center justify-center transition-colors",
                  isToday(day) && "bg-primary/10 border-primary/20",
                  isWeekend(day) && "bg-muted/20"
                )}
              >
                <span className="text-[10px] font-bold text-muted-foreground">{format(day, "eee", { locale: az })}</span>
                <span className={cn(
                  "text-[12px] font-black",
                  isToday(day) && "text-primary"
                )}>{format(day, "d")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {activities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground opacity-50">
               <Clock className="w-12 h-12 mb-4 animate-pulse" />
               <p className="font-bold">Zaman oxunda göstəriləcək fəaliyyət yoxdur.</p>
            </div>
          ) : (
            activities.map((activity) => {
              const startPos = calculatePosition(activity.start_date);
              const widthDays = calculateWidth(activity.start_date, activity.end_date);
              
              return (
                <div key={activity.id} className="flex border-b group hover:bg-muted/10 transition-colors">
                  {/* Task Info Cell */}
                  <div className="w-[280px] p-3 border-r flex items-center gap-3 bg-background/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className={cn("w-1.5 h-8 rounded-full shrink-0", STATUS_COLORS[activity.status])} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                        {activity.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.employee ? (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.employee.name}`} />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] text-muted-foreground font-medium">{activity.employee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic">Məsul yoxdur</span>
                        )}
                        {activity.comments_count > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] text-primary font-bold">
                             <MessageSquare className="w-2.5 h-2.5" /> {activity.comments_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid Cell with Bars */}
                  <div className="flex-1 relative h-16 min-w-max flex">
                    {/* Background Grid Lines */}
                    {days.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "min-w-[40px] border-r h-full transition-colors",
                          isToday(day) && "bg-primary/5",
                          isWeekend(day) && "bg-muted/10"
                        )} 
                      />
                    ))}

                    {/* The Task Bar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={cn(
                            "absolute top-4 h-8 rounded-lg shadow-md cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110 flex items-center px-3 gap-2 overflow-hidden border border-white/20",
                            STATUS_COLORS[activity.status]
                          )}
                          style={{ 
                            left: `${startPos * 40}px`, 
                            width: `${widthDays * 40}px`,
                            zIndex: 5
                          }}
                          onClick={() => {}}
                        >
                           <div className="shrink-0 bg-white/20 p-1 rounded-md">
                             {activity.parent_id ? <LinkIcon className="w-3 h-3 text-white" /> : <Clock className="w-3 h-3 text-white" />}
                           </div>
                           <span className="text-white text-[10px] font-black truncate shadow-sm">
                             {activity.name}
                           </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3 max-w-[250px] shadow-2xl border-primary/20">
                        <div className="space-y-2">
                           <p className="font-black text-sm">{activity.name}</p>
                           <p className="text-xs text-muted-foreground">{activity.description || "Açıqlama yoxdur."}</p>
                           <div className="flex gap-2">
                             <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                               {(() => {
                                 const cleanStartStr = activity.start_date?.includes('.') ? activity.start_date.split('.')[0] : activity.start_date;
                                 const cleanEndStr = activity.end_date?.includes('.') ? activity.end_date.split('.')[0] : activity.end_date;
                                 const start = cleanStartStr ? new Date(cleanStartStr) : null;
                                 const end = cleanEndStr ? new Date(cleanEndStr) : null;
                                 
                                 const startFormatted = start && !isNaN(start.getTime()) ? format(start, 'dd.MM.yyyy', { locale: az }) : '?';
                                 const endFormatted = end && !isNaN(end.getTime()) ? format(end, 'dd.MM.yyyy', { locale: az }) : '?';
                                 
                                 return `${startFormatted} - ${endFormatted}`;
                               })()}
                             </Badge>
                             <Badge className={cn("text-[9px] uppercase font-bold", STATUS_COLORS[activity.status])}>
                               {activity.status}
                             </Badge>
                           </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Legend */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
           <div className="flex gap-4">
             {Object.entries(STATUS_COLORS).map(([status, color]) => (
               <div key={status} className="flex items-center gap-1.5">
                 <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{status}</span>
               </div>
             ))}
           </div>
           <div className="text-[10px] font-medium text-muted-foreground italic">
              * Fəaliyyət barlarını sürüşdürməklə (tezliklə) tarixləri tənzimləyə bilərsiniz.
           </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
