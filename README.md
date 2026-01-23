# Priva Chat

End-to-end encrypted chat application built with Preact + Convex + libsodium.js.

## Features

- End-to-end encryption using libsodium.js (X25519 + XSalsa20-Poly1305)
- Real-time messaging via Convex
- Message editing and deletion (privacy-first: no history stored)
- Read receipts
- Mobile-responsive design

## Tech Stack

- **Frontend**: Preact + Vite + TypeScript
- **Backend**: Convex (serverless)
- **Encryption**: libsodium.js
- **Styling**: UnoCSS

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Setup Convex

```bash
bunx convex dev
```

This will:
- Create a new Convex project (if needed)
- Generate the `convex/_generated` folder
- Start the Convex development server

### 3. Configure environment

Copy `.env.example` to `.env` and set your Convex URL:

```bash
cp .env.example .env
```

The Convex URL will be shown when you run `bunx convex dev`.

### 4. Start development server

```bash
bun run dev
```

Open http://localhost:5173 in your browser.

## Deployment

### Deploy Convex

```bash
bunx convex deploy
```

### Deploy Frontend to Netlify

You can deploy manually or connect your repository to Netlify.

**Manual Deployment:**
```bash
bun run build
bunx netlify deploy --prod
```

**Automatic Deployment:**
Connect your GitHub/GitLab repository to Netlify. The `netlify.toml` file handles the configuration.

## Project Structure

```
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── auth.ts           # Authentication
│   ├── users.ts          # User queries/mutations
│   ├── conversations.ts  # Conversation functions
│   └── messages.ts       # Message functions
├── src/                  # Frontend
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities (crypto, etc.)
└── ...
```

## Security

- Messages are encrypted client-side before being sent to Convex
- Convex stores only ciphertext - cannot decrypt messages
- Private keys never leave the client device
- Deleted messages have their ciphertext permanently removed
- Edited messages replace the ciphertext (no history)

## License

AGPL-3.0
