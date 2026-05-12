import { apiClient } from './api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CalendarEvent {
  id: number;
  title: string;
  type: 'event' | 'meeting' | 'visit' | 'task';
  date: string; // ISO date string "YYYY-MM-DD"
  time: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserNote {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventPayload {
  title: string;
  type: CalendarEvent['type'];
  date: string;
  time?: string;
  link?: string;
}

export interface CreateNotePayload {
  text: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const calendarKeys = {
  events: () => ['calendar', 'events'] as const,
  notes: () => ['calendar', 'notes'] as const,
};

// ─── API calls ───────────────────────────────────────────────────────────────

const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const res = await apiClient.get<{ data: CalendarEvent[] }>('/calendar/events');
  return (res as any)?.data ?? [];
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

const fetchNotes = async (): Promise<UserNote[]> => {
  const res = await apiClient.get<{ data: UserNote[] }>('/calendar/notes');
  return (res as any)?.data ?? [];
};

const createNote = async (payload: CreateNotePayload): Promise<UserNote> => {
  const res = await apiClient.post<{ data: UserNote }>('/calendar/notes', payload);
  return (res as any).data;
};

const updateNote = async ({ id, text }: { id: number; text: string }): Promise<UserNote> => {
  const res = await apiClient.put<{ data: UserNote }>(`/calendar/notes/${id}`, { text });
  return (res as any).data;
};

const deleteNote = async (id: number): Promise<void> => {
  await apiClient.delete(`/calendar/notes/${id}`);
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useCalendarEvents = () =>
  useQuery({
    queryKey: calendarKeys.events(),
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.events() }),
  });
};

export const useUpdateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.events() }),
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
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
