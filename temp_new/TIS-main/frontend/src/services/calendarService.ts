import { apiClient } from './api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarParticipant {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string; // computed by backend map or appended attribute
  email: string;
  pivot?: { status: 'pending' | 'accepted' | 'declined' };
}

export const participantName = (p: CalendarParticipant): string =>
  (p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()) || p.email;

export interface CalendarEvent {
  id: number;
  title: string;
  type: 'event' | 'meeting' | 'visit' | 'task';
  date: string; // "YYYY-MM-DD"
  time: string | null;
  link: string | null;
  reminder_minutes: number | null;
  recurrence_rule: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  recurrence_end_date: string | null;
  participants?: CalendarParticipant[];
  is_invited?: boolean;
  is_recurring_instance?: boolean;
  created_at: string;
  updated_at: string;
}

export type NoteColor = 'yellow' | 'red' | 'green' | 'blue' | 'purple';

export interface UserNote {
  id: number;
  text: string;
  color: NoteColor;
  created_at: string;
  updated_at: string;
}

export interface CreateEventPayload {
  title: string;
  type: CalendarEvent['type'];
  date: string;
  time?: string;
  link?: string;
  reminder_minutes?: number | null;
  recurrence_rule?: CalendarEvent['recurrence_rule'];
  recurrence_end_date?: string | null;
  participant_ids?: number[];
}

export interface CreateNotePayload {
  text: string;
  color?: NoteColor;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const calendarKeys = {
  events: () => ['calendar', 'events'] as const,
  notes: () => ['calendar', 'notes'] as const,
  userSearch: (q: string) => ['calendar', 'users', q] as const,
};

// ─── API calls ───────────────────────────────────────────────────────────────

// Normalize date string to "YYYY-MM-DD" regardless of backend format
const toDateKey = (d: string | null | undefined): string =>
  d ? String(d).substring(0, 10) : '';

const normalizeEvent = (e: CalendarEvent): CalendarEvent => ({
  ...e,
  date: toDateKey(e.date),
  recurrence_end_date: e.recurrence_end_date ? toDateKey(e.recurrence_end_date) : null,
});

const fetchEvents = async (): Promise<CalendarEvent[]> => {
  // cache: false — always hit the backend, never return stale apiClient cache
  const res = await apiClient.get<{ data: CalendarEvent[] }>('/calendar/events', undefined, { cache: false });
  const raw: CalendarEvent[] = (res as any)?.data ?? [];
  return raw.map(normalizeEvent);
};

const createEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const res = await apiClient.post<{ data: CalendarEvent }>('/calendar/events', payload);
  return (res as any).data;
};

const updateEvent = async ({ id, ...payload }: Partial<CreateEventPayload> & { id: number }): Promise<CalendarEvent> => {
  const res = await apiClient.put<{ data: CalendarEvent }>(`/calendar/events/${id}`, payload);
  return (res as any).data;
};

const deleteEvent = async (id: number): Promise<void> => {
  await apiClient.delete(`/calendar/events/${id}`);
};

const rsvpEvent = async ({ id, status }: { id: number; status: 'accepted' | 'declined' }): Promise<void> => {
  await apiClient.post(`/calendar/events/${id}/rsvp`, { status });
};

const fetchNotes = async (): Promise<UserNote[]> => {
  const res = await apiClient.get<{ data: UserNote[] }>('/calendar/notes');
  return (res as any)?.data ?? [];
};

const createNote = async (payload: CreateNotePayload): Promise<UserNote> => {
  const res = await apiClient.post<{ data: UserNote }>('/calendar/notes', payload);
  return (res as any).data;
};

const updateNote = async ({ id, ...payload }: { id: number; text: string; color?: NoteColor }): Promise<UserNote> => {
  const res = await apiClient.put<{ data: UserNote }>(`/calendar/notes/${id}`, payload);
  return (res as any).data;
};

const deleteNote = async (id: number): Promise<void> => {
  await apiClient.delete(`/calendar/notes/${id}`);
};

const searchUsers = async (q: string): Promise<{ id: number; name: string; email: string }[]> => {
  if (!q.trim()) return [];
  const res = await apiClient.get<{ data: { id: number; name: string; email: string }[] }>('/calendar/users/search', { q });
  return (res as any)?.data ?? [];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useCalendarEvents = () =>
  useQuery({
    queryKey: calendarKeys.events(),
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
  });

const onEventError = (err: unknown) => {
  toast({
    title: 'Xəta',
    description: (err as Error)?.message ?? 'Əməliyyat uğursuz oldu',
    variant: 'destructive',
  });
};

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      const normalized = normalizeEvent(newEvent);
      // Step 1: show immediately via setQueryData (no network wait)
      qc.setQueryData(calendarKeys.events(), (old: CalendarEvent[] = []) => [...old, normalized]);
      toast({ title: 'Tədbir yaradıldı', duration: 2000 });
      // Step 2: confirm with server data after brief delay (avoids race with setQueryData)
      setTimeout(() => qc.refetchQueries({ queryKey: calendarKeys.events() }), 300);
    },
    onError: onEventError,
  });
};

export const useUpdateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (updated) => {
      const normalized = normalizeEvent(updated);
      qc.setQueryData(calendarKeys.events(), (old: CalendarEvent[] = []) =>
        old.map((e) => (e.id === normalized.id ? normalized : e)),
      );
      setTimeout(() => qc.refetchQueries({ queryKey: calendarKeys.events() }), 300);
    },
    onError: onEventError,
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: calendarKeys.events() });
      const prev = qc.getQueryData<CalendarEvent[]>(calendarKeys.events());
      qc.setQueryData(calendarKeys.events(), (old: CalendarEvent[] = []) => old.filter((e) => e.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(calendarKeys.events(), ctx.prev);
      onEventError(_err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: calendarKeys.events() }),
  });
};

export const useRsvpEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rsvpEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.events() }),
  });
};

export const useUserNotes = () =>
  useQuery({
    queryKey: calendarKeys.notes(),
    queryFn: fetchNotes,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.notes() }),
  });
};

export const useUpdateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.notes() }),
  });
};

export const useDeleteNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.notes() }),
  });
};

export const useCalendarUserSearch = (q: string) =>
  useQuery({
    queryKey: calendarKeys.userSearch(q),
    queryFn: () => searchUsers(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
