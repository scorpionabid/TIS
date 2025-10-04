import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default"
}: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-l-4 border-primary";
      case "success":
        return "border-l-4 border-success";
      case "warning":
        return "border-l-4 border-warning";
      case "destructive":
        return "border-l-4 border-destructive";
      default:
        return "border-l-4 border-border";
    }
  };

  return (
    <Card className={cn("shadow-sm hover:shadow transition-all duration-200 bg-card", getVariantStyles())}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;