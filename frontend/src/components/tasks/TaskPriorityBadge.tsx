import { Badge } from "@/components/ui/badge";
import { priorityLabels } from "@/components/tasks/config/taskFormFields";

const PRIORITY_VARIANTS: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

type TaskPriorityBadgeProps = {
  priority: string;
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const variant = PRIORITY_VARIANTS[priority] || "secondary";
  const label = priorityLabels[priority] || priority;

  return <Badge variant={variant}>{label}</Badge>;
}
