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
          wrapper: "border border-primary/20 bg-primary/5",
          iconBackground: "bg-primary/15 text-primary",
          label: "text-primary/70",
        };
      case "success":
        return {
          wrapper: "border border-success/20 bg-success/5",
          iconBackground: "bg-success/15 text-success",
          label: "text-success/70",
        };
      case "warning":
        return {
          wrapper: "border border-warning/25 bg-warning/5",
          iconBackground: "bg-warning/20 text-warning/80",
          label: "text-warning/70",
        };
      case "destructive":
        return {
          wrapper: "border border-destructive/25 bg-destructive/5",
          iconBackground: "bg-destructive/15 text-destructive",
          label: "text-destructive/70",
        };
      case "info":
        return {
          wrapper: "border border-blue-300/30 bg-blue-50/40",
          iconBackground: "bg-blue-500/10 text-blue-600",
          label: "text-blue-600/75",
        };
      default:
        return {
          wrapper: "border border-border/40 bg-card/85",
          iconBackground: "bg-muted/40 text-muted-foreground",
          label: "text-muted-foreground/70",
        };
    }
  };

  const { wrapper, iconBackground, label } = getVariantStyles();

  return (
    <Card
      align="center"
      interactive={Boolean(onClick)}
      className={cn(
        "overflow-hidden backdrop-blur-sm",
        wrapper,
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 px-4 py-4 sm:px-5">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            iconBackground
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <p className={cn("text-[11px] uppercase tracking-wide font-medium", label)}>
            {title}
          </p>
          <p className="text-xl font-semibold text-foreground sm:text-2xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
