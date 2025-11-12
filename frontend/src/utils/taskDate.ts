const AZERBAIJANI_LOCALE = "az-AZ";

export function formatDate(dateString?: string | null) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleDateString(AZERBAIJANI_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type DeadlineTone = "muted" | "warning" | "destructive" | "default";
export type DeadlineStatusInfo = {
  label: string;
  tone: DeadlineTone;
};

export function formatDeadlineStatus(deadline?: string | null): DeadlineStatusInfo {
  if (!deadline) {
    return { label: "Son tarix yoxdur", tone: "muted" as DeadlineTone };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffInMs = deadlineDate.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (deadlineDate < now) {
    return {
      label: "Gecikmiş",
      tone: "destructive" as DeadlineTone,
    };
  }

  if (diffInDays <= 3) {
    return {
      label: `Yekunlaşmağa ${diffInDays} gün qalıb`,
      tone: "warning" as DeadlineTone,
    };
  }

  return {
    label: `${diffInDays} gün sonra`,
    tone: "default" as DeadlineTone,
  };
}
