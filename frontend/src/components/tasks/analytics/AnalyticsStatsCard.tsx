import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: ReactNode;
  valueClassName?: string;
}

export function AnalyticsStatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  valueClassName,
}: AnalyticsStatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold", valueClassName)}>{value}</p>
            {trend !== undefined ? (
              <div className="flex items-center mt-1 text-sm">
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={trend >= 0 ? "text-green-500" : "text-red-500"}>
                  {trend >= 0 ? "+" : ""}{trend}%
                </span>
              </div>
            ) : subtitle ? (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            ) : null}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
