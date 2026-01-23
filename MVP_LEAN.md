# Lean MVP - Privacy-First Chat App

**Filosofi**: Ship fast, tapi dengan fondasi yang benar. Lebih baik fitur sedikit yang solid daripada banyak fitur yang harus di-refactor.

---

## Scope MVP (8-12 minggu)

### ✅ INCLUDE - Fitur Inti

| Fitur | Alasan |
|-------|--------|
| Email + Password auth | Minimum viable auth |
| 1-to-1 chat dengan E2EE | Core value proposition |
| Real-time message delivery | Essential UX |
| Message status (sent/delivered/read) | Basic feedback |
| Edit/delete messages | **Privacy-first**: user harus kontrol penuh atas data |
| Web app only | Fokus satu platform dulu |

### ❌ CUT - Tunda ke Post-MVP

| Fitur | Alasan Tunda |
|-------|--------------|
| Image sharing | Bisa ditambahkan tanpa breaking change |
| Typing indicators | Nice-to-have, bukan core |
| Online/offline status | Nice-to-have |
| Email verification | Gunakan invite-only atau manual approval dulu |
| Multi-device | Kompleksitas tinggi, satu device per user dulu |
| Block users | Post-MVP |
| Search | Post-MVP |
| Group chat | Phase 2 |
| Mobile apps | Phase 2 |
| Notifications settings | Post-MVP |

---

## Tech Stack (Simplified)

```
Backend:    Node.js + Express + TypeScript
Database:   PostgreSQL (single instance)
Cache:      Redis (sessions + rate limiting only)
Real-time:  Socket.io
ORM:        Prisma
Auth:       JWT (RS256)
Encryption: @signalapp/libsignal-client
Frontend:   React + Vite + TypeScript + Zustand
Styling:    TailwindCSS
```

**Catatan**: Tidak perlu Docker untuk development awal. Gunakan PostgreSQL dan Redis lokal.

---

## Database Schema (Minimal)

```sql
-- Core tables only, no bloat

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(50) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Signal Protocol Keys
CREATE TABLE user_identity_keys (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_key      BYTEA NOT NULL,  -- Ed25519 public key
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_pre_keys (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_id      INTEGER NOT NULL,
  public_key  BYTEA NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key_id)
);
CREATE INDEX idx_pre_keys_user_unused ON user_pre_keys(user_id, used) WHERE used = FALSE;

CREATE TABLE user_signed_pre_keys (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  key_id      INTEGER NOT NULL,
  public_key  BYTEA NOT NULL,
  signature   BYTEA NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (1-to-1 only for MVP)
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- Unique constraint: one conversation per user pair
CREATE UNIQUE INDEX idx_conv_pair ON conversation_participants(
  LEAST(user_id, (SELECT user_id FROM conversation_participants cp2
                  WHERE cp2.conversation_id = conversation_participants.conversation_id
                  AND cp2.user_id != conversation_participants.user_id)),
  GREATEST(user_id, (SELECT user_id FROM conversation_participants cp2
                     WHERE cp2.conversation_id = conversation_participants.conversation_id
                     AND cp2.user_id != conversation_participants.user_id))
);

-- Messages (encrypted)
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),

  -- Encrypted content (client encrypts, server stores blob)
  ciphertext      BYTEA,  -- NULL when deleted

  -- Edit/Delete support (privacy-first: no history stored)
  is_deleted      BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,  -- NULL if never edited

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ
);

-- CRITICAL: Proper indexing for performance
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Sessions (for JWT refresh tokens)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
```

**Total: 7 tables** (vs 10+ di requirements asli)

---

## Edit/Delete Messages (Privacy-First)

### Prinsip
- **No history**: Edit/delete tidak menyimpan versi lama
- **Hard delete**: Ciphertext dihapus permanen, bukan soft delete
- **Real-time sync**: Recipient langsung dapat notifikasi edit/delete
- **Time limit**: Edit hanya dalam 24 jam (mencegah abuse)

### Delete Flow
```
1. Sender klik delete
2. Client send DELETE /api/messages/:id
3. Server: SET ciphertext = NULL, is_deleted = TRUE
4. Server broadcast WebSocket "message:deleted" ke recipient
5. Recipient UI: replace message dengan "[Message deleted]"
6. Ciphertext TIDAK recoverable (privacy)
```

### Edit Flow
```
1. Sender edit message
2. Client encrypt plaintext baru dengan session key yang sama
3. Client send PUT /api/messages/:id { ciphertext: newCiphertext }
4. Server: UPDATE ciphertext, SET edited_at = NOW()
5. Server broadcast WebSocket "message:edited" ke recipient
6. Recipient decrypt dan update UI, show "edited" label
7. Versi lama TIDAK disimpan (privacy)
```

### Constraints
```typescript
// Validasi di backend
const MESSAGE_EDIT_WINDOW_HOURS = 24;
const MAX_EDITS_PER_MESSAGE = 10;  // Prevent spam, tapi tidak track history

// Check edit eligibility
function canEditMessage(message: Message): boolean {
  const hoursSinceCreated = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= MESSAGE_EDIT_WINDOW_HOURS && !message.is_deleted;
}
```

### Mengapa TIDAK soft delete tradisional?
| Soft Delete | Hard Delete (kita pilih) |
|-------------|--------------------------|
| Data masih ada di DB | Data benar-benar hilang |
| Bisa di-recover admin | Tidak bisa di-recover siapapun |
| Privacy concern | **Privacy-first** |
| Butuh cleanup job | Clean by default |

---

## API Endpoints (Minimal)

```
Auth (4 endpoints):
POST   /api/auth/register     - Create account
POST   /api/auth/login        - Login, get tokens
POST   /api/auth/refresh      - Refresh access token
POST   /api/auth/logout       - Invalidate session

Users (3 endpoints):
GET    /api/users/me          - Get own profile
PUT    /api/users/me          - Update profile
GET    /api/users/search      - Search users by email/name

Keys (2 endpoints):
GET    /api/keys/:userId      - Get user's pre-key bundle (for E2EE handshake)
POST   /api/keys/replenish    - Upload new pre-keys when running low

Conversations (3 endpoints):
GET    /api/conversations                     - List conversations
POST   /api/conversations                     - Create/get conversation with user
GET    /api/conversations/:id/messages        - Get messages (paginated)

Messages (4 endpoints):
POST   /api/messages                          - Send encrypted message
PUT    /api/messages/:id                      - Edit message (re-encrypt)
DELETE /api/messages/:id                      - Delete message
POST   /api/messages/:id/read                 - Mark as read

WebSocket Events (7 events):
→ message:send          - Client sends message
← message:received      - Server broadcasts to recipient
← message:delivered     - Delivery confirmation
← message:read          - Read receipt
← message:edited        - Message was edited
← message:deleted       - Message was deleted
← error                 - Error notification
```

**Total: 16 endpoints + 7 WebSocket events** (vs 30+ di requirements asli)

---

## Arsitektur Performance-Ready

### 1. Database Design Principles

```typescript
// ✅ CURSOR-BASED PAGINATION (scalable)
// Tidak pakai OFFSET - akan lambat di dataset besar
GET /api/conversations/:id/messages?cursor=<last_message_id>&limit=20

// Query:
SELECT * FROM messages
WHERE conversation_id = $1
  AND created_at < (SELECT created_at FROM messages WHERE id = $cursor)
ORDER BY created_at DESC
LIMIT 20;

// ❌ JANGAN: OFFSET pagination
// SELECT * FROM messages OFFSET 1000 LIMIT 20; -- SLOW!
```

### 2. Connection Pooling (Prisma)

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Environment: ?connection_limit=10&pool_timeout=10
// DATABASE_URL="postgresql://user:pass@localhost:5432/chatapp?connection_limit=10"
```

### 3. Efficient Message Loading

```typescript
// services/message.service.ts

interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 20
): Promise<MessagePage> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor && {
        createdAt: { lt: new Date(cursor) }
      })
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch 1 extra to check hasMore
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return {
    messages,
    nextCursor: messages.length > 0
      ? messages[messages.length - 1].createdAt.toISOString()
      : null,
    hasMore
  };
}
```

### 4. WebSocket Connection Management

```typescript
// services/socket.service.ts

class SocketManager {
  private connections = new Map<string, Socket>(); // userId -> socket

  // Single connection per user (MVP - no multi-device)
  handleConnection(socket: Socket, userId: string) {
    // Disconnect existing connection if any
    const existing = this.connections.get(userId);
    if (existing) {
      existing.disconnect(true);
    }

    this.connections.set(userId, socket);

    socket.on('disconnect', () => {
      this.connections.delete(userId);
    });
  }

  // Direct send - O(1) lookup
  sendToUser(userId: string, event: string, data: unknown) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
    // TODO: Queue for offline users (post-MVP)
  }
}
```

### 5. Frontend State Architecture

```typescript
// stores/messages.store.ts
import { create } from 'zustand';

interface MessagesState {
  // Normalized state - O(1) lookups
  byId: Record<string, Message>;
  // Ordered IDs per conversation
  byConversation: Record<string, string[]>;

  // Pagination state
  cursors: Record<string, string | null>;
  hasMore: Record<string, boolean>;

  // Actions
  addMessage: (msg: Message) => void;
  setMessages: (convId: string, msgs: Message[], cursor: string | null, hasMore: boolean) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  byId: {},
  byConversation: {},
  cursors: {},
  hasMore: {},

  addMessage: (msg) => set((state) => ({
    byId: { ...state.byId, [msg.id]: msg },
    byConversation: {
      ...state.byConversation,
      [msg.conversationId]: [
        msg.id,
        ...(state.byConversation[msg.conversationId] || [])
      ]
    }
  })),

  setMessages: (convId, msgs, cursor, hasMore) => set((state) => {
    const newById = { ...state.byId };
    const ids: string[] = [];

    for (const msg of msgs) {
      newById[msg.id] = msg;
      ids.push(msg.id);
    }

    return {
      byId: newById,
      byConversation: {
        ...state.byConversation,
        [convId]: [...(state.byConversation[convId] || []), ...ids]
      },
      cursors: { ...state.cursors, [convId]: cursor },
      hasMore: { ...state.hasMore, [convId]: hasMore }
    };
  })
}));
```

### 6. Optimistic Updates

```typescript
// hooks/useSendMessage.ts

function useSendMessage() {
  const addMessage = useMessagesStore(s => s.addMessage);
  const updateMessage = useMessagesStore(s => s.updateMessage);

  const sendMessage = async (conversationId: string, plaintext: string) => {
    // 1. Generate temporary ID
    const tempId = `temp-${Date.now()}`;

    // 2. Encrypt message (Signal Protocol)
    const ciphertext = await encryptMessage(conversationId, plaintext);

    // 3. Optimistic update - show immediately
    addMessage({
      id: tempId,
      conversationId,
      content: plaintext, // Store plaintext locally
      status: 'sending',
      createdAt: new Date()
    });

    try {
      // 4. Send to server
      const response = await api.post('/messages', {
        conversationId,
        ciphertext
      });

      // 5. Replace temp with real message
      updateMessage(tempId, {
        id: response.data.id,
        status: 'sent'
      });
    } catch (error) {
      // 6. Mark as failed
      updateMessage(tempId, { status: 'failed' });
    }
  };

  return { sendMessage };
}
```

---

## Signal Protocol Integration (Simplified)

### Key Generation (On Registration)

```typescript
// services/crypto.service.ts
import * as signal from '@signalapp/libsignal-client';

async function generateKeys() {
  // Identity key pair (long-term)
  const identityKeyPair = signal.PrivateKey.generate();

  // Signed pre-key (rotate weekly)
  const signedPreKey = signal.PrivateKey.generate();
  const signedPreKeySignature = identityKeyPair.sign(
    signedPreKey.getPublicKey().serialize()
  );

  // One-time pre-keys (batch of 100)
  const preKeys: PreKey[] = [];
  for (let i = 0; i < 100; i++) {
    preKeys.push({
      keyId: i,
      keyPair: signal.PrivateKey.generate()
    });
  }

  return {
    identityKeyPair,
    signedPreKey: { keyId: 0, keyPair: signedPreKey, signature: signedPreKeySignature },
    preKeys
  };
}
```

### X3DH Key Exchange (Starting Conversation)

```typescript
// Simplified flow - use library's built-in functions
async function initiateSession(recipientId: string) {
  // 1. Fetch recipient's pre-key bundle
  const bundle = await api.get(`/keys/${recipientId}`);

  // 2. Create session using Signal library
  const session = await signal.SessionBuilder.processPreKeyBundle(
    bundle.identityKey,
    bundle.signedPreKey,
    bundle.signedPreKeySignature,
    bundle.preKey // one-time, consumed after use
  );

  // 3. Store session locally (IndexedDB)
  await sessionStore.save(recipientId, session);

  return session;
}
```

### Message Encryption/Decryption

```typescript
async function encryptMessage(recipientId: string, plaintext: string): Promise<Uint8Array> {
  const session = await sessionStore.get(recipientId);
  if (!session) {
    await initiateSession(recipientId);
  }

  // Signal Protocol handles Double Ratchet internally
  return session.encrypt(new TextEncoder().encode(plaintext));
}

async function decryptMessage(senderId: string, ciphertext: Uint8Array): Promise<string> {
  const session = await sessionStore.get(senderId);
  const plaintext = await session.decrypt(ciphertext);
  return new TextDecoder().decode(plaintext);
}
```

---

## Project Structure

```
chat-app/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── config/
│   │   │   └── env.ts            # Environment variables
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verification
│   │   │   ├── rateLimit.ts      # Rate limiting
│   │   │   └── errorHandler.ts   # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── conversation.routes.ts
│   │   │   └── message.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── socket.service.ts
│   │   └── types/
│   │       └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   └── chat/
│   │   │       ├── ConversationList.tsx
│   │   │       ├── MessageList.tsx
│   │   │       └── MessageInput.tsx
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   ├── conversations.store.ts
│   │   │   └── messages.store.ts
│   │   ├── services/
│   │   │   ├── api.ts            # Axios instance
│   │   │   ├── socket.ts         # Socket.io client
│   │   │   └── crypto.ts         # Signal Protocol
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       └── useMessages.ts
│   ├── package.json
│   └── vite.config.ts
│
├── MVP_LEAN.md        # This file
├── CLAUDE.md          # AI context
└── .env.example
```

---

## Development Timeline (8-12 minggu)

### Minggu 1-2: Foundation
- [ ] Setup monorepo (backend + frontend)
- [ ] PostgreSQL + Prisma schema
- [ ] Basic Express server dengan TypeScript
- [ ] Auth endpoints (register, login, logout)
- [ ] JWT middleware

### Minggu 3-4: Signal Protocol
- [ ] Integrate @signalapp/libsignal-client
- [ ] Key generation on registration
- [ ] Pre-key bundle endpoints
- [ ] X3DH key exchange implementation
- [ ] Session storage (IndexedDB)

### Minggu 5-6: Messaging Core
- [ ] Conversation creation
- [ ] Message encryption/decryption
- [ ] Send message endpoint
- [ ] Get messages (cursor pagination)
- [ ] WebSocket setup

### Minggu 7-8: Real-time
- [ ] Socket.io authentication
- [ ] Real-time message delivery
- [ ] Delivery confirmation
- [ ] Read receipts
- [ ] Reconnection handling

### Minggu 9-10: Frontend
- [ ] React app setup
- [ ] Auth screens (login, register)
- [ ] Conversation list
- [ ] Chat screen
- [ ] Message sending with optimistic updates

### Minggu 11-12: Polish & Deploy
- [ ] Error handling
- [ ] Loading states
- [ ] Basic responsive design
- [ ] Deploy ke VPS
- [ ] Manual testing

---

## Apa yang TIDAK dilakukan di MVP

1. **Tidak** menulis custom crypto - gunakan library Signal Protocol
2. **Tidak** over-engineer error handling - simple try/catch dulu
3. **Tidak** menulis unit test untuk semua fungsi - fokus ke integration test untuk happy path
4. **Tidak** setup CI/CD - deploy manual dulu
5. **Tidak** optimasi prematur - profile dulu setelah ada real users
6. **Tidak** mobile app - web only
7. **Tidak** Docker untuk development - jalankan services lokal

---

## Keputusan Arsitektur yang FIXED (tidak boleh diubah)

1. **Cursor-based pagination** untuk messages
2. **Normalized state** di frontend (byId + ordered arrays)
3. **Signal Protocol** via library (bukan custom)
4. **PostgreSQL indexes** sesuai query patterns
5. **WebSocket per-user** (bukan per-conversation)
6. **JWT di memory** (bukan localStorage)
7. **Optimistic updates** untuk message sending

---

## Metric Success MVP

- [ ] User bisa register dan login
- [ ] User bisa search user lain
- [ ] User bisa mulai conversation
- [ ] Messages terenkripsi end-to-end (verifiable)
- [ ] Real-time delivery < 1 detik (same network)
- [ ] Load 100 messages < 500ms
- [ ] No memory leak setelah 1 jam usage
