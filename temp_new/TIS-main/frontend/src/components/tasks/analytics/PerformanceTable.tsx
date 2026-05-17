import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PerformanceItem {
  id: number;
  name: string;
  completedLabel: string;
  score: number;
}

interface PerformanceTableProps {
  title: string;
  description: string;
  icon: ReactNode;
  items: PerformanceItem[];
}

export function PerformanceTable({ title, description, icon, items }: PerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.slice(0, 5).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-medium">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.completedLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={item.score >= 80 ? "default" : "secondary"}>
                  {item.score.toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Məlumat yoxdur</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
