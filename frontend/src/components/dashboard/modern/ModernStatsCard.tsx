import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ModernStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable" | "warning";
  trendValue?: string;
  variant?: "primary" | "success" | "warning" | "destructive" | "info" | "default";
  index?: number;
}

export const ModernStatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  index = 0
}: ModernStatsCardProps) => {
  const variants = {
    primary: "from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
    success: "from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    destructive: "from-rose-500/10 to-red-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20",
    info: "from-sky-500/10 to-cyan-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20",
    default: "from-slate-500/5 to-slate-500/0 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
  };

  const iconVariants = {
    primary: "bg-blue-500/10 text-blue-600",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    destructive: "bg-rose-500/10 text-rose-600",
    info: "bg-sky-500/10 text-sky-600",
    default: "bg-slate-500/10 text-slate-600"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className={cn(
        "relative overflow-hidden group border border-slate-200/50 dark:border-slate-800/50 modern-shadow glass-card glass-card-hover h-full",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 group-hover:before:opacity-100 before:transition-opacity",
        variants[variant]
      )}>
        <CardContent className="p-4 relative z-10 flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-2xl transition-all group-hover:scale-110 duration-300 shadow-sm",
            iconVariants[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-0.5 truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl md:text-2xl font-black tracking-tighter">
                {value}
              </h3>
              {trend && (
                <span className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                  trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : 
                  trend === 'down' ? "bg-rose-500/10 text-rose-500" : 
                  "bg-slate-500/10 text-slate-500"
                )}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'}
                  {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>

          {/* Minimal Background Decoration */}
          <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
            <Icon size={80} strokeWidth={1} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
