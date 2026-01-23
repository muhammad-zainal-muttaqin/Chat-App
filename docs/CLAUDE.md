# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Privacy-first, ultra-lightweight chat application with E2E encryption. **Zero infrastructure cost**.

**Status**: Pre-development, planning complete
**Approach**: Serverless with Convex - no backend server needed
**License**: AGPL-3.0

## Key Documents

- `docs/MVP_LEAN.md` - **Read this first** - Architecture, schema, timeline
- `docs/CHAT_APP_REQUIREMENTS.md` - Full requirements (reference only)

## Tech Stack (Serverless)

```
Backend:     Convex (free tier)        - DB + real-time + auth + functions
Frontend:    Preact + Vite             - 3KB vs React 40KB
Encryption:  libsodium.js              - 25KB, client-side E2EE
Styling:     UnoCSS                    - Faster than Tailwind
Hosting:     Vercel (free plan)        - Frontend + CDN + SSL
```

**Total infrastructure cost: $0/month**

## MVP Scope (4-6 weeks)

**Include:**
- Email/password auth (Convex Auth)
- 1-to-1 messaging with E2EE (libsodium.js)
- Real-time delivery (Convex subscriptions)
- Message status (sent/delivered/read)
- Edit/delete messages (privacy-first: no history)
- Web app only

**Exclude (post-MVP):**
- Image sharing, typing indicators
- Multi-device, group chat, mobile
- Signal Protocol (Phase 2)

## Architecture

```
┌─────────────────────────────────────────┐
│  VERCEL (FREE)                          │
│  Frontend: Preact + libsodium.js        │
│  CDN + SSL + Custom Domain              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  CONVEX (FREE)                          │
│  - Database (1GB)                       │
│  - Real-time subscriptions              │
│  - Serverless functions                 │
│  - Auth                                 │
└─────────────────────────────────────────┘

Total cost: $0/month
```

## Database Schema (Convex)

```typescript
// convex/schema.ts
users: {
  email, displayName, publicKey  // X25519 key
}

conversations: {
  participantIds[]  // Array of 2 user IDs
}

messages: {
  conversationId, senderId,
  ciphertext, nonce,           // Encrypted content
  isDeleted, editedAt,         // Privacy-first
  deliveredAt, readAt
}
```

**3 tables total** (no sessions table - Convex Auth handles it)

## Convex Functions

```typescript
// Queries (real-time, auto-updating)
users.getMe
users.search
conversations.list
conversations.getMessages

// Mutations
messages.send
messages.edit
messages.delete
messages.markRead
```

## Project Structure

```
chat-app/
├── convex/              # Backend (serverless)
│   ├── schema.ts        # Database schema
│   ├── auth.ts          # Auth config
│   ├── users.ts         # User functions
│   ├── conversations.ts # Conversation functions
│   └── messages.ts      # Message functions
├── src/                 # Frontend (Preact)
│   ├── components/
│   ├── lib/crypto.ts    # libsodium.js
│   └── hooks/
└── package.json
```

## Commands

```bash
npm run dev          # Vite + Convex dev server
npm run build        # Production build
npx convex dev       # Convex dev (auto-runs with npm run dev)
npx convex deploy    # Deploy Convex functions
```

## Code Patterns

### Real-time Data (No WebSocket Setup!)
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Auto-updates when data changes
const messages = useQuery(api.conversations.getMessages, { conversationId });
const sendMessage = useMutation(api.messages.send);
```

### Encryption (libsodium.js)
```typescript
import sodium from 'libsodium-wrappers-sumo';

// Encrypt
const ciphertext = sodium.crypto_box_easy(message, nonce, recipientPubKey, senderPrivKey);

// Decrypt
const plaintext = sodium.crypto_box_open_easy(ciphertext, nonce, senderPubKey, recipientPrivKey);
```

## Security Rules

- Client encrypts BEFORE sending to Convex
- Convex stores only ciphertext (cannot decrypt)
- Delete = set ciphertext to null (hard delete)
- Edit = replace ciphertext (no history)
- Private keys never leave client device

## What NOT to do

- Don't store plaintext messages in Convex
- Don't implement custom crypto (use libsodium)
- Don't add backend server (use Convex)
- Don't use React (use Preact)
- Don't use Socket.io (Convex = real-time)
- Don't use Zustand/Redux (Convex = state)
- Don't keep edit/delete history
