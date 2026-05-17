import React from 'react';
import { motion } from "framer-motion";
import { 
  CheckSquare, 
  ClipboardList, 
  FolderKanban, 
  CalendarDays, 
  Library, 
  ListChecks, 
  LineChart, 
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Action {
  title: string;
  icon: any;
  path: string;
  color: string;
  description: string;
}

const actions: Action[] = [
  { 
    title: "Qiymətləndirmə", 
    icon: CheckSquare, 
    path: "/assessments", 
    color: "bg-orange-500", 
    description: "Nəticələrin daxil edilməsi" 
  },
  { 
    title: "Tapşırıqlar", 
    icon: ClipboardList, 
    path: "/tasks", 
    color: "bg-blue-500", 
    description: "İcra edilməli tapşırıqlar" 
  },
  { 
    title: "Layihələr", 
    icon: FolderKanban, 
    path: "/projects", 
    color: "bg-indigo-500", 
    description: "Cari layihələr" 
  },
  { 
    title: "Cədvəllər", 
    icon: CalendarDays, 
    path: "/schedules", 
    color: "bg-purple-500", 
    description: "Dərs və iş cədvəlləri" 
  },
  { 
    title: "Resurslar", 
    icon: Library, 
    path: "/my-resources", 
    color: "bg-amber-500", 
    description: "Sənədlər və kitablar" 
  },
  { 
    title: "Sorğular", 
    icon: ListChecks, 
    path: "/surveys", 
    color: "bg-emerald-500", 
    description: "Aktiv anketlər" 
  },
  { 
    title: "Akademik İzləmə", 
    icon: LineChart, 
    path: "/performance", 
    color: "bg-rose-500", 
    description: "Göstəricilərin analizi" 
  },
  { 
    title: "Davamiyyət", 
    icon: Users, 
    path: "/attendance", 
    color: "bg-sky-500", 
    description: "Gündəlik qeydiyyat" 
  }
];

export const QuickActionsGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 px-1">Sürətli Keçidlər</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => navigate(action.path)}
            className="group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-4 md:p-5 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-white dark:hover:bg-slate-900">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                  action.color
                )}>
                  <action.icon size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100 truncate">{action.title}</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 truncate">{action.description}</p>
                </div>
                <div className="text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  →
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
