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
| Edit/delete messages | Kontrol penuh atas data |
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

## Tech Stack (Ultra-Lightweight dengan Convex)

```
Database:    Convex (free tier)        ← Real-time DB + serverless functions
Real-time:   Convex subscriptions      ← Built-in, no WebSocket server needed
Auth:        Convex Auth               ← Built-in auth system
Encryption:  libsodium.js (25KB)       ← Client-side E2EE
Frontend:    Preact + Vite + TypeScript
State:       Convex React hooks        ← Real-time state dari Convex
Styling:     UnoCSS
Hosting:     Vercel (free plan)        ← Frontend + CDN + SSL
```

### Kenapa Convex?

| Traditional Stack | Convex | Savings |
|-------------------|--------|---------|
| PostgreSQL + PgBouncer | ✅ Included | No DB management |
| Redis pub/sub | ✅ Included | No cache server |
| WebSocket server (ws) | ✅ Included | No WS management |
| Fastify API server | ✅ Included | No backend server |
| VPS ($5-20/month) | **$0** | Free tier covers MVP |

### Convex Free Tier Limits

```
Functions:     Unlimited (with rate limits)
Database:      1GB storage
Bandwidth:     Generous (unmetered for small apps)
Real-time:     Unlimited subscriptions
File storage:  1GB
```

### Arsitektur Baru (Serverless)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Preact + Convex Client + libsodium.js                      │
│  Hosted on: Vercel/Netlify (FREE)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONVEX (FREE TIER)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Database   │  │  Real-time  │  │  Functions  │         │
│  │  (1GB free) │  │  Subscript. │  │  (serverless)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘

Total infrastructure cost: $0/month
```

### Kapan Butuh VPS (2 vCPU, 1GB)?

VPS hanya diperlukan jika:
1. **Custom auth** - OAuth providers yang tidak didukung Convex
2. **File processing** - Image compression sebelum upload
3. **External integrations** - Email service, push notifications
4. **Scale beyond free tier** - Jika traffic tinggi

Untuk MVP: **VPS tidak diperlukan**

---

## Database Schema (Convex)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (auth handled by Convex Auth)
  users: defineTable({
    email: v.string(),
    displayName: v.string(),
    publicKey: v.string(),  // X25519 public key (Base64)
  })
    .index("by_email", ["email"]),

  // Conversations (1-to-1)
  conversations: defineTable({
    participantIds: v.array(v.id("users")),  // Exactly 2 users
  })
    .index("by_participants", ["participantIds"]),

  // Messages (encrypted)
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    ciphertext: v.union(v.string(), v.null()),  // Base64, null when deleted
    ciphertextSelf: v.union(v.string(), v.null()), // Encrypted for sender (self)
    nonce: v.string(),                           // Base64 nonce
    isDeleted: v.boolean(),
    editedAt: v.union(v.number(), v.null()),    // Timestamp, null if never edited
    deliveredAt: v.union(v.number(), v.null()),
    readAt: v.union(v.number(), v.null()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_time", ["conversationId", "_creationTime"]),
});
```

**Total: 3 tables** (users, conversations, messages)

### Kenapa Lebih Sedikit Tables?

| PostgreSQL | Convex | Alasan |
|------------|--------|--------|
| users + user_keys | **users** | Public key jadi field di users |
| conversations + participants | **conversations** | participantIds array, no join table |
| sessions | **Tidak perlu** | Convex Auth handles sessions |
| messages | **messages** | Same |

### Convex Indexes

```typescript
// Convex auto-indexes _id dan _creationTime
// Custom indexes untuk query patterns:

.index("by_conversation_time", ["conversationId", "_creationTime"])
// Untuk: Get messages by conversation, sorted by time (pagination)

.index("by_email", ["email"])
// Untuk: Find user by email (login/search)

.index("by_participants", ["participantIds"])
// Untuk: Find existing conversation between 2 users
```

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

## Convex Functions (API)

```typescript
// convex/functions struktur

// Auth (Convex Auth built-in)
auth.signUp          - Register dengan email/password
auth.signIn          - Login
auth.signOut         - Logout
// Session management otomatis oleh Convex

// Users (queries & mutations)
users.getMe          - Get current user profile
users.update         - Update profile
users.search         - Search by email/displayName
users.getPublicKey   - Get user's public key

// Conversations
conversations.list   - List user's conversations (real-time)
conversations.getOrCreate - Find/create conversation with user
conversations.getMessages - Get messages (paginated, real-time)

// Messages
messages.send        - Send encrypted message
messages.edit        - Edit (re-encrypt)
messages.delete      - Hard delete
messages.markRead    - Mark as read
messages.markDelivered - Mark as delivered
```

### Real-time Subscriptions (Automatic!)

```typescript
// Frontend - data auto-update tanpa WebSocket manual
const conversations = useQuery(api.conversations.list);
const messages = useQuery(api.conversations.getMessages, { conversationId });

// Convex handles:
// ✅ Real-time sync (otomatis)
// ✅ Optimistic updates
// ✅ Offline support
// ✅ Reconnection
```

**Total: 12 functions** (no manual WebSocket, Convex handles real-time)

---

## Scaling dengan Convex

### Convex Handles Everything

```
┌─────────────────────────────────────────────────────────────┐
│                    CONVEX INFRASTRUCTURE                     │
│                                                              │
│  ✅ Auto-scaling (kamu tidak perlu manage)                  │
│  ✅ Global edge network                                      │
│  ✅ Real-time sync (built-in)                               │
│  ✅ Connection pooling (automatic)                          │
│  ✅ Database replication (automatic)                        │
│                                                              │
│  Free tier handles: ~1000 concurrent users easily           │
│  Paid tier: Unlimited scaling                               │
└─────────────────────────────────────────────────────────────┘
```

### Free Tier Realistic Capacity

```
Convex Free Tier dapat handle:
├── Concurrent users:      ~500-1000
├── Messages per day:      ~50,000
├── Database storage:      1GB (~500K messages)
└── Real-time connections: Unlimited
```

### Kapan Upgrade dari Free Tier?

| Metric | Free Tier Limit | Action |
|--------|-----------------|--------|
| Storage > 1GB | ~500K messages | Upgrade atau implement message retention |
| High traffic | Rate limited | Upgrade to paid ($25/month) |
| Need more regions | US only | Upgrade for global edge |

### VPS (2 vCPU, 1GB) - Optional Uses

Jika nanti butuh VPS, gunakan untuk:
```
1. Image compression service (Sharp.js)
2. Email sending (Nodemailer)
3. Push notification server
4. Custom analytics

NOT for:
- Database (use Convex)
- WebSocket (use Convex)
- API server (use Convex)
```

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

### 4. Real-time dengan Convex (Zero Config)

```typescript
// Frontend - real-time subscriptions automatic
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function ChatScreen({ conversationId }) {
  // Auto-updates when new messages arrive
  // No WebSocket setup needed!
  const messages = useQuery(api.conversations.getMessages, {
    conversationId,
    limit: 20
  });

  const sendMessage = useMutation(api.messages.send);

  // Optimistic update built-in
  const handleSend = async (ciphertext: string, nonce: string) => {
    await sendMessage({ conversationId, ciphertext, nonce });
    // UI updates optimistically, then confirms with server
  };

  return (
    <MessageList messages={messages} />
  );
}
```

### Convex vs Manual WebSocket

| Aspect | Manual (ws + Redis) | Convex |
|--------|---------------------|--------|
| Setup code | ~200 lines | 0 lines |
| Connection management | Manual | Automatic |
| Reconnection | Manual | Automatic |
| Offline queue | Manual | Automatic |
| Optimistic updates | Manual | Built-in |
| Scaling | Redis pub/sub setup | Automatic |

### Memory Footprint

```
Your server:     0 KB (no server needed!)
Convex handles:  Everything

Comparison jika self-hosted:
  Socket.io: ~200MB for 10K connections
  ws:        ~20MB for 10K connections
  Convex:    $0, unlimited connections on free tier
```

### 5. Frontend dengan Convex (No State Management Needed)

```typescript
// Convex handles state automatically!
// No Zustand, no Redux, no state management library

// components/chat/MessageList.tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function MessageList({ conversationId }) {
  // Real-time, auto-updating, paginated
  const messages = useQuery(api.conversations.getMessages, {
    conversationId,
    limit: 20
  });

  // Loading state
  if (messages === undefined) return <Loading />;

  return (
    <div>
      {messages.map(msg => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
    </div>
  );
}

// components/chat/ConversationList.tsx
function ConversationList() {
  // Auto-updates when new conversations or messages arrive
  const conversations = useQuery(api.conversations.list);

  if (conversations === undefined) return <Loading />;

  return (
    <ul>
      {conversations.map(conv => (
        <ConversationItem key={conv._id} conversation={conv} />
      ))}
    </ul>
  );
}
```

### Frontend Bundle Size Target

```
Preact:           ~4KB gzipped
Convex client:    ~15KB gzipped
libsodium.js:     ~25KB gzipped
UnoCSS:           ~5KB gzipped
App code:         ~30KB gzipped
--------------------------------------
Total:            <80KB gzipped
```

### Tidak Perlu:
- ❌ Zustand/Redux (Convex = state)
- ❌ React Query/SWR (Convex = caching)
- ❌ Socket.io client (Convex = real-time)
- ❌ Axios (Convex = API calls)

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

## Encryption (Lightweight E2EE)

### Dua Opsi Encryption

| Opsi | Library | Size | Complexity | Security |
|------|---------|------|------------|----------|
| **A. Lightweight** | libsodium.js | ~25KB | Simple | Strong (no PFS) |
| **B. Full Signal** | libsignal | ~200KB | Complex | Strongest (PFS) |

**Rekomendasi MVP**: Opsi A dulu, upgrade ke Signal Protocol di Phase 2.

### Opsi A: Lightweight E2EE dengan libsodium.js

```typescript
// services/crypto.ts
import sodium from 'libsodium-wrappers-sumo';

await sodium.ready;

// Key Generation (on registration)
function generateKeyPair() {
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: sodium.to_base64(keyPair.publicKey),
    privateKey: keyPair.privateKey  // Store securely, never send to server
  };
}

// Encrypt message (sender side)
function encryptMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderPrivateKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const message = sodium.from_string(plaintext);

  const ciphertext = sodium.crypto_box_easy(
    message,
    nonce,
    recipientPublicKey,
    senderPrivateKey
  );

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce)
  };
}

// Decrypt message (recipient side)
function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array
): string {
  const decrypted = sodium.crypto_box_open_easy(
    sodium.from_base64(ciphertext),
    sodium.from_base64(nonce),
    senderPublicKey,
    recipientPrivateKey
  );

  return sodium.to_string(decrypted);
}
```

### Key Exchange Flow (Simplified X25519)

```
Registration:
1. Client generates X25519 key pair
2. Client sends PUBLIC key to server
3. Server stores public key
4. PRIVATE key stays on device only (IndexedDB encrypted)

Starting Conversation:
1. Alice fetches Bob's public key from server
2. Alice encrypts message with: crypto_box(message, nonce, bob_public, alice_private)
3. Server receives ciphertext (cannot decrypt)
4. Bob decrypts with: crypto_box_open(ciphertext, nonce, alice_public, bob_private)
```

### Database Schema untuk Lightweight Crypto

```sql
-- Simplified: hanya public key, tidak perlu pre-keys
CREATE TABLE user_keys (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_key    VARCHAR(64) NOT NULL,  -- Base64 encoded X25519 public key
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Messages menyimpan nonce bersama ciphertext
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  ciphertext      TEXT,          -- Base64 encoded, NULL when deleted
  nonce           VARCHAR(32),   -- Base64 encoded nonce
  is_deleted      BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ
);
```

### Kenapa Opsi A untuk MVP?

| Aspect | libsodium (Opsi A) | Signal Protocol (Opsi B) |
|--------|-------------------|-------------------------|
| Bundle size | ~25KB | ~200KB |
| Key management | 1 key pair | Identity + Pre-keys + Signed Pre-keys |
| Server complexity | Simple | Complex (pre-key replenishment) |
| Perfect Forward Secrecy | No | Yes |
| Time to implement | 1-2 days | 1-2 weeks |

**Trade-off**: Tanpa PFS, jika private key bocor, semua pesan lama bisa didekripsi. Untuk MVP dengan user base kecil, ini acceptable. Upgrade ke Signal Protocol saat scaling.

### Upgrade Path ke Signal Protocol (Phase 2)

```
1. Implement Signal Protocol alongside existing crypto
2. New conversations use Signal Protocol
3. Existing conversations stay on libsodium
4. Gradually migrate as users re-authenticate
5. Remove libsodium after 100% migration
```

---

## Project Structure (Convex)

```
chat-app/
├── convex/                        # Convex backend (serverless)
│   ├── _generated/               # Auto-generated types
│   ├── schema.ts                 # Database schema
│   ├── auth.ts                   # Auth functions
│   ├── users.ts                  # User queries/mutations
│   ├── conversations.ts          # Conversation functions
│   └── messages.ts               # Message functions
│
├── src/                          # Frontend (Preact)
│   ├── main.tsx                  # Entry point
│   ├── app.tsx                   # Root component + ConvexProvider
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── chat/
│   │       ├── ConversationList.tsx
│   │       ├── MessageList.tsx
│   │       └── MessageInput.tsx
│   ├── lib/
│   │   └── crypto.ts             # libsodium.js encryption
│   └── hooks/
│       └── useEncryption.ts      # Encryption hooks
│
├── public/
├── index.html
├── uno.config.ts
├── vite.config.ts
├── package.json
├── MVP_LEAN.md
└── CLAUDE.md
```

### File Count Comparison

| Traditional Stack | Convex Stack |
|-------------------|--------------|
| ~40 files | **~20 files** |
| Backend + Frontend | Frontend only |
| Complex setup | Simple setup |

---

## Development Timeline (4-6 minggu dengan Convex)

### Minggu 1: Setup + Auth
- [ ] Setup Vite + Preact + Convex
- [ ] Convex schema (users, conversations, messages)
- [ ] Convex Auth setup (email/password)
- [ ] libsodium.js integration
- [ ] Key generation on registration

### Minggu 2: Messaging Core
- [ ] Encryption/decryption functions
- [ ] Send message mutation
- [ ] Get messages query (paginated)
- [ ] Conversation creation
- [ ] Real-time subscriptions (automatic!)

### Minggu 3: Edit/Delete + UI
- [ ] Edit message mutation
- [ ] Delete message mutation
- [ ] Message status (delivered, read)
- [ ] Auth screens (login, register)
- [ ] Conversation list component

### Minggu 4: Chat UI + Polish
- [ ] Chat screen component
- [ ] Message bubbles
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

### Minggu 5-6: Testing + Deploy
- [ ] Manual testing
- [ ] Edge cases (offline, reconnect)
- [ ] Deploy frontend ke Vercel
- [ ] Domain setup
- [ ] Done! 🚀

### Timeline Comparison

| Task | Traditional | Convex |
|------|-------------|--------|
| Backend setup | 2 weeks | 0 (tidak ada backend) |
| Database setup | 1 week | 1 day |
| WebSocket | 2 weeks | 0 (built-in) |
| Auth | 1 week | 1 day |
| API endpoints | 2 weeks | 3 days |
| **Total** | **8-12 weeks** | **4-6 weeks** |

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
- [ ] Edit/delete messages berfungsi
- [ ] Real-time delivery < 500ms
- [ ] Frontend bundle < 100KB gzipped
- [ ] Works offline (Convex handles)
- [ ] $0/month infrastructure cost

## Cost Summary

| Item | Cost | Limit |
|------|------|-------|
| Convex Free | $0 | 1GB DB, unlimited real-time |
| Vercel Free | $0 | 100GB bandwidth/month |
| Domain (optional) | $10-15/year | - |
| **Total** | **$0/month** | ~10K active users |

## Upgrade Path

```
MVP (Free) - $0/month:
├── Convex Free (1GB, rate limited)
└── Vercel Free (100GB bandwidth)
    → Capacity: ~500-1000 concurrent users

Growth ($45/month):
├── Convex Pro ($25) - 10GB, no rate limits
└── Vercel Pro ($20) - 1TB bandwidth, analytics
    → Capacity: ~10,000+ concurrent users

Scale ($200+/month):
├── Convex Business - dedicated support, SLA
├── Vercel Enterprise - custom limits
└── + VPS for image processing if needed
    → Capacity: Unlimited
```
