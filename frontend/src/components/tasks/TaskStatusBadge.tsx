import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/components/tasks/config/taskFormFields";

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "outline" | "success" | "destructive"> = {
  pending: "secondary",
  in_progress: "default",
  review: "outline",
  completed: "success",
  cancelled: "destructive",
};

type TaskStatusBadgeProps = {
  status: string;
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] || "secondary";
  const label = statusLabels[status] || status;

  return <Badge variant={variant}>{label}</Badge>;
}
