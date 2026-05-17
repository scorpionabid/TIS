export function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatUserName(name: string): string {
  if (!name) return '';
  if (name.includes('@')) {
    const username = name.split('@')[0];
    return username
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return name;
}

export function isTaskOverdue(deadline?: string | null, status?: string): boolean {
  if (!deadline) return false;
  if (status === "completed" || status === "cancelled") return false;
  return new Date(deadline) < new Date();
}
