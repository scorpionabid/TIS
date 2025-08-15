import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

export const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  variant = "default" 
}: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-primary/20 bg-primary-light";
      case "success":
        return "border-success/20 bg-success-light";
      case "warning":
        return "border-warning/20 bg-warning-light";
      case "destructive":
        return "border-destructive/20 bg-destructive-light";
      default:
        return "border-border-light bg-card";
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return "text-primary bg-primary/10";
      case "success":
        return "text-success bg-success/10";
      case "warning":
        return "text-warning bg-warning/10";
      case "destructive":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <Card className={cn("shadow-card hover:shadow-elevated transition-all duration-300", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", getIconStyles())}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {change && (
              <p className={cn(
                "text-xs font-medium",
                change.type === "increase" ? "text-success" : "text-destructive"
              )}>
                {change.type === "increase" ? "+" : "-"}{Math.abs(change.value)}%
                <span className="text-muted-foreground ml-1">öncəki aya nisbətən</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};