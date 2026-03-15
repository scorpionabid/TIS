import { apiClient } from '@/services/api';
import type {
  Message,
  MessagesResponse,
  UnreadCountResponse,
  RecipientsResponse,
  SendMessagePayload,
} from '@/types/message';

/**
 * apiClient.get/post → raw JSON body qaytarır.
 * Bütün mesaj endpoint-ləri `{ data: [...] }` (və ya `{ count: N }`) strukturu ilə gəlir.
 * Komponentlər `data.data` və ya `data.count` kimi istifadə edir,
 * buna görə tam response qaytarılmalıdır, yalnız `.data` yox.
 */
class MessageService {
  async getInbox(page = 1): Promise<MessagesResponse> {
    const response = await apiClient.get<MessagesResponse>('/messages', { page });
    return response as unknown as MessagesResponse;
  }

  async getSent(page = 1): Promise<MessagesResponse> {
    const response = await apiClient.get<MessagesResponse>('/messages/sent', { page });
    return response as unknown as MessagesResponse;
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/messages/unread-count');
    return response as unknown as UnreadCountResponse;
  }

  async getRecipients(): Promise<RecipientsResponse> {
    const response = await apiClient.get<RecipientsResponse>('/messages/recipients');
    return response as unknown as RecipientsResponse;
  }

  async getThread(id: number): Promise<{ data: Message }> {
    const response = await apiClient.get<{ data: Message }>(`/messages/${id}`);
    return response as unknown as { data: Message };
  }

  async send(payload: SendMessagePayload): Promise<{ data: Message }> {
    const response = await apiClient.post<{ data: Message }>('/messages', payload);
    return response as unknown as { data: Message };
  }

  async markAsRead(id: number): Promise<void> {
    await apiClient.post(`/messages/${id}/read`);
  }

  async deleteMessage(id: number): Promise<void> {
    await apiClient.delete(`/messages/${id}`);
  }
}

export const messageService = new MessageService();
