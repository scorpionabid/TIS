export interface MessageSender {
  id: number;
  name: string;
  role: string;
  institution: { id: number; name: string } | null;
}

export interface MessageRecipientInfo {
  id: number;
  name: string;
  is_read: boolean;
  read_at: string | null;
}

export interface Message {
  id: number;
  sender: MessageSender;
  body: string;
  parent_id: number | null;
  is_read: boolean | null; // current user üçün (inbox-da null = göndərən)
  read_at: string | null;
  replies_count: number;
  replies?: Message[];
  recipients?: MessageRecipientInfo[];
  created_at: string;
  updated_at: string;
}

export interface MessagesResponse {
  data: Message[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  unread_count?: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface AvailableRecipient {
  type: 'user';
  id: number;
  name: string;
  role: string;
  institution_name: string;
  institution_id?: number;
}

export interface RecipientsResponse {
  data: AvailableRecipient[];
}

export interface SendMessagePayload {
  body: string;
  recipient_ids?: number[];
  target_institutions?: number[];
  target_roles?: string[];
  parent_id?: number;
}

export type MessageTab = 'inbox' | 'sent';
