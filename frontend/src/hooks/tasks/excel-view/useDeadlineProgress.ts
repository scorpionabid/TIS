import { useMemo } from 'react';
import { Task } from '@/services/tasks';

interface DeadlineInfo {
  usedPercent: number;
  color: 'green' | 'yellow' | 'red';
  label: string;
  isPast: boolean;
  remainingDays: number;
}

export function useDeadlineProgress(task: Task): DeadlineInfo | null {
  return useMemo(() => {
    if (!task.deadline) return null;
    if (['completed', 'cancelled'].includes(task.status)) return null;

    const now = new Date();
    const deadline = new Date(task.deadline);

    if (task.deadline_time) {
      const [h, m] = task.deadline_time.split(':');
      deadline.setHours(Number(h), Number(m), 0);
    } else {
      deadline.setHours(23, 59, 59);
    }

    const createdAt = task.created_at ? new Date(task.created_at) : new Date();
    const startedAt = task.started_at ? new Date(task.started_at) : createdAt;

    const totalMs = deadline.getTime() - startedAt.getTime();
    const elapsedMs = now.getTime() - startedAt.getTime();
    const remainingMs = deadline.getTime() - now.getTime();

    const isPast = remainingMs < 0;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    const usedPercent = totalMs > 0
      ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
      : (isPast ? 100 : 0);

    let color: 'green' | 'yellow' | 'red';
    let label: string;

    if (isPast) {
      color = 'red';
      label = `${Math.abs(remainingDays)}g gecikdi`;
    } else if (remainingDays <= 2) {
      color = 'red';
      label = remainingDays === 0 ? 'Bu gün' : `${remainingDays}g qaldı`;
    } else if (remainingDays <= 7) {
      color = 'yellow';
      label = `${remainingDays}g qaldı`;
    } else {
      color = 'green';
      label = `${remainingDays}g qaldı`;
    }

    return { usedPercent, color, label, isPast, remainingDays };
  }, [task.deadline, task.deadline_time, task.started_at, task.created_at, task.status]);
}
