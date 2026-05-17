export const assignmentStatusLabels: Record<string, string> = {
  pending: "Gözləyir",
  accepted: "Qəbul edilib",
  in_progress: "İcrada",
  completed: "Tamamlanıb",
  cancelled: "Ləğv edilib",
  delegated: "Yönləndirilib",
  rejected: "İmtina edilib",
  review: "Nəzərdən keçirilir",
};

export function getAssignmentStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending:     "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    accepted:    "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    in_progress: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    completed:   "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    cancelled:   "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    delegated:   "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    rejected:    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    review:      "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  };
  return classes[status] ?? "bg-gray-100 text-gray-600 border border-gray-200";
}

export function getProgressBarColor(progress: number): string {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 30) return "bg-amber-400";
  return "bg-red-500";
}
