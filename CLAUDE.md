# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Privacy-first, end-to-end encrypted chat application using the Signal Protocol.

**Status**: Pre-development, planning complete
**Approach**: Lean MVP - minimal features, performance-ready architecture
**License**: AGPL-3.0

## Key Documents

- `MVP_LEAN.md` - **Read this first** - Simplified scope, architecture decisions, timeline
- `CHAT_APP_REQUIREMENTS.md` - Full requirements (reference only, MVP uses subset)

## Tech Stack

```
Backend:    Node.js 20+ / Express / TypeScript / Prisma
Database:   PostgreSQL 15+
Cache:      Redis (sessions + rate limiting)
Real-time:  Socket.io
Encryption: @signalapp/libsignal-client
Frontend:   React 18 / Vite / TypeScript / Zustand / TailwindCSS
```

## MVP Scope (8-12 weeks)

**Include:**
- Email/password auth (no email verification for MVP)
- 1-to-1 messaging with E2EE (Signal Protocol)
- Real-time delivery via WebSocket
- Message status (sent/delivered/read)
- Edit/delete messages (privacy-first: no history stored)
- Web app only

**Exclude (post-MVP):**
- Image sharing, typing indicators, online status
- Multi-device support
- Group chat, mobile apps
- Search, block users

## Architecture Decisions (FIXED)

These patterns are chosen for long-term performance and cannot be changed:

1. **Cursor-based pagination** - Not OFFSET (scales with data size)
2. **Normalized state** - `byId` + ordered arrays in frontend stores
3. **Signal Protocol via library** - Never custom crypto
4. **Optimistic updates** - Show message immediately, confirm async
5. **WebSocket per-user** - Single connection, not per-conversation
6. **JWT in memory only** - Never localStorage for tokens
7. **Hard delete for messages** - No soft delete, ciphertext removed permanently (privacy-first)
8. **No edit history** - Edit replaces ciphertext, old version not stored

## Database Schema (7 tables)

```
users                    - Basic user info
user_identity_keys       - Signal Protocol identity keys
user_pre_keys           - One-time pre-keys (batch of 100)
user_signed_pre_keys    - Signed pre-key (rotate weekly)
conversations           - 1-to-1 conversations
conversation_participants
messages                - Encrypted blobs (ciphertext, is_deleted, edited_at)
sessions                - JWT refresh tokens
```

**Critical indexes:**
- `idx_messages_conv_created` - For paginated message loading
- `idx_pre_keys_user_unused` - For fast pre-key lookup

## API Structure (16 endpoints)

```
Auth:           POST /api/auth/{register,login,refresh,logout}
Users:          GET/PUT /api/users/me, GET /api/users/search
Keys:           GET /api/keys/:userId, POST /api/keys/replenish
Conversations:  GET/POST /api/conversations, GET .../messages
Messages:       POST /api/messages, PUT/DELETE .../id, POST .../read
```

## Project Structure

```
chat-app/
├── backend/
│   └── src/
│       ├── config/       # Environment
│       ├── middleware/   # auth, rateLimit, errorHandler
│       ├── routes/       # Express routes
│       ├── services/     # Business logic
│       └── types/
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── stores/       # Zustand stores
│       ├── services/     # API, socket, crypto
│       └── hooks/
├── MVP_LEAN.md
└── CLAUDE.md
```

## Commands (when project is set up)

```bash
# Backend
npm run dev              # Start with hot reload
npm run build            # Production build
npm test                 # Run tests
npm run db:push          # Push Prisma schema
npm run db:migrate       # Run migrations

# Frontend
npm run dev              # Vite dev server
npm run build            # Production build
npm test                 # Vitest
```

## Code Patterns

### Message Pagination (cursor-based)
```typescript
// Always use cursor, never OFFSET
const messages = await prisma.message.findMany({
  where: {
    conversationId,
    ...(cursor && { createdAt: { lt: new Date(cursor) } })
  },
  orderBy: { createdAt: 'desc' },
  take: limit + 1  // +1 to check hasMore
});
```

### Frontend State (normalized)
```typescript
// stores/messages.store.ts
interface State {
  byId: Record<string, Message>;           // O(1) lookup
  byConversation: Record<string, string[]>; // Ordered IDs
}
```

### Optimistic Updates
```typescript
// 1. Add temp message with status 'sending'
// 2. Send to server
// 3. On success: update to real ID, status 'sent'
// 4. On error: status 'failed'
```

## Security Rules

- Use `@signalapp/libsignal-client` - never implement crypto yourself
- Store JWT access token in memory only
- Refresh token in httpOnly cookie
- All queries must be parameterized (Prisma handles this)
- Validate all input server-side
- Delete = hard delete (ciphertext removed, not recoverable)
- Edit = replace ciphertext (no version history)

## What NOT to do

- Don't use OFFSET pagination
- Don't store sensitive data in localStorage
- Don't implement custom encryption
- Don't add features not in MVP_LEAN.md scope
- Don't over-engineer error handling
- Don't write unit tests for everything - integration tests for happy path first
