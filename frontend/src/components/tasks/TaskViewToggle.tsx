/**
 * TaskViewToggle Component
 *
 * Toggle between different task view modes (Table, Kanban, Calendar)
 */

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table2, LayoutGrid, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskViewMode = "table" | "kanban" | "calendar" | "analytics";

interface TaskViewToggleProps {
  value: TaskViewMode;
  onChange: (value: TaskViewMode) => void;
  showCalendar?: boolean;
  showAnalytics?: boolean;
  disabled?: boolean;
  className?: string;
}

const viewModes = [
  {
    value: "table" as const,
    label: "Cədvəl",
    icon: Table2,
    description: "Excel-style cədvəl görünüşü",
  },
  {
    value: "kanban" as const,
    label: "Kanban",
    icon: LayoutGrid,
    description: "Status əsaslı lövhə görünüşü",
  },
  {
    value: "calendar" as const,
    label: "Təqvim",
    icon: Calendar,
    description: "Təqvim görünüşü",
  },
  {
    value: "analytics" as const,
    label: "Analitika",
    icon: BarChart3,
    description: "Statistika və hesabatlar",
  },
];

export function TaskViewToggle({
  value,
  onChange,
  showCalendar = false,
  showAnalytics = false,
  disabled = false,
  className,
}: TaskViewToggleProps) {
  // Filter available views
  const availableViews = viewModes.filter((mode) => {
    if (mode.value === "calendar" && !showCalendar) return false;
    if (mode.value === "analytics" && !showAnalytics) return false;
    return true;
  });

  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as TaskViewMode);
          }
        }}
        disabled={disabled}
        className={cn("border rounded-lg p-1 bg-muted/30", className)}
      >
        {availableViews.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.value;

          return (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={mode.value}
                  aria-label={mode.label}
                  className={cn(
                    "px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm",
                    isActive && "text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline text-sm">{mode.label}</span>
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </TooltipProvider>
  );
}

// Compact version - icons only
export function TaskViewToggleCompact({
  value,
  onChange,
  showCalendar = false,
  showAnalytics = false,
  disabled = false,
  className,
}: TaskViewToggleProps) {
  const availableViews = viewModes.filter((mode) => {
    if (mode.value === "calendar" && !showCalendar) return false;
    if (mode.value === "analytics" && !showAnalytics) return false;
    return true;
  });

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {availableViews.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.value;

          return (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onChange(mode.value)}
                  disabled={disabled}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{mode.label} - {mode.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
