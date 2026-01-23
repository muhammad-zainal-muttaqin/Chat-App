# Priva Chat

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://privachat.netlify.app)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-success)](https://github.com/muhammad-zainal-muttaqin/priva-chat)

End-to-end encrypted chat application built with Preact + Convex + libsodium.js.

🔒 **Privacy-first**: Your messages are encrypted end-to-end. We can't read them, even if we wanted to.

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

## Contributing

Kami menyambut kontribusi dari komunitas! Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan.

- 🐛 [Report Bug](https://github.com/yourusername/priva-chat/issues/new?template=bug_report.md)
- 💡 [Request Feature](https://github.com/yourusername/priva-chat/issues/new?template=feature_request.md)
- 📝 [Submit Pull Request](https://github.com/yourusername/priva-chat/compare)

Lihat juga [Code of Conduct](CODE_OF_CONDUCT.md) dan [Security Policy](SECURITY.md).

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Links

- 🌐 [Live Demo](https://privachat.netlify.app)
- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/priva-chat/issues)
- 🔒 [Security Policy](SECURITY.md)
