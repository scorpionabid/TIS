import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "info";
  onClick?: () => void;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
  onClick
}: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-l-2 sm:border-l-4 border-primary";
      case "success":
        return "border-l-2 sm:border-l-4 border-success";
      case "warning":
        return "border-l-2 sm:border-l-4 border-warning";
      case "destructive":
        return "border-l-2 sm:border-l-4 border-destructive";
      case "info":
        return "border-l-2 sm:border-l-4 border-blue-500";
      default:
        return "border-l-2 sm:border-l-4 border-border";
    }
  };

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow transition-all duration-200 bg-card",
        getVariantStyles(),
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="text-xl sm:text-2xl font-semibold">{value}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/40 sm:bg-muted/50">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
