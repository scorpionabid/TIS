import { Card, CardContent } from "@/components/ui/card";
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
        return {
          border: "ring-1 ring-inset ring-primary/30",
          iconBackground: "bg-primary/10 text-primary",
          label: "text-primary/80",
        };
      case "success":
        return {
          border: "ring-1 ring-inset ring-success/30",
          iconBackground: "bg-success/10 text-success",
          label: "text-success/80",
        };
      case "warning":
        return {
          border: "ring-1 ring-inset ring-warning/35",
          iconBackground: "bg-warning/15 text-warning/90",
          label: "text-warning/80",
        };
      case "destructive":
        return {
          border: "ring-1 ring-inset ring-destructive/30",
          iconBackground: "bg-destructive/10 text-destructive",
          label: "text-destructive/80",
        };
      case "info":
        return {
          border: "ring-1 ring-inset ring-blue-400/40",
          iconBackground: "bg-blue-500/10 text-blue-600",
          label: "text-blue-600/80",
        };
      default:
        return {
          border: "ring-1 ring-inset ring-border/60",
          iconBackground: "bg-muted/50 text-muted-foreground",
          label: "text-muted-foreground/80",
        };
    }
  };

  const { border, iconBackground, label } = getVariantStyles();

  return (
    <Card
      align="center"
      interactive={Boolean(onClick)}
      className={cn(
        "overflow-hidden backdrop-blur-sm",
        border,
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-4 py-5">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconBackground
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className={cn("text-xs uppercase tracking-wide", label)}>
            {title}
          </p>
          <p className="text-2xl font-semibold text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
