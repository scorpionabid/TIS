# ATİS Mesajlaşma Funksionallığı — Texniki Plan

> **Tarix:** 2026-03-14
> **Status:** ✅ TAM İMPLEMENTASİYA EDİLİB (2026-03-14)
> **Scope:** SchoolAdmin ↔ RegionAdmin / RegionOperator / SektorAdmin / SuperAdmin

---

## 1. Xülasə

Header-dəki axtarış inputunu silir, yerinə **MessagingIndicator** komponenti yerləşdiririk. Klikdə sağdan sürüşən **Sheet** (slide-over panel) açılır. İstifadəçilər bir-biri ilə WhatsApp tipli söhbət edə bilər. Mesajlar oxunduqdan 1 gün, oxunmadıqda 5 gün sonra avtomatik silinir.

---

## 2. Rol-əsaslı Mesajlaşma Sxemi

```
SchoolAdmin  ──→  RegionAdmin, SektorAdmin, RegionOperator
                  (öz iyerarxiyasında yuxarı rollara yaza bilər)

RegionAdmin  ──→  SchoolAdmins (regionundakı bütün müəssisələrin)
RegionOperator ─→ SchoolAdmins (regionundakı bütün müəssisələrin)
SektorAdmin  ──→  SchoolAdmins (sektorundakı müəssisələrin)
SuperAdmin   ──→  RegionAdmin kimi — bütün SchoolAdmins (filtr yoxdur)

Bilik: Əks istiqamət də işləyir (recipient cavab verə bilər)
```

### 2.1 Recipient Seçimi (Frontend)

| Rol | Seçim Metodu |
|-----|-------------|
| SchoolAdmin | İstifadəçi siyahısı (regionadmin, sektoradmin, regionoperator) |
| RegionAdmin / RegionOperator | InstitutionTargeting kimi müəssisə seçimi → SchoolAdmin avtomatik |
| SektorAdmin | Sektorundakı məktəblərin siyahısı → SchoolAdmin avtomatik |
| SuperAdmin | RegionAdmin kimi — müəssisə seçimi, filtr yoxdur |

---

## 3. Verilənlər Bazası Sxemi

### 3.1 `messages` cədvəli

```sql
CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       BIGINT REFERENCES messages(id) ON DELETE SET NULL,  -- reply üçün
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- göndərən tərəfindən silinmə (soft delete)
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### 3.2 `message_recipients` cədvəli

```sql
CREATE TABLE message_recipients (
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,     -- read_at + 1 gün (oxunduqda set olur)
    deleted_at      TIMESTAMPTZ,     -- scheduler tərəfindən soft delete
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id, recipient_id)
);

CREATE INDEX idx_message_recipients_recipient_id ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_is_read ON message_recipients(is_read);
CREATE INDEX idx_message_recipients_expires_at ON message_recipients(expires_at);
```

### 3.3 Silinmə Məntiqi

```
Oxunmuş mesaj:
  expires_at = read_at + 1 gün
  Scheduler: deleted_at IS NULL AND expires_at < NOW() → soft delete

Oxunmamış mesaj:
  Scheduler: is_read = false AND message.created_at < NOW() - 5 gün → soft delete

Hard delete:
  Mesaj bütün recipient-lar üçün soft delete edilib VƏ
  messages.deleted_at NOT NULL → hard delete (cascade)
```

---

## 4. Backend İmplementasiya

### 4.1 Yaradılacaq Fayllar

```
backend/
├── database/migrations/
│   ├── 2026_03_14_100000_create_messages_table.php
│   └── 2026_03_14_100001_create_message_recipients_table.php
│
├── app/Models/
│   ├── Message.php
│   └── MessageRecipient.php
│
├── app/Http/Controllers/Api/
│   └── MessageController.php
│
├── app/Http/Requests/
│   └── SendMessageRequest.php
│
├── app/Http/Resources/
│   ├── MessageResource.php
│   └── ConversationResource.php
│
├── app/Events/
│   └── NewMessageReceived.php          -- WebSocket broadcast
│
├── app/Console/Commands/
│   └── CleanupExpiredMessages.php      -- Günlük cron
│
└── routes/api/
    └── messages.php
```

### 4.2 API Endpoints

```
GET    /api/messages                    -- Inbox (mən recipient olduğum)
GET    /api/messages/sent               -- Göndərilənlər
GET    /api/messages/unread-count       -- Badge sayı üçün
GET    /api/messages/recipients         -- Rol-əsaslı recipient siyahısı
GET    /api/messages/{id}               -- Mesaj + replies thread
POST   /api/messages                    -- Yeni mesaj göndər
POST   /api/messages/{id}/reply         -- Cavab ver
POST   /api/messages/{id}/read          -- Oxundu işarəsi
DELETE /api/messages/{id}               -- Göndərən tərəfdən sil
```

### 4.3 `MessageController` Metod Məntiqləri

#### `index()` — Inbox
```php
// Current user-in recipient olduğu mesajlar
// message_recipients WHERE recipient_id = auth()->id()
//   AND deleted_at IS NULL
// Eager load: message.sender, replies count
// Sort: created_at DESC
// Group: parent_id IS NULL (yalnız üst-səviyyəli mesajlar)
```

#### `getRecipients()` — Rol-əsaslı siyahı
```php
// SchoolAdmin:
//   users WHERE role IN (regionadmin, sektoradmin, regionoperator)
//   AND institution hiyerarşiyasına görə filter

// RegionAdmin / RegionOperator:
//   institutions WHERE region_id = currentUser->institution->region_id
//   → hər müəssisənin schooladmin istifadəçisini return et
//   (institutions siyahısı ilə birlikdə — frontend seçir)

// SektorAdmin:
//   institutions WHERE sector_id = currentUser->institution->id (level=3)
//   → schooladmin users

// SuperAdmin:
//   institutions WHERE level = 4 (all) + users with regionadmin role
```

#### `store()` — Yeni mesaj
```php
// Validation: body required, recipient_ids array required, min 1
// Create message (sender_id = auth()->id())
// For each recipient_id → create message_recipient row
// Fire NewMessageReceived event for each recipient
// Return MessageResource
```

#### `markAsRead()` — Oxundu
```php
// message_recipients WHERE message_id = $id AND recipient_id = auth()->id()
// SET is_read = true, read_at = now(), expires_at = now() + 1 day
// Return 200 OK
```

### 4.4 `Message` Model

```php
class Message extends Model {
    use SoftDeletes;  // göndərən tərəfdən silmə

    protected $fillable = ['sender_id', 'parent_id', 'body'];

    public function sender(): BelongsTo
    public function recipients(): HasMany  // MessageRecipient rows
    public function recipientUsers(): BelongsToMany  // through message_recipients
    public function replies(): HasMany  // parent_id = this->id
    public function parent(): BelongsTo

    // Scope: görünən mesajlar (deleted_at IS NULL)
    public function scopeActive($query)
}
```

### 4.5 `NewMessageReceived` Event (WebSocket)

```php
class NewMessageReceived implements ShouldBroadcast {
    public function broadcastOn(): PrivateChannel {
        return new PrivateChannel("user.{$this->recipientId}");
    }

    public function broadcastWith(): array {
        return [
            'message_id' => $this->message->id,
            'sender_name' => $this->message->sender->name,
            'body_preview' => Str::limit($this->message->body, 60),
            'created_at' => $this->message->created_at,
        ];
    }
}
```

### 4.6 `CleanupExpiredMessages` Command

```php
// Artisan command: messages:cleanup
// Schedule: günlük saat 02:00

// Step 1: Soft-delete oxunmuş message_recipients
MessageRecipient::whereNotNull('read_at')
    ->whereNull('deleted_at')
    ->where('expires_at', '<', now())
    ->update(['deleted_at' => now()]);

// Step 2: Soft-delete oxunmamış 5 gündən köhnə
MessageRecipient::where('is_read', false)
    ->whereNull('deleted_at')
    ->whereHas('message', fn($q) => $q->where('created_at', '<', now()->subDays(5)))
    ->update(['deleted_at' => now()]);

// Step 3: Orphan mesajları sil (bütün recipient-lar silinib, sender də sil edib)
Message::onlyTrashed()
    ->whereDoesntHave('recipients', fn($q) => $q->whereNull('deleted_at'))
    ->forceDelete();
```

### 4.7 Kernel Schedule

```php
// app/Console/Kernel.php
$schedule->command('messages:cleanup')->dailyAt('02:00');
```

---

## 5. Frontend İmplementasiya

### 5.1 Yaradılacaq Fayllar

```
frontend/src/
├── types/
│   └── message.ts                          -- Message, Conversation, Recipient interfaces
│
├── services/
│   └── messageService.ts                   -- API calls
│
├── hooks/messages/
│   ├── useMessages.ts                      -- inbox, sent, unread-count queries
│   ├── useMessageThread.ts                 -- single thread query
│   └── useMessageMutations.ts             -- send, reply, markAsRead, delete
│
└── components/messaging/
    ├── MessagingIndicator.tsx              -- Header-də search-in yerini alır
    ├── MessagingPanel.tsx                  -- Ana Sheet (slide-over)
    ├── ConversationList.tsx                -- Sol panel: mesaj siyahısı
    ├── MessageThread.tsx                   -- Sağ panel: söhbət görünüşü
    ├── MessageBubble.tsx                   -- Tək mesaj balonu
    ├── MessageCompose.tsx                  -- Yazma sahəsi + göndər
    └── RecipientSelector.tsx               -- Rol-əsaslı alıcı seçimi
```

### 5.2 Modifikasiya Olunan Mövcud Fayllar

```
frontend/src/components/dashboard/DashboardHeader.tsx
  → SearchIcon + Input silinir
  → MessagingIndicator əlavə olunur (eyni yer, daha geniş)

frontend/src/contexts/WebSocketContext.tsx (və ya WebSocketProvider)
  → NewMessageReceived event-i dinlənilir
  → useQueryClient().invalidateQueries(['messages', 'unread-count'])
```

### 5.3 TypeScript Tipləri (`types/message.ts`)

```typescript
export interface MessageSender {
  id: number;
  name: string;
  role: string;
  institution?: { id: number; name: string };
}

export interface MessageRecipient {
  id: number;
  name: string;
  role: string;
  institution?: { id: number; name: string };
  is_read: boolean;
  read_at: string | null;
}

export interface Message {
  id: number;
  sender: MessageSender;
  body: string;
  parent_id: number | null;
  replies?: Message[];
  recipients: MessageRecipient[];
  is_read?: boolean;          // mövcud user üçün hesablanmış
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  // Inbox-da "digər tərəf" əsasında qruplaşdırılmış
  other_user: MessageSender;
  last_message: Message;
  unread_count: number;
  messages: Message[];
}

export interface AvailableRecipient {
  type: 'user' | 'institution';
  id: number;
  name: string;
  role?: string;
  institution_name?: string;
  // institution type üçün:
  schooladmin_user_id?: number;
  schooladmin_name?: string;
}

export interface SendMessagePayload {
  body: string;
  recipient_ids: number[];
  parent_id?: number;
}
```

### 5.4 Komponent Arxitekturası

#### `MessagingIndicator`
```
[💬 Mesajlar  (3)] ← unread badge
     ↑
  Button (geniş, ~200px)
  onClick → setMessagingOpen(true)
```

#### `MessagingPanel` (Sheet — sağdan açılır)
```
┌────────────────────────────────────────┐
│  Mesajlar              [+Yeni] [✕]    │
├──────────────┬─────────────────────────┤
│ [Gələn][Gönd]│                         │
│              │  Söhbət seçin...        │
│ 👤 Əli Həs.. │                         │
│  "Salam, ..."│  (MessageThread burada  │
│   2 oxunm.   │   görünür seçildikdə)  │
│──────────────│                         │
│ 👤 Nərmin ..  │                         │
│  "Sənəd..."  │                         │
│              │                         │
│              ├─────────────────────────┤
│              │ [Mesaj yaz...] [Göndər] │
└──────────────┴─────────────────────────┘
  250px           flex-1
```

#### `RecipientSelector` — SchoolAdmin üçün
```
SchoolAdmin görür:
┌─────────────────────────────┐
│ 🔍 [Axtar...]               │
│ ○ Əli Həsənov (RegionAdmin) │
│ ○ Nigar X. (SektorAdmin)    │
│ ● Elnur Y. (RegionOperator) │← seçilmiş
└─────────────────────────────┘
```

#### `RecipientSelector` — RegionAdmin/SektorAdmin/SuperAdmin üçün
```
InstitutionTargeting komponenti kimi:
┌─────────────────────────────┐
│ [Hamısı][Sektor][Məktəb]    │
│ ☑ 47 nömrəli məktəb        │
│ ☑ 23 nömrəli məktəb        │
│ ☐ 156 uşaq bağçası         │
└─────────────────────────────┘
→ Seçilmiş müəssisələrin SchoolAdmin-lərinə göndərilir
```

### 5.5 React Query Hooks

```typescript
// useMessages.ts
export function useInbox() {
  return useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: () => messageService.getInbox(),
    staleTime: 30_000,  // 30 saniyə
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => messageService.getUnreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,  // WebSocket yoxdursa polling fallback
  });
}

// useMessageMutations.ts
export function useMessageMutations() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: (payload: SendMessagePayload) => messageService.send(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => messageService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    },
  });

  return { sendMessage, markAsRead, /* replyMessage, deleteMessage */ };
}
```

### 5.6 WebSocket Entegrasyonu

`WebSocketContext.tsx`-dəki `listenToUserChannel` metodundan istifadə:

```typescript
// MessagingPanel.tsx içində
const { listenToUserChannel, stopListening } = useWebSocket();
const queryClient = useQueryClient();

useEffect(() => {
  if (!currentUser) return;

  listenToUserChannel(currentUser.id, (data) => {
    if (data.type === 'NewMessageReceived') {
      // Badge-i yenilə
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      // Inbox-ı yenilə
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
      // Toast bildirişi
      toast.info(`${data.sender_name}: ${data.body_preview}`);
    }
  });

  return () => stopListening(`private-user.${currentUser.id}`);
}, [currentUser]);
```

**WebSocket aktivləşdirmə** (Docker `.env`-ə əlavə):
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=atis-app
REVERB_APP_KEY=atis-reverb-key
REVERB_APP_SECRET=atis-reverb-secret
REVERB_HOST=atis_backend
REVERB_PORT=8080
REVERB_SCHEME=http
```

Reverb server-ini Docker-ə əlavə etmək lazımdır (ya artıq mövcud konteynerə supervisor ilə).

**Fallback:** WebSocket bağlı deyilsə `refetchInterval: 60_000` (hər 1 dəqiqə polling).

---

## 6. İmplementasiya Fazaları

### Faza 1 — Backend (DB + API)
1. `messages` və `message_recipients` migrasiyaları
2. `Message` və `MessageRecipient` modelləri
3. `MessageController` — tam CRUD
4. `SendMessageRequest` validation
5. `MessageResource` + `ConversationResource`
6. Route faylı `routes/api/messages.php`
7. `api.php`-ə include əlavəsi
8. `CleanupExpiredMessages` command + schedule
9. `NewMessageReceived` event (broadcasting)

### Faza 2 — Frontend Core
1. `types/message.ts`
2. `messageService.ts`
3. `useMessages.ts`, `useMessageMutations.ts`
4. `MessagingIndicator` komponenti
5. `DashboardHeader.tsx` — search silinir, indicator əlavə olunur

### Faza 3 — Frontend Panel UI
1. `MessagingPanel.tsx` (Sheet container)
2. `ConversationList.tsx` — inbox/sent tabs
3. `MessageThread.tsx` — söhbət görünüşü
4. `MessageBubble.tsx` — mesaj balonu
5. `MessageCompose.tsx` — yazma sahəsi

### Faza 4 — Recipient Selector + Real-time
1. `RecipientSelector.tsx` — rol-əsaslı alıcı seçimi
2. WebSocket listener entegrasyonu
3. Toast bildirişləri
4. Docker Reverb konfiqurasyonu (əgər aktiv istənirsə)

### Faza 5 — Test + Polish
1. Backend unit/feature testləri
2. Frontend lint + typecheck
3. Mobile responsiveness yoxlaması
4. Edge cases: boş inbox, silinmiş user, çoxlu recipient

---

## 7. Texniki Qərarlar

| Sual | Qərar | Səbəb |
|------|-------|-------|
| Panel tipi | Sheet (slide-over sağdan) | Mövcud `sheet.tsx` hazır, UX daha yaxşı |
| Mesaj strukturu | WhatsApp (sadə body, reply dəstəyi) | User tələbi |
| Real-time | WebSocket (Reverb) + polling fallback | Reverb artıq konfiqurulub |
| Silinmə | Soft delete → hard delete | Məlumat itkisindən qorunma |
| Oxunmuş müddət | 1 gün | User tələbi |
| Oxunmamış müddət | 5 gün | User tələbi |
| Multi-recipient | Hər recipient ayrı `message_recipients` row | Ayrı oxunma statusu |
| Threading | `parent_id` ilə reply | Sadə, effektiv |
| Görünüş | 2-panel desktop, 1-panel mobile | Responsiv |

---

## 8. Riskler və Diqqət Məqamları

1. **Reverb Docker entegrasyonu** — `php artisan reverb:start` komandası konteynerə supervisor vasitəsilə əlavə edilməlidir. Əgər bu mürəkkəbdirsə, polling kifayətdir.

2. **Recipient permission** — Backend mütləq yoxlamalıdır ki, göndərən yalnız icazəli rollarla mesajlaşır. Qeyri-icazəli recipient_id verilsə → 403.

3. **SchoolAdmin iyerarxiyası** — SchoolAdmin öz regionundakı regionadmin-i tapmalıdır. Institution → region → regionadmin users chain-i düzgün eager load edilməlidir.

4. **SektorAdmin üçün sektor müəyyəni** — SektorAdmin-in `institution.level = 3` olmalıdır. Bu kontrol edilməlidir.

5. **Production məlumatı** — 22+ real məktəb var. Mesajlaşma onların iş axınına toxunmamalıdır. Migration-lar geri alına bilən olmalıdır.

---

## 9. Asılılıqlar (yeni paket tələb olunmur)

| Komponent | Asılılıq | Mövcuddur? |
|-----------|---------|-----------|
| Slide-over | `sheet.tsx` (Shadcn/ui) | ✅ |
| Real-time | `laravel-echo`, `pusher-js` | ✅ |
| Broadcasting | Laravel Reverb / config | ✅ (konfiqurulub) |
| Cleanup | Artisan Command pattern | ✅ (CleanupOldNotifications.php nümunəsi) |
| Institution selector | `InstitutionTargeting.tsx` | ✅ (reuse ediləcək) |
| Form validation | Zod + react-hook-form | ✅ |

---

## 10. Gözlənilən API Cavab Strukturları

### `GET /api/messages` (Inbox)
```json
{
  "data": [
    {
      "id": 1,
      "sender": { "id": 5, "name": "Əli Həsənov", "role": "regionadmin" },
      "body": "Salam, hesabatı göndərin zəhmət olmasa.",
      "is_read": false,
      "read_at": null,
      "replies_count": 0,
      "created_at": "2026-03-14T10:30:00Z"
    }
  ],
  "unread_count": 3,
  "meta": { "total": 12, "per_page": 20, "current_page": 1 }
}
```

### `GET /api/messages/recipients`
```json
{
  "data": [
    {
      "type": "user",
      "id": 5,
      "name": "Əli Həsənov",
      "role": "regionadmin",
      "institution_name": "Bakı Rayon Təhsil Şöbəsi"
    }
  ]
}
```
*(RegionAdmin üçün institution tipli nəticə qaytarılır)*

### `POST /api/messages`
```json
// Request:
{
  "body": "Salam, hesabatı göndərin.",
  "recipient_ids": [5, 12]
}

// Response 201:
{
  "data": {
    "id": 42,
    "sender": { ... },
    "body": "Salam, hesabatı göndərin.",
    "recipients": [
      { "id": 5, "name": "...", "is_read": false }
    ],
    "created_at": "2026-03-14T11:00:00Z"
  }
}
```
