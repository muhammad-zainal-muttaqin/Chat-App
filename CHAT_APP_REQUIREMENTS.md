# Chat App Requirements Document

**Project**: Privacy-First Chat Application  
**Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Development Phase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Functional Requirements](#functional-requirements)
3. [Security Requirements](#security-requirements)
4. [Technical Stack](#technical-stack)
5. [Database Architecture](#database-architecture)
6. [API Specifications](#api-specifications)
7. [UI/UX Requirements](#uiux-requirements)
8. [Performance & Reliability](#performance--reliability)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Testing & Quality Assurance](#testing--quality-assurance)
11. [Development Phases](#development-phases)

---

## Project Overview

### Objective
Build a **privacy-first, end-to-end encrypted chat application** that enables secure communication between users through one-to-one and group conversations with image sharing capabilities.

### Key Principles
- **Privacy First**: End-to-end encryption by default for ALL messages
- **Zero-Knowledge Server**: Server cannot access user message content
- **Security-Auditable**: Open-source codebase for third-party verification
- **User-Centric**: Simple, intuitive interface without sacrificing security
- **Reliability**: Stable, offline-capable, auto-reconnect messaging

### Target Users
- Privacy-conscious individuals
- Small teams requiring secure communication
- Users in high-risk environments (journalists, activists, etc.)
- Anyone wanting secure group messaging with image sharing

---

## Functional Requirements

### 1. Authentication & User Management

#### 1.1 User Registration
- **Email-based signup** with email verification
- **Optional phone number** for contact verification
- **Password requirements**:
  - Minimum 12 characters
  - Must contain: uppercase, lowercase, numbers, special characters
  - Real-time strength indicator
- **Account creation** completes after email verification link
- **No personal data collection** beyond necessary (name, email, phone optional)

#### 1.2 User Login
- Email + password authentication
- **Remember device option** (optional, 30-day expiration)
- **Session management** with JWT tokens
- **Logout from all devices** option available
- **Failed login attempt** rate limiting (5 attempts → 15-min lockout)

#### 1.3 Password Management
- **Forgot password** flow with secure reset link
- **Change password** within app settings
- **Password reset** via email with time-limited link (1 hour)
- **No password recovery option** - user must create new password

#### 1.4 Profile Management
- **User profile fields**:
  - Display name (public)
  - Avatar/profile picture (optional)
  - Status/bio (optional, max 200 chars)
  - Account creation date (display-only)
- **Edit profile** anytime
- **Delete account** option (full data deletion after 30 days grace period)

---

### 2. One-to-One Chat

#### 2.1 Starting a Conversation
- **Search users** by email or display name
- **View user profile** before messaging
- **Create new direct chat** with selected user
- **Auto-create conversation** on first message

#### 2.2 Messaging
- **Send text messages** with real-time delivery
- **Message history** - infinite scroll upward to load older messages
- **Send status indicators**:
  - ⏱ Sending (gray)
  - ✓ Sent (gray)
  - ✓✓ Delivered (gray)
  - ✓✓ Read (blue)
- **Timestamp** for each message (sender's local time + server time)
- **Delete message** option for sender (soft delete - replaced with "message deleted")
- **Edit message** option (max 10 edits within 24 hours, shows "edited" label)

#### 2.3 Media Sharing
- **Upload images**:
  - Max file size: 10MB per image
  - Supported formats: JPG, PNG, WebP, GIF
  - Auto-compression for mobile (max 1080px width/height)
  - Thumbnail preview in chat
- **Download images** to device
- **Image caching** locally (encrypted)
- **Delete image** - can delete within 24 hours

#### 2.4 Real-Time Indicators
- **Online/Offline status**:
  - Online (green indicator)
  - Offline (gray indicator)
  - Last seen (timestamp when available)
- **Typing indicator**:
  - Shows "User is typing..." when other user actively typing
  - Debounced updates (every 1 second)
  - Disappears after 3 seconds of inactivity

#### 2.5 Conversation Management
- **Conversation list** shows:
  - User avatar
  - Display name
  - Last message preview (first 50 chars)
  - Timestamp of last message
  - Unread badge (count)
  - Muted indicator (if applicable)
- **Search conversations** by name or message content
- **Sort conversations** by most recent
- **Mute notifications** (1 hour, 24 hours, 1 week, forever)
- **Archive conversation** (hide without deleting)
- **Delete conversation** with option to retain/delete message history
- **Mark all as read** action

---

### 3. Group Chat

#### 3.1 Group Creation
- **Create new group** with:
  - Group name (required, max 50 chars)
  - Group description (optional, max 200 chars)
  - Group icon/avatar (optional, JPG/PNG)
  - Initial members (search and select multiple)
- **Only creator** can rename/modify group initially
- **Auto-generate group ID** (unique, non-sequential)

#### 3.2 Group Management
- **Group info page** showing:
  - Group name & description
  - Group creation date
  - Member count
  - All member profiles with join date
  - Group icon
- **Edit group** (name, description, icon) - creator/admins only
- **Member management**:
  - View all members
  - See join date for each member
  - Remove members (creator/admin)
  - Invite new members via search
  - Leave group option
- **Group notifications settings**:
  - Mute/unmute notifications
  - Show/hide group in sidebar

#### 3.3 Group Messaging
- **Send messages** to group (all members receive)
- **Group message indicators**:
  - Sent, Delivered, Read by (count)
  - See "Read by X members" on click
- **@mentions** (optional - tag specific members)
- **Message editing** - same as 1-to-1 (10 edits, 24 hours)
- **Message deletion** - soft delete
- **Group history**:
  - New members see full history
  - Can scroll up infinitely
  - Search within group messages

#### 3.4 Group Media
- **Image sharing** same as 1-to-1
- **Group album** (optional) - view all group images
- **Download/delete** images (same rules as 1-to-1)

#### 3.5 Group Permissions
- **Creator/Admin roles** (future feature, minimal MVP):
  - Can edit group info
  - Can remove members
  - Can promote/demote members
- **Regular member**:
  - Can send messages
  - Can share media
  - Can leave group

---

### 4. Notifications

#### 4.1 In-App Notifications
- **New message alert** - toast notification at top
- **Unread badge** - number on conversation/group
- **Typing indicator** - inline in chat

#### 4.2 Push Notifications (Mobile)
- **Background notification** when app is closed
- **Badge count** on app icon
- **Sound alert** (enabled by default, user can disable)
- **Vibration** (enabled by default, user can disable)
- **Custom notification** for mentions in groups
- **Do Not Disturb** option - silence notifications for set period

#### 4.3 Notification Preferences
- **Per-conversation muting**:
  - Mute for 1 hour / 24 hours / 1 week / forever
- **Global notification settings**:
  - Enable/disable notifications
  - Enable/disable sounds
  - Enable/disable vibration
  - Badge count setting
- **Do Not Disturb mode** (specific hours or always)

---

### 5. Search

#### 5.1 Message Search
- **Search within conversation** by keyword
- **Full-text search** across all messages
- **Search filters** (optional):
  - Date range
  - From specific user (in groups)
  - Media only
- **Search results** show:
  - Message preview
  - Timestamp
  - Sender name
  - Context (2 messages before/after)
- **Jump to message** in chat

#### 5.2 User Search
- **Search users** by:
  - Email address
  - Display name
  - Partial matches
- **Display** user profile with option to start chat

#### 5.3 Group Search
- **Search groups** by name
- **Browse group info** before joining

---

### 6. User Presence & Status

#### 6.1 Online Status
- **Show online indicator** in conversation list
- **Show in profile** - current online status
- **Last seen** timestamp (when offline)
- **Update presence** in real-time (WebSocket)

#### 6.2 Typing Indicator
- **Show "User is typing..."** when user composing message
- **Disappear** after 3 seconds of no activity
- **Not sent** in groups with >50 members (performance)

---

### 7. Account Settings

#### 7.1 Privacy Settings
- **Who can message me**:
  - Anyone (default)
  - Contacts only
  - Nobody (private mode)
- **Show online status**:
  - Everyone
  - Contacts only
  - Nobody
- **Show last seen**:
  - Everyone
  - Contacts only
  - Nobody
- **Allow read receipts**:
  - Send read receipts (default: on)
  - Receive read receipts (default: on)
- **Disappearing messages** (optional):
  - Off (default)
  - 1 hour / 24 hours / 7 days / 30 days

#### 7.2 Security Settings
- **Change password**
- **View active sessions**:
  - Device name
  - IP address
  - Location (approximate)
  - Last activity
  - Logout option
- **Enable/disable biometric login** (fingerprint/face)
- **Two-factor authentication** (optional future feature)
- **Block user list**:
  - View blocked users
  - Unblock option
  - Blocked users can't: message, see online status, add to groups

#### 7.3 Notification Settings
- **Global notification toggle**
- **Sound/vibration toggles**
- **Badge count** option
- **Per-conversation** mute settings
- **Do Not Disturb** schedule

#### 7.4 Data & Privacy
- **Privacy policy** link
- **Terms of service** link
- **Delete account** option
- **Export data** option (optional future feature)
- **Clear cache** option
- **Clear message history** option (with warning)

---

## Security Requirements

### 1. End-to-End Encryption (E2EE)

#### 1.1 Encryption Protocol
- **Use Signal Protocol** (Double Ratchet Algorithm)
- **Key Exchange**: X3DH (Extended Triple Diffie-Hellman)
- **Symmetric Encryption**: AES-256-GCM
- **Authentication**: HMAC-SHA256
- **Hash Function**: SHA-256

#### 1.2 Message Encryption Flow
1. User types message: "Hello"
2. Generate random IV (16 bytes) using cryptographically secure RNG
3. Encrypt: `AES-256-GCM(plaintext, sessionKey, IV)`
4. Create authentication tag: `HMAC-SHA256(ciphertext + IV + metadata)`
5. Create payload: `{ciphertext, IV, HMAC, metadata}`
6. Send to server (server cannot decrypt)
7. Server stores encrypted blob
8. Server routes to recipient
9. Recipient verifies HMAC → decrypts with their session key
10. Invalid HMAC → discard message (tampering detected)

#### 1.3 Key Management
- **Identity Key Pair** (Ed25519):
  - 32-byte private key (stored only on device)
  - 32-byte public key (shared with contacts)
  - Generated once at account creation
  - Never transmitted to server
  - Backed up ONLY locally with password protection
- **Pre-Key Bundle** (generated at signup):
  - Signed Pre-Key (SPK) - 1 key, rotated weekly
  - Pre-Keys - batch of 100 one-time keys (replenished as used)
  - All signed with identity key
  - Rotated automatically
- **Session Keys**:
  - Derived per conversation using X3DH
  - Each message gets unique encryption key via ratcheting
  - Never stored on server
  - Automatically deleted after use (or ~30 days retention)

#### 1.4 Perfect Forward Secrecy (PFS)
- **Per-message key derivation**:
  - Message 1: `KDF(sessionKey, nonce1)` → `key1`
  - Message 2: `KDF(sessionKey, nonce2)` → `key2`
  - ...
  - If `key1` is compromised, `key2+` remain secure
- **Ratcheting implementation**:
  - Use HKDF (HMAC-based Key Derivation Function)
  - Double Ratchet with DH ratchet + KDF ratchet
  - Automatically update keys on every message

#### 1.5 Group Encryption
- **No group master key** (vulnerable)
- **Instead**: Each member has unique session key with sender
  - Alice → Group: encrypt with keys `{Bob's_key, Charlie's_key, Diana's_key}`
  - Server: decrypt separately for each recipient
  - No, server cannot decrypt: Server routes encrypted to each member
  - Each member decrypts with their unique key
- **Group metadata** encrypted:
  - Group member list
  - Group info changes
- **Add member**:
  - New member doesn't get old message history (unless explicitly shared)
  - Generates new session key with all existing members
  - Existing members rotate session keys with new member

---

### 2. Transport Security

#### 2.1 TLS/HTTPS
- **TLS 1.3 ONLY** (no fallback to older versions)
- **Certificate pinning** (public key pinning):
  - Pin server's certificate public key in app
  - Refresh every 90 days
  - Prevent MITM via compromised CA
- **Perfect Forward Secrecy** (TLS level):
  - Use ECDHE (Elliptic Curve Diffie-Hellman)
  - Cipher suite: `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
- **HSTS** (HTTP Strict Transport Security):
  - Enable HSTS header with `max-age=31536000` (1 year)
  - Include subdomains
- **Certificate validation**:
  - Verify certificate chain
  - Check certificate expiration
  - Verify hostname matches

#### 2.2 WebSocket Security (Real-Time)
- **Use WSS (WebSocket Secure)** - TLS wrapped
- **Certificate pinning** on WebSocket connection
- **Automatic reconnect** on disconnect (exponential backoff)
- **Token-based authentication** for WebSocket upgrade
- **Validate origin header** on server (prevent cross-origin WS hijacking)

---

### 3. Database Security

#### 3.1 Encryption at Rest
- **Database-level encryption**: PostgreSQL `pgcrypto`
- **Field-level encryption** for sensitive data:
  - User email (encrypted with master key)
  - Phone number (if stored, encrypted)
  - Message content (double-encrypted: once by client, once by DB)
- **Master encryption key**:
  - Stored in environment variable (not in code)
  - Rotated every 90 days
  - Backed by key management service (KMS) if using cloud
- **Backups**:
  - All backups must be encrypted
  - Encryption keys stored separately
  - Test restore procedures quarterly

#### 3.2 Database Access Control
- **Principle of least privilege**:
  - App backend: read/write only needed tables
  - Analytics: read-only limited tables
  - Admin: full access (audit every action)
- **No direct database access** from client
- **All queries** go through API backend
- **SQL injection prevention**:
  - Parameterized queries (always)
  - ORM with query escaping
  - Input validation
  - Prepared statements

#### 3.3 User Data Minimization
- **Collect only necessary data**:
  - Email (required)
  - Display name (required)
  - Phone (optional)
  - Avatar (optional)
  - NO IP addresses logged
  - NO location tracking
  - NO device fingerprinting
- **Retention policy**:
  - Messages: store indefinitely (user-controlled deletion)
  - Metadata: retain for 90 days only
  - Logs: retain for 30 days only
  - Delete on account deletion (30-day grace period)

---

### 4. Authentication & Authorization

#### 4.1 Password Security
- **Hashing algorithm**: Argon2id (not bcrypt)
  - Memory: 19 MB
  - Time cost: 2 iterations
  - Parallelism: 1
  - Salt: 16 bytes (random)
- **Password validation** on client:
  - Check strength in real-time
  - Require: uppercase, lowercase, number, special char, 12+ chars
  - Show strength meter
- **Prevent password reuse**:
  - Disallow last 5 passwords
  - Store hashes of old passwords (not plaintext)
- **Never log passwords**:
  - No password in logs, no password in error messages
  - No password in debug information

#### 4.2 Session Management
- **JWT (JSON Web Token)** for stateless sessions:
  - Signing algorithm: RS256 (RSA with SHA-256)
  - Expiration: 24 hours for access token
  - Refresh token: 30 days (stored in httpOnly cookie)
  - Include claims: `{sub, iat, exp, type, deviceId}`
- **Token rotation**:
  - New token every request (sliding expiration)
  - Old tokens invalidated immediately
- **Token storage**:
  - Access token: Memory only (cleared on logout)
  - Refresh token: httpOnly, Secure, SameSite=Strict cookie
  - NO localStorage for sensitive tokens
- **Logout**:
  - Clear tokens
  - Invalidate refresh token
  - Clear all sessions if requested

#### 4.3 Multi-Device Support
- **Device registration**:
  - Each device gets unique ID (generated locally, sent on login)
  - Device fingerprint: {os, app_version, device_model}
  - User can name device (e.g., "iPhone 15 Pro")
- **Session per device**:
  - Each device has own refresh token
  - Can revoke specific device
  - Can revoke all sessions at once
- **Cross-device sync**:
  - Messages synced via encrypted server
  - Pre-keys fetched on login (per-device)
  - Session keys per device (not shared)

---

### 5. API Security

#### 5.1 Rate Limiting
- **Global rate limit**: 1000 requests/minute per IP
- **Per-endpoint limits**:
  - Login: 5 attempts per 15 minutes (IP + email)
  - Register: 3 accounts per hour per IP
  - Send message: 100 messages per minute per user
  - Search: 30 searches per minute per user
  - File upload: 10 files per minute per user
- **Backoff strategy**: exponential backoff
  - 1st attempt failure: 1 second wait
  - 2nd: 2 seconds
  - 3rd: 4 seconds
  - ...
  - Max: 15 minutes

#### 5.2 Input Validation
- **All input validated** on server (never trust client)
- **Whitelist allowed characters** (e.g., names: alphanumeric, spaces, emoji)
- **Length limits**:
  - Display name: max 50 chars
  - Group name: max 100 chars
  - Message: max 5000 chars
  - Bio/status: max 200 chars
- **Email validation**: RFC 5322 compliant
- **File upload validation**:
  - File type (magic bytes, not just extension)
  - File size (max 10 MB)
  - MIME type validation
  - Scan for malware (ClamAV)
  - Re-encode images (strip metadata)

#### 5.3 API Response Security
- **No sensitive info in errors**:
  - ❌ "User email not found" (user enumeration)
  - ✅ "Invalid credentials"
  - ❌ Database error stack trace
  - ✅ "An error occurred, contact support"
- **Standard error format**:
  ```json
  {
    "error": "invalid_credentials",
    "message": "Invalid email or password",
    "timestamp": "2026-01-23T10:00:00Z"
  }
  ```
- **No server info leakage**:
  - Remove X-Powered-By header
  - Remove server version headers
  - Custom error pages
- **CORS policy**:
  - Whitelist origins only
  - No wildcard (`*`)
  - Credentials: false (for public API)

#### 5.4 CSRF Protection
- **Token-based CSRF protection**:
  - Generate unique token per session
  - Include in state-changing requests (POST, PUT, DELETE)
  - Validate before processing
- **SameSite cookie attribute**: `SameSite=Strict`
- **Stateless verification**:
  - For API: use JWT (immune to CSRF)
  - For web: use token header `X-CSRF-Token`

---

### 6. Client-Side Security

#### 6.1 Secure Storage
- **Web App**:
  - ❌ NO localStorage for sensitive data
  - ❌ NO sessionStorage for keys
  - ✅ Memory only for session keys
  - ✅ IndexedDB encrypted for cache (with encryption key in memory)
- **Mobile App (iOS)**:
  - ✅ Keychain for storing keys
  - ✅ Biometric authentication
  - ❌ NO plaintext files
  - ✅ File protection: `NSFileProtectionComplete`
- **Mobile App (Android)**:
  - ✅ EncryptedSharedPreferences for keys
  - ✅ Keystore for biometric data
  - ❌ NO plaintext SharedPreferences
  - ✅ Biometric authentication
- **Private key protection**:
  - Encrypt at rest with device password
  - Decrypt only when needed (on-demand)
  - Clear from memory after use

#### 6.2 Code Security
- **No hardcoded secrets**:
  - API keys, encryption keys → environment variables
  - Build-time secrets → build pipeline
  - Runtime secrets → secure configuration service
- **Dependency management**:
  - Use lock files (package-lock.json, yarn.lock, Cargo.lock)
  - Regular dependency audits (npm audit, cargo audit)
  - Automatic updates for security patches
  - Limit dependency scope (avoid transitive dependencies)
- **Code signing**:
  - Sign release builds (production APK/IPA)
  - Verify signature on app startup (prevent tampering)

#### 6.3 Anti-Tampering
- **Code obfuscation** (optional but recommended):
  - Minify and mangle JavaScript
  - Use ProGuard for Android
  - Use LinkTimeOptimization for iOS
- **Runtime integrity checks**:
  - Detect debuggers (if possible)
  - Detect rooted/jailbroken devices (with graceful fallback)
  - Monitor for code injection
- **Certificate pinning**:
  - Pin API server certificate
  - Fail if pin doesn't match
  - Update process: rotate every 90 days

#### 6.4 Logging & Debug
- **No sensitive data in logs**:
  - ❌ Passwords, tokens, keys
  - ❌ Full email addresses (log as `user@...`)
  - ❌ Message content
  - ✅ Error codes, timestamps, non-sensitive metadata
- **Debug mode disabled in production**:
  - Build without debug symbols
  - Disable console logging
  - Remove stack traces from errors

---

### 7. Metadata Protection

#### 7.1 Message Metadata
- **Server sees**:
  - Sender ID (not email/name)
  - Recipient IDs
  - Timestamp (rounded to minute)
  - File size (if image/file sent)
  - Message ID
- **Server DOES NOT see**:
  - Message content (encrypted)
  - Message type
  - Message length (padded)
  - User's activity patterns

#### 7.2 Sealed Sender (Optional Enhancement)
- **Hide recipient identifier** from server:
  - Wrap encrypted message with sealed envelope
  - Server only sees "encrypted data"
  - Recipient decrypts to discover sender
  - Prevents correlation attacks
- **Implementation**: Use Signal Protocol's UnidentifiedSender

#### 7.3 Group Metadata
- **Group member list**:
  - Encrypted at rest
  - Only decrypted by members
  - Server sees member count, not names
- **Group info** (name, description):
  - Encrypted at rest
  - Server cannot see group topic

---

### 8. Security Compliance & Auditing

#### 8.1 Logging & Monitoring
- **Audit logs** (tamper-proof):
  - All authentication events (login, logout, register)
  - All admin actions
  - Account modifications
  - Session creation/revocation
  - Data access (who accessed what, when)
- **Log retention**:
  - Keep for 90 days minimum
  - Encrypt logs
  - Immutable append-only log
- **Real-time alerts** for:
  - Failed login attempts (10+ in 5 minutes)
  - Suspicious API usage patterns
  - Unusually large data downloads
  - Certificate errors

#### 8.2 Security Testing
- **Penetration testing**:
  - Quarterly by external firm
  - Test OWASP Top 10
  - Test encryption implementation
  - Test key management
  - Test session handling
- **Code review**:
  - All code reviewed before merge
  - Focus on: crypto, auth, data handling, secrets management
  - Use automated scanning (SonarQube, Snyk)
- **Dependency scanning**:
  - Weekly scans for vulnerabilities
  - Automatic alerts for new CVEs
  - Patch within 48 hours for critical
  - Update within 1 week for high

#### 8.3 Incident Response
- **Security incident response plan**:
  - Detection → Investigation → Containment → Eradication → Recovery
  - Notify affected users within 72 hours
  - Publish transparency report
  - Post-mortem analysis
- **Vulnerability disclosure**:
  - Email: security@chatapp.local
  - Response time: 48 hours
  - Fix timeline: 30 days for high/critical
  - Public disclosure: after fix is deployed

#### 8.4 Open Source & Auditability
- **Source code published** on GitHub:
  - Core encryption logic
  - Server-side API
  - Client applications
  - All dependencies visible
- **License**: AGPL-3.0 (ensures derivative work is also open)
- **Regular audits**:
  - Third-party security audit every 6 months
  - Cryptography review by experts
  - Peer review process for contributions
  - Public disclosure of audit findings
- **Security roadmap**:
  - Publicly document planned security improvements
  - Announce deprecations early
  - Test new protocols before deployment

---

### 9. Privacy Policy Implementation

#### 9.1 Data Collection
- **Minimal data collection**:
  - Account creation: email, password hash, display name
  - Messages: encrypted (server cannot read)
  - Files: encrypted
  - NO IP logging
  - NO device fingerprinting
  - NO tracking pixels/analytics
- **User consent**:
  - Ask before any non-essential data collection
  - Easy opt-out option
  - No dark patterns

#### 9.2 Data Retention
- **Messages**: User-controlled deletion (stored until deleted)
- **Deleted messages**: Cryptographic deletion (unrecoverable after deletion)
- **Account data**: Deleted 30 days after account deletion
- **Temporary data**: Cleared after use (session tokens, etc.)
- **Backups**: Retained per organization policy

#### 9.3 Data Sharing
- **Never share user data** with third parties (period)
- **No data sales** (explicit policy)
- **Government requests**:
  - Require legal process (warrant, subpoena)
  - Log all requests
  - Push back on overbroad requests
  - Publish transparency report (semi-annually)
  - User notification (where legally allowed)

---

## Technical Stack

### Frontend Stack

#### Web Application
```
Framework: React 18.x
Language: TypeScript
Build Tool: Vite
State Management: Zustand
Styling: TailwindCSS
UI Components: Headless UI
HTTP Client: Axios
WebSocket Client: Socket.io-client
Encryption: @libsignal/client, libsodium.js
Storage: IndexedDB (encrypted)
Form Handling: React Hook Form
Validation: Zod
Testing: Vitest, React Testing Library
Linting: ESLint, Prettier
```

#### Mobile Applications
```
Framework: React Native / Expo
Language: TypeScript
Navigation: React Navigation
State Management: Zustand
Storage: Encrypted MMKV
Encryption: @libsignal/client, react-native-sodium
HTTP: Axios
WebSocket: Socket.io-client
Native Modules: react-native-keychain (iOS), Keystore (Android)
Camera/Image: react-native-image-picker
Notification: Expo Notifications
Testing: Detox, Jest
```

### Backend Stack

#### API Server
```
Runtime: Node.js 20+ (LTS)
Framework: Express.js
Language: TypeScript
Database: PostgreSQL 15+
Real-Time: Socket.io (WebSocket)
Encryption: @libsignal/server, libsodium.js, crypto
Authentication: jsonwebtoken (JWT)
Password Hashing: argon2
API Documentation: OpenAPI/Swagger
Validation: Joi, zod
Logging: Winston, Morgan
Monitoring: Prometheus, Grafana
Testing: Jest, Supertest
ORM: Prisma or TypeORM
```

#### Database
```
Primary: PostgreSQL 15+
Extensions:
  - pgcrypto (field-level encryption)
  - uuid-ossp (UUID generation)
  - pg_trgm (text search)
Backup: Automated daily snapshots (encrypted)
Replication: Primary-secondary for HA
Encryption: TDE (Transparent Data Encryption)
```

#### Caching & Sessions
```
Redis 7+
Purpose:
  - Session storage (encrypted)
  - Rate limiting
  - Pre-key cache
  - Message queue (for offline delivery)
High Availability: Redis Cluster
Backup: RDB snapshots (encrypted)
```

#### Security Libraries
```
@libsignal/client: Signal Protocol (client)
@libsignal/server: Signal Protocol (server)
libsodium.js: Crypto primitives
crypto (Node.js built-in): TLS, hashing
jsonwebtoken: JWT signing
argon2: Password hashing
bcrypt: Additional hashing (legacy, if needed)
@hapi/joi: Input validation
zod: Schema validation
helmet: HTTP headers security
cors: CORS middleware
```

### Infrastructure

#### Deployment
```
Container: Docker
Orchestration: Kubernetes (optional, for scaling)
Alternative: Docker Compose (for small deployments)
Load Balancer: Nginx, HAProxy
Reverse Proxy: Nginx (TLS termination)
CDN: Cloudflare (optional, for static content only)
Domain: Own domain (not on shared hosting)
```

#### Cloud Infrastructure (Optional)
```
AWS:
  - EC2 (app servers)
  - RDS PostgreSQL (database)
  - ElastiCache Redis (caching)
  - S3 (backup, with encryption)
  - ACM (SSL certificates)
  - KMS (key management)

Or: Self-hosted (VPS from DigitalOcean, Hetzner, Linode)
Benefits: Full control, no third-party data exposure
```

#### Monitoring & Logging
```
Log Aggregation: ELK Stack (Elasticsearch, Logstash, Kibana)
Alternative: Loki + Grafana
Monitoring: Prometheus + Grafana
Alerts: AlertManager
APM: Jaeger (distributed tracing)
Uptime Monitoring: Uptime Kuma
```

---

## Database Architecture

### Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_encrypted BYTEA,  -- encrypted for storage
  display_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20),  -- optional
  phone_encrypted BYTEA,
  password_hash VARCHAR(255) NOT NULL,  -- Argon2
  avatar_url VARCHAR(500),
  bio TEXT,
  identity_key_public BYTEA NOT NULL,  -- Ed25519 public key
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);
```

#### user_pre_keys
```sql
CREATE TABLE user_pre_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  pre_key_id BIGINT NOT NULL,
  public_key BYTEA NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, pre_key_id)
);
```

#### user_signed_pre_keys
```sql
CREATE TABLE user_signed_pre_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  signed_pre_key_id BIGINT NOT NULL,
  public_key BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, signed_pre_key_id)
);
```

#### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  participant_1_id UUID NOT NULL REFERENCES users(id),
  participant_2_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  CHECK (participant_1_id < participant_2_id),
  UNIQUE(participant_1_id, participant_2_id)
);
```

#### groups
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  icon_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);
```

#### group_members
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member',  -- member, admin, creator
  joined_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(group_id, user_id)
);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  group_id UUID REFERENCES groups(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content_encrypted BYTEA NOT NULL,  -- encrypted message
  content_iv BYTEA NOT NULL,  -- IV for AES
  content_hmac VARCHAR(64) NOT NULL,  -- SHA256 HMAC
  message_nonce BYTEA NOT NULL,  -- for key derivation
  content_type VARCHAR(20) DEFAULT 'text',  -- text, image, file
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  CHECK (
    (conversation_id IS NOT NULL AND group_id IS NULL) OR
    (conversation_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_group ON messages(group_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

#### message_media
```sql
CREATE TABLE message_media (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_type VARCHAR(20),  -- image, file
  file_encrypted BYTEA NOT NULL,  -- encrypted file
  file_iv BYTEA NOT NULL,
  file_hmac VARCHAR(64) NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  width INT,  -- for images
  height INT,  -- for images
  thumbnail_encrypted BYTEA,
  thumbnail_iv BYTEA,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### message_read_receipts
```sql
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

#### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(100),  -- iPhone 15 Pro, etc
  device_os VARCHAR(50),  -- iOS, Android, Web
  access_token_hash VARCHAR(64),  -- hashed, for invalidation
  refresh_token_hash VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, device_id)
);
```

#### blocked_users
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id),
  blocked_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- login, logout, message_sent, etc
  resource_type VARCHAR(50),  -- user, message, group, etc
  resource_id UUID,
  details JSONB,  -- additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
);

-- Retention: 90 days, then delete
CREATE POLICY audit_logs_retention AS
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  USING TRUE;
```

---

## API Specifications

### Authentication Endpoints

#### POST /api/auth/register
Register new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "display_name": "John Doe",
  "phone_number": "+1234567890"  // optional
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "message": "Check your email to verify account"
}
```

#### POST /api/auth/verify-email
Verify email with token from link

**Request:**
```json
{
  "token": "email-verification-token"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

#### POST /api/auth/login
Login user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "device_id": "device-unique-id",
  "device_name": "iPhone 15 Pro"
}
```

**Response (200):**
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "identity_key_public": "base64-public-key"
  },
  "pre_keys": [
    {
      "pre_key_id": 1,
      "public_key": "base64"
    }
    // ... more pre-keys
  ]
}
```

#### POST /api/auth/refresh
Refresh access token

**Request:**
```json
{
  "refresh_token": "refresh-jwt-token"
}
```

**Response (200):**
```json
{
  "access_token": "new-jwt-token"
}
```

#### POST /api/auth/logout
Logout user

**Request:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### User Endpoints

#### GET /api/users/me
Get current user profile

**Request:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Hello world",
  "created_at": "2026-01-01T00:00:00Z",
  "last_login_at": "2026-01-23T10:00:00Z"
}
```

#### PUT /api/users/me
Update user profile

**Request:**
```json
{
  "display_name": "Jane Doe",
  "avatar_url": "https://...",
  "bio": "Updated bio"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "display_name": "Jane Doe",
  "avatar_url": "https://...",
  "bio": "Updated bio"
}
```

#### GET /api/users/search?q=john
Search users

**Request:**
```
Authorization: Bearer {access_token}
?q=john
```

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "email": "john@example.com",
      "avatar_url": "https://..."
    }
  ]
}
```

#### GET /api/users/:userId
Get user profile

**Response (200):**
```json
{
  "id": "uuid",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Hello",
  "is_online": true,
  "last_seen_at": "2026-01-23T10:00:00Z"
}
```

#### POST /api/users/:userId/block
Block user

**Response (200):**
```json
{
  "message": "User blocked successfully"
}
```

#### DELETE /api/users/:userId/block
Unblock user

**Response (200):**
```json
{
  "message": "User unblocked successfully"
}
```

#### DELETE /api/users/me
Delete account

**Request:**
```json
{
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Account marked for deletion. Will be permanently deleted in 30 days."
}
```

---

### Conversation Endpoints

#### GET /api/conversations
List user's conversations

**Request:**
```
Authorization: Bearer {access_token}
?limit=20&offset=0
```

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "participant": {
        "id": "uuid",
        "display_name": "Jane Doe",
        "avatar_url": "https://...",
        "is_online": true
      },
      "last_message": "Hello there",
      "last_message_at": "2026-01-23T10:00:00Z",
      "unread_count": 3,
      "is_archived": false
    }
  ],
  "total": 10
}
```

#### POST /api/conversations
Create new conversation (implicit - created on first message)

**Request:**
```json
{
  "participant_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "participant": {
    "id": "uuid",
    "display_name": "Jane Doe"
  }
}
```

#### GET /api/conversations/:conversationId
Get conversation details

**Response (200):**
```json
{
  "id": "uuid",
  "participant": {
    "id": "uuid",
    "display_name": "Jane Doe",
    "is_online": true,
    "last_seen_at": "2026-01-23T10:00:00Z"
  },
  "created_at": "2026-01-20T00:00:00Z"
}
```

#### GET /api/conversations/:conversationId/messages
Get messages in conversation

**Request:**
```
?limit=20&before_id=uuid (for pagination)
```

**Response (200):**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "content": "ENCRYPTED_CONTENT",
      "content_iv": "base64",
      "content_hmac": "sha256hash",
      "message_nonce": "base64",
      "created_at": "2026-01-23T10:00:00Z",
      "is_edited": false,
      "is_deleted": false,
      "read_by": ["uuid1", "uuid2"],
      "media": null
    }
  ]
}
```

#### PUT /api/conversations/:conversationId/mute
Mute conversation

**Request:**
```json
{
  "duration": "1h"  // 1h, 24h, 7d, forever
}
```

**Response (200):**
```json
{
  "is_muted": true,
  "muted_until": "2026-01-23T11:00:00Z"
}
```

#### DELETE /api/conversations/:conversationId
Delete conversation

**Request:**
```json
{
  "delete_messages": false
}
```

**Response (200):**
```json
{
  "message": "Conversation deleted"
}
```

---

### Message Endpoints

#### POST /api/messages
Send message

**Request:**
```json
{
  "conversation_id": "uuid",  // OR
  "group_id": "uuid",         // one of these
  "content": "ENCRYPTED_CONTENT",
  "content_iv": "base64-iv",
  "content_hmac": "sha256-hash",
  "message_nonce": "base64-nonce"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "status": "sent",
  "created_at": "2026-01-23T10:00:00Z"
}
```

#### WebSocket Event (Real-Time)
```json
{
  "type": "message:received",
  "message": {
    "id": "uuid",
    "sender_id": "uuid",
    "content": "ENCRYPTED",
    "content_iv": "base64",
    "content_hmac": "hash",
    "created_at": "2026-01-23T10:00:00Z"
  }
}
```

#### PUT /api/messages/:messageId
Edit message

**Request:**
```json
{
  "content": "NEW_ENCRYPTED_CONTENT",
  "content_iv": "base64",
  "content_hmac": "hash",
  "message_nonce": "base64"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "is_edited": true,
  "edit_count": 1,
  "updated_at": "2026-01-23T10:01:00Z"
}
```

#### DELETE /api/messages/:messageId
Delete message

**Response (200):**
```json
{
  "id": "uuid",
  "is_deleted": true
}
```

#### POST /api/messages/:messageId/read
Mark message as read

**Response (200):**
```json
{
  "message_id": "uuid",
  "read_at": "2026-01-23T10:05:00Z"
}
```

---

### Group Endpoints

#### POST /api/groups
Create group

**Request:**
```json
{
  "name": "Project Team",
  "description": "Team chat for project",
  "icon_url": "https://...",
  "member_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Project Team",
  "description": "Team chat for project",
  "creator_id": "uuid",
  "created_at": "2026-01-23T10:00:00Z",
  "members": [
    {
      "id": "uuid1",
      "display_name": "John",
      "role": "creator"
    }
  ]
}
```

#### GET /api/groups/:groupId
Get group details

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Project Team",
  "description": "Team chat",
  "icon_url": "https://...",
  "creator_id": "uuid",
  "created_at": "2026-01-23T10:00:00Z",
  "member_count": 5,
  "members": [
    {
      "id": "uuid",
      "display_name": "John",
      "avatar_url": "https://...",
      "role": "creator",
      "joined_at": "2026-01-20T00:00:00Z"
    }
  ]
}
```

#### PUT /api/groups/:groupId
Update group

**Request:**
```json
{
  "name": "New Team Name",
  "description": "New description",
  "icon_url": "https://..."
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "New Team Name",
  "updated_at": "2026-01-23T10:05:00Z"
}
```

#### POST /api/groups/:groupId/members
Add member to group

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "role": "member",
  "joined_at": "2026-01-23T10:05:00Z"
}
```

#### DELETE /api/groups/:groupId/members/:userId
Remove member from group

**Response (200):**
```json
{
  "message": "Member removed"
}
```

#### DELETE /api/groups/:groupId/members/me
Leave group

**Response (200):**
```json
{
  "message": "Left group"
}
```

#### GET /api/groups/:groupId/messages
Get group messages

**Request:**
```
?limit=20&before_id=uuid
```

**Response (200):**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender": {
        "id": "uuid",
        "display_name": "John"
      },
      "content": "ENCRYPTED",
      "content_iv": "base64",
      "content_hmac": "hash",
      "created_at": "2026-01-23T10:00:00Z",
      "read_by_count": 3,
      "media": null
    }
  ]
}
```

#### DELETE /api/groups/:groupId
Delete group (creator only)

**Response (200):**
```json
{
  "message": "Group deleted"
}
```

---

### File Upload Endpoints

#### POST /api/upload
Upload image/file

**Request (multipart/form-data):**
```
file: <binary>
message_id: uuid (optional, for attaching to message)
```

**Response (201):**
```json
{
  "id": "uuid",
  "file_url": "https://api.example.com/files/uuid",
  "thumbnail_url": "https://api.example.com/files/uuid/thumbnail",
  "size": 204800,
  "mime_type": "image/jpeg"
}
```

#### GET /api/files/:fileId
Download file (with decryption on client)

**Response (200):**
```
Binary file data
```

---

### WebSocket Events

#### Real-Time Presence
```json
{
  "type": "user:online",
  "user_id": "uuid",
  "is_online": true,
  "timestamp": "2026-01-23T10:00:00Z"
}
```

#### Typing Indicator
```json
{
  "type": "user:typing",
  "user_id": "uuid",
  "conversation_id": "uuid",
  "is_typing": true
}
```

#### Message Delivered
```json
{
  "type": "message:delivered",
  "message_id": "uuid",
  "delivered_at": "2026-01-23T10:00:00Z"
}
```

#### Message Read
```json
{
  "type": "message:read",
  "message_id": "uuid",
  "user_id": "uuid",
  "read_at": "2026-01-23T10:00:00Z"
}
```

---

## UI/UX Requirements

### Authentication Screens

#### Registration Screen
- Email input with validation
- Password input with strength meter
- Confirm password input
- Display name input
- Terms of service acceptance
- Register button
- Login link
- Loading state during submission
- Error messages (specific)
- Success message with next steps

#### Login Screen
- Email input
- Password input
- Remember device checkbox
- Login button
- Forgot password link
- Register link
- Loading state
- Error messages
- Social login (optional future)

#### Email Verification Screen
- Message explaining verification
- Input for verification code (or link-based)
- Resend code option
- Timer for resend cooldown (60 seconds)

### Main Chat Interface

#### Conversation List
- List of all conversations
- Avatar + name + last message preview + timestamp
- Unread badge (count)
- Mute/unmute icon
- Search bar at top
- New conversation button (floating)
- Swipe to archive/delete (mobile)
- Load more/pagination

#### Chat Screen (1-to-1 & Group)
- **Header**:
  - User/group avatar
  - Name + online status (1-to-1) or member count (group)
  - Call button (future)
  - Options menu (mute, info, delete)
- **Messages area**:
  - Scrollable message list
  - Load more/pagination upward
  - Sender avatar + name
  - Message content (encrypted display)
  - Timestamp (rounded to nearest minute)
  - Delivery status icons (✓, ✓✓)
  - Edit/delete options (long press)
  - Image thumbnail (if image message)
- **Typing indicator**:
  - "User is typing..." below messages
  - Auto-hide after 3 seconds
- **Message input**:
  - Text input field
  - Send button (blue when text present)
  - Image/file attachment button
  - Emoji picker (optional)

#### User/Group Info Screen
- Avatar
- Name
- (User): Online status, last seen, bio
- (Group): Description, member count
- Member list (clickable)
- Mute settings
- Block user option (1-to-1 only)
- Leave group button (groups)
- Delete conversation button
- Report/block option

### Settings/Profile

#### Profile Screen
- Avatar (clickable to change)
- Display name (editable)
- Email (display only)
- Bio (editable)
- Account created date
- Edit button
- Logout button
- Delete account button

#### Privacy & Security Settings
- Who can message me: {Anyone, Contacts, Nobody}
- Show online status: {Everyone, Contacts, Nobody}
- Show last seen: {Everyone, Contacts, Nobody}
- Read receipts: {Send, Receive} toggles
- Disappearing messages: {Off, 1h, 24h, 7d, 30d}

#### Account Settings
- Change password
- Active sessions (with device info)
- Logout from all devices
- Two-factor authentication (future)
- Biometric login (mobile)

#### Notification Settings
- Global notifications toggle
- Sound toggle
- Vibration toggle
- Badge count toggle
- Do Not Disturb (time range or always)

#### Data & Privacy
- Privacy policy link
- Terms of service link
- Export data (future)
- Delete account
- Clear cache
- Contact support

### Design System

#### Colors (Light/Dark Mode)
- Primary: Blue #007AFF (iOS style)
- Secondary: Gray #5AC8FA
- Success: Green #4CD964
- Danger: Red #FF3B30
- Background: White/#1C1C1E
- Text: Black/#000000 / White/#FFFFFF
- Border: Light gray

#### Typography
- Headlines: SF Pro Display (iOS), Roboto (Android), sans-serif
- Body: SF Pro Text, Roboto, sans-serif
- Monospace: JetBrains Mono (for code)

#### Spacing
- Small: 8px
- Medium: 16px
- Large: 24px
- Extra large: 32px

#### Animations
- Message send: 0.3s ease-out
- Notification: slide down 0.2s
- Loading spinner: continuous rotation
- Transitions: 0.2-0.3s ease-out

#### Accessibility
- Touch target size: min 44x44px
- Color contrast ratio: 4.5:1 (AA)
- Alt text for images
- Keyboard navigation support
- Voice-over/TalkBack support

---

## Performance & Reliability

### Performance Requirements

#### Load Times
- App startup: < 2 seconds
- Login: < 1 second
- Load conversation list: < 500ms
- Load message history (20 messages): < 500ms
- Send message: < 100ms (before network)
- Receive message: < 2 seconds (server→client delivery)

#### Resource Usage (Mobile)
- Memory: < 100MB at idle, < 150MB with chat open
- Battery: < 3% drain per hour (active use)
- Network: < 500KB per chat session (without media)
- Disk: < 200MB for 1000 messages (local cache)

#### Network Efficiency
- Message compression: gzip
- Image compression: auto-resize + quality optimization
- Batch API requests where possible
- Use WebSocket for real-time (not polling)
- Lazy load message history

### Reliability Requirements

#### Uptime
- Target: 99.9% uptime (3 hours/month downtime)
- No single point of failure
- Graceful degradation on partial outages
- Auto-failover for critical components

#### Data Durability
- Backup: Daily encrypted snapshots
- Geographic redundancy: backups in different region
- Retention: 30-90 days of backups
- Recovery time objective (RTO): 1 hour
- Recovery point objective (RPO): 1 hour

#### Offline Support
- Queue outgoing messages (store encrypted locally)
- Sync when connection restored
- Show message status: pending → sent → delivered
- Retry with exponential backoff (1s, 2s, 4s, 8s, max 1min)
- Keep local cache of recent messages (last 100)

#### Error Handling
- Graceful error messages (user-friendly, not technical)
- Automatic retry for transient errors
- User notification for persistent errors
- Clear error codes (not exposed to user)
- Detailed logging for debugging

---

## Deployment & Infrastructure

### Development Environment

#### Local Setup
```bash
# Clone repo
git clone https://github.com/org/chat-app.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local values

# Start database
docker-compose up -d postgres redis

# Run migrations
npm run migrate

# Start development server
npm run dev

# Start client
npm run dev:client

# Run tests
npm test

# Run linting
npm lint
```

### Staging Environment

#### Configuration
- **Server**: Similar to production but smaller capacity
- **Database**: Staging postgres instance
- **Backup**: Daily, retained for 7 days
- **SSL**: Same certificates as production
- **Monitoring**: Same as production (sandbox)

#### Testing
- Run full test suite before deployment
- Manual QA testing
- Security scanning (OWASP ZAP)
- Performance testing (load testing with 100 concurrent users)

### Production Environment

#### Infrastructure
```
Load Balancer (Nginx)
  ↓
[3x App Servers] (Node.js + Express)
  ↓
[Primary PostgreSQL] + [Replica PostgreSQL]
  ↓
[Redis Cluster] (6 nodes for HA)
  ↓
[S3 Backup] (encrypted, cross-region)
```

#### Deployment Process
1. Build: `npm run build`
2. Test: `npm test` + security scans
3. Tag: Git tag with version
4. Docker: Build and push image
5. Deploy: Rolling deployment (1 server at a time)
6. Verify: Health checks + smoke tests
7. Monitor: Watch metrics for 30 minutes

#### Monitoring & Alerts
- CPU usage > 80%
- Memory usage > 85%
- Database connection pool > 90%
- API error rate > 1%
- Response time > 500ms
- Downtime detected
- High disk usage
- Certificate expiration in < 30 days

#### Scaling
- Auto-scale app servers: 2-10 based on CPU/memory
- Database: Read replicas for read-heavy operations
- Redis: Cluster mode for horizontal scaling
- CDN: For static assets and image caching

---

## Testing & Quality Assurance

### Unit Tests

#### Requirements
- Minimum 80% code coverage
- Test all encryption/decryption functions
- Test authentication & authorization
- Test input validation
- Test error handling

#### Tools
- Jest (testing framework)
- Testing Library (component testing)
- Sinon (mocking)

### Integration Tests

#### Requirements
- Test API endpoints with real database
- Test message encryption end-to-end
- Test user workflows (register → login → send message → receive)
- Test group operations
- Test file upload/download

#### Tools
- Supertest (API testing)
- docker-compose (test database)

### Security Testing

#### Requirements
- OWASP ZAP scanning (automated)
- Manual penetration testing (quarterly)
- Dependency vulnerability scanning (weekly)
- Code review for security issues (all PRs)
- Cryptographic audit (semi-annually)

#### Tools
- OWASP ZAP
- Snyk (dependency scanning)
- SonarQube (code quality)
- Burp Suite (penetration testing)

### Performance Testing

#### Requirements
- Load test: 100 concurrent users
- Stress test: 1000 concurrent users
- Endurance test: sustained load for 24 hours
- Response time monitoring
- Memory/CPU profiling

#### Tools
- Apache JMeter
- k6 (load testing)
- Lighthouse (web performance)

### Manual Testing

#### QA Checklist
- Test all user flows on multiple devices
- Test on different network conditions (slow, offline, high-latency)
- Test with real data (production-like)
- Accessibility testing (screen readers, keyboard navigation)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile testing (iOS Safari, Chrome Android)

---

## Summary of Key Principles

### Security First
- End-to-end encryption by default
- Signal Protocol implementation
- Zero-knowledge architecture
- Regular audits and vulnerability testing
- Open-source for transparency

### Privacy by Design
- Minimal data collection
- No tracking or analytics on user behavior
- No data sharing with third parties
- User controls over data
- Transparent privacy policy

### Reliability & Stability
- 99.9% uptime target
- Graceful offline support
- Automatic message queueing
- Comprehensive error handling
- Real-time syncing

### User-Centric Design
- Intuitive, simple interface
- Fast performance
- Accessible to all users
- Dark mode support
- Responsive design

### Compliance & Transparency
- GDPR-compliant
- CCPA-compliant
- Open-source codebase
- Regular security audits
- Published transparency reports

---

## Development Phases

Dokumen ini mengorganisir semua fitur ke dalam fase-fase development yang realistis. Semua fitur tetap dipertahankan, hanya diorganisir berdasarkan prioritas dan kompleksitas implementasi.

### Solo Developer Considerations

**Catatan Penting**: Dokumen ini dirancang untuk dikerjakan oleh **solo developer**. Timeline dan prioritas telah disesuaikan untuk realistis dikerjakan oleh satu orang.

#### Strategi Solo Development

**1. Fokus pada MVP Minimalis Dulu**
- Mulai dengan fitur paling essential: Auth + 1-to-1 chat + E2EE
- Gunakan library Signal Protocol yang sudah ada (JANGAN implement dari scratch)
- Defer fitur kompleks ke fase berikutnya
- Prioritaskan "it works" dulu, baru optimize

**2. Gunakan Library & Tools yang Sudah Ada**
- ✅ **Signal Protocol**: Gunakan `@signalapp/libsignal-client` atau `libsignal-protocol-typescript`
- ✅ **Backend**: Express.js dengan TypeScript (mature ecosystem)
- ✅ **Frontend**: React + Vite (fast development)
- ✅ **Database**: PostgreSQL dengan Prisma ORM (type-safe, mengurangi bugs)
- ✅ **Real-time**: Socket.io (mature, banyak dokumentasi)
- ✅ **Deployment**: Docker Compose untuk MVP (simple, single server)

**3. Prioritas Development Order**
```
Week 1-2:   Setup project + Database schema
Week 3-4:   Authentication (register, login, JWT)
Week 5-6:   Basic 1-to-1 messaging (tanpa E2EE dulu)
Week 7-8:   WebSocket real-time delivery
Week 9-12:  Signal Protocol integration (E2EE)
Week 13-14: Image sharing
Week 15-16: UI polish + Testing
```

**4. Tips untuk Solo Developer**
- **Jangan perfeksionis di awal**: MVP harus bisa jalan dulu, optimize nanti
- **Test incrementally**: Test setiap fitur sebelum lanjut ke berikutnya
- **Commit sering**: Git commit setiap fitur kecil yang selesai
- **Dokumentasi**: Tulis dokumentasi sambil develop (jangan nanti)
- **Use TypeScript**: Mengurangi bugs, lebih mudah maintain
- **Start simple**: Single server deployment dulu, scale nanti
- **Focus on core**: Defer advanced features ke fase berikutnya

**5. Risiko yang Perlu Diwaspadai**
- ⚠️ **Signal Protocol complexity**: Gunakan library, jangan implement sendiri
- ⚠️ **Scope creep**: Stick to MVP, jangan tambah fitur baru di tengah jalan
- ⚠️ **Burnout**: Ambil break, jangan code 12 jam sehari
- ⚠️ **Security**: Review crypto implementation dengan expert sebelum launch
- ⚠️ **Testing**: Automated tests penting untuk solo dev (catch bugs early)

**6. Resource yang Direkomendasikan**
- Signal Protocol docs: https://signal.org/docs/
- Prisma docs: https://www.prisma.io/docs
- Socket.io docs: https://socket.io/docs/v4/
- React docs: https://react.dev
- PostgreSQL docs: https://www.postgresql.org/docs/

**7. Timeline Realistis untuk Solo Developer**
- **Phase 1 MVP**: 6-8 bulan (bukan 4 bulan)
- **Phase 2 Enhanced**: 6-8 bulan
- **Phase 3 Advanced**: 8-12 bulan
- **Phase 4 Compliance**: Ongoing

**Total**: 20-28 bulan untuk full feature set (realistis untuk solo dev)

**8. MVP Minimal yang Bisa Diluncurkan**
Jika perlu launch lebih cepat, bisa mulai dengan:
- ✅ Auth (register, login)
- ✅ 1-to-1 messaging dengan E2EE
- ✅ Basic real-time delivery
- ✅ Simple UI (functional, belum perfect)
- ❌ Defer: Image sharing, advanced features, mobile apps

**Estimasi**: 4-5 bulan untuk MVP minimal ini

### MVP Minimal (Quick Launch - Optional)

Jika ingin launch lebih cepat untuk validasi konsep, bisa mulai dengan MVP minimal ini:

**Timeline**: 4-5 bulan (solo developer)

**Core Features**:
- ✅ Email registration + login
- ✅ Basic 1-to-1 messaging
- ✅ E2EE dengan Signal Protocol library
- ✅ Real-time delivery (WebSocket)
- ✅ Basic UI (functional, minimal design)
- ✅ Message status (sent, delivered)

**Deferred ke Phase 1 Full**:
- ❌ Image sharing (tambah nanti)
- ❌ Typing indicator (tambah nanti)
- ❌ Advanced profile management (tambah nanti)
- ❌ Search conversations (tambah nanti)
- ❌ Block users (tambah nanti)

**Use Case**: Validasi konsep, early user feedback, proof of concept

---

### Phase 1: MVP Core (Months 1-8 untuk Solo Dev, Months 1-4 untuk Team)
**Goal**: Launch aplikasi chat 1-to-1 dengan E2EE yang berfungsi

**Timeline Realistis untuk Solo Developer**: 6-8 months full-time, atau 8-12 months part-time

#### Authentication & User Management
- ✅ Email-based signup dengan email verification
- ✅ Password requirements (12+ chars, strength indicator)
- ✅ Email + password login
- ✅ Session management dengan JWT tokens
- ✅ Remember device option (30-day expiration)
- ✅ Failed login rate limiting (5 attempts → 15-min lockout)
- ✅ Forgot password flow dengan secure reset link
- ✅ Change password dalam app settings
- ✅ Basic profile management (display name, avatar, bio)
- ✅ Delete account option (30-day grace period)

#### One-to-One Chat (Core)
- ✅ Search users by email atau display name
- ✅ View user profile sebelum messaging
- ✅ Create new direct chat
- ✅ Send text messages dengan real-time delivery
- ✅ Message history dengan infinite scroll
- ✅ Send status indicators (Sending, Sent, Delivered, Read)
- ✅ Timestamp untuk setiap message
- ✅ Delete message option (soft delete)
- ✅ Basic online/offline status
- ✅ Typing indicator (debounced, 1 second)
- ✅ Conversation list dengan unread badge
- ✅ Search conversations by name
- ✅ Sort conversations by most recent
- ✅ Mark all as read action

#### Media Sharing (Basic)
- ✅ Upload images (max 10MB, JPG/PNG/WebP/GIF)
- ✅ Auto-compression untuk mobile (max 1080px)
- ✅ Thumbnail preview di chat
- ✅ Download images ke device
- ✅ Basic image caching (encrypted)

#### Real-Time Infrastructure
- ✅ WebSocket connection (WSS)
- ✅ Real-time message delivery
- ✅ Presence updates (online/offline)
- ✅ Typing indicators
- ✅ Automatic reconnect dengan exponential backoff

#### Security (Core)
- ✅ End-to-End Encryption dengan Signal Protocol
- ✅ X3DH key exchange
- ✅ AES-256-GCM encryption
- ✅ HMAC-SHA256 authentication
- ✅ Perfect Forward Secrecy (Double Ratchet)
- ✅ Identity Key Pair (Ed25519)
- ✅ Pre-Key Bundle management
- ✅ Session key derivation
- ✅ TLS 1.3 dengan certificate pinning
- ✅ Argon2id password hashing
- ✅ JWT dengan RS256 signing
- ✅ Token rotation
- ✅ Rate limiting (basic)
- ✅ Input validation (server-side)
- ✅ SQL injection prevention

#### Database (Core Tables)
- ✅ users
- ✅ user_pre_keys
- ✅ user_signed_pre_keys
- ✅ conversations
- ✅ messages
- ✅ message_media
- ✅ message_read_receipts
- ✅ sessions
- ✅ blocked_users

#### API Endpoints (Core)
- ✅ POST /api/auth/register
- ✅ POST /api/auth/verify-email
- ✅ POST /api/auth/login
- ✅ POST /api/auth/refresh
- ✅ POST /api/auth/logout
- ✅ GET /api/users/me
- ✅ PUT /api/users/me
- ✅ GET /api/users/search
- ✅ GET /api/users/:userId
- ✅ POST /api/users/:userId/block
- ✅ DELETE /api/users/:userId/block
- ✅ DELETE /api/users/me
- ✅ GET /api/conversations
- ✅ POST /api/conversations
- ✅ GET /api/conversations/:conversationId
- ✅ GET /api/conversations/:conversationId/messages
- ✅ DELETE /api/conversations/:conversationId
- ✅ POST /api/messages
- ✅ PUT /api/messages/:messageId
- ✅ DELETE /api/messages/:messageId
- ✅ POST /api/messages/:messageId/read
- ✅ POST /api/upload
- ✅ GET /api/files/:fileId

#### WebSocket Events (Core)
- ✅ message:received
- ✅ user:online
- ✅ user:typing
- ✅ message:delivered
- ✅ message:read

#### UI/UX (Web App Only)
- ✅ Registration screen
- ✅ Login screen
- ✅ Email verification screen
- ✅ Conversation list
- ✅ Chat screen (1-to-1)
- ✅ User profile screen
- ✅ Basic settings screen
- ✅ Dark mode support

#### Infrastructure (Basic)
- ✅ Single server deployment (Docker)
- ✅ PostgreSQL database
- ✅ Redis untuk sessions & rate limiting
- ✅ Nginx reverse proxy
- ✅ Basic monitoring (Prometheus + Grafana)
- ✅ Daily encrypted backups

#### Testing (Core)
- ✅ Unit tests (80% coverage minimum)
- ✅ Integration tests untuk API endpoints
- ✅ E2E encryption testing
- ✅ Basic security scanning (OWASP ZAP)

---

### Phase 2: Enhanced Features (Months 9-16 untuk Solo Dev, Months 5-8 untuk Team)
**Goal**: Tambahkan group chat, mobile apps, dan fitur advanced messaging

**Timeline Realistis untuk Solo Developer**: 6-8 months full-time, atau 8-12 months part-time

#### Group Chat
- ✅ Create new group (name, description, icon, initial members)
- ✅ Group info page
- ✅ Edit group (name, description, icon) - creator only
- ✅ Member management (view, remove, invite)
- ✅ Leave group option
- ✅ Send messages ke group
- ✅ Group message indicators (Sent, Delivered, Read by count)
- ✅ Group history (new members see full history)
- ✅ Group encryption (per-member session keys)
- ✅ Group metadata encryption
- ✅ Add member dengan key rotation
- ✅ Group notifications settings (mute/unmute)
- ✅ Group search

#### Group API Endpoints
- ✅ POST /api/groups
- ✅ GET /api/groups/:groupId
- ✅ PUT /api/groups/:groupId
- ✅ POST /api/groups/:groupId/members
- ✅ DELETE /api/groups/:groupId/members/:userId
- ✅ DELETE /api/groups/:groupId/members/me
- ✅ GET /api/groups/:groupId/messages
- ✅ DELETE /api/groups/:groupId

#### Advanced Messaging Features
- ✅ Edit message (max 10 edits dalam 24 hours, "edited" label)
- ✅ Message editing untuk groups
- ✅ Delete image (dalam 24 hours)
- ✅ Image deletion untuk groups
- ✅ Group album (view all group images)

#### Conversation Management (Enhanced)
- ✅ Mute notifications (1 hour, 24 hours, 1 week, forever)
- ✅ Archive conversation
- ✅ Delete conversation dengan option retain/delete history
- ✅ Muted indicator di conversation list
- ✅ Search conversations by message content

#### Mobile Applications
- ✅ React Native / Expo setup
- ✅ iOS app dengan Keychain storage
- ✅ Android app dengan EncryptedSharedPreferences
- ✅ Biometric authentication (fingerprint/face)
- ✅ Push notifications (background, badge count, sound, vibration)
- ✅ Custom notification untuk mentions
- ✅ Do Not Disturb mode
- ✅ Native camera/image picker
- ✅ File protection (NSFileProtectionComplete untuk iOS)
- ✅ Keystore untuk Android biometric data

#### Notifications (Enhanced)
- ✅ In-app notifications (toast)
- ✅ Push notifications untuk mobile
- ✅ Badge count pada app icon
- ✅ Sound alert (default enabled)
- ✅ Vibration (default enabled)
- ✅ Custom notification untuk mentions di groups
- ✅ Do Not Disturb option
- ✅ Per-conversation muting
- ✅ Global notification settings
- ✅ Do Not Disturb schedule

#### User Presence & Status (Enhanced)
- ✅ Last seen timestamp (ketika offline)
- ✅ Real-time presence updates (WebSocket)
- ✅ Typing indicator untuk groups (<50 members)

#### Privacy Settings
- ✅ Who can message me (Anyone, Contacts, Nobody)
- ✅ Show online status (Everyone, Contacts, Nobody)
- ✅ Show last seen (Everyone, Contacts, Nobody)
- ✅ Allow read receipts (Send, Receive toggles)

#### Security Settings
- ✅ View active sessions (device name, IP, location, last activity)
- ✅ Logout dari specific device
- ✅ Logout dari all devices
- ✅ Block user list dengan unblock option
- ✅ Blocked users restrictions (no message, no online status, no group add)

#### Database (Additional Tables)
- ✅ groups
- ✅ group_members

#### Infrastructure (Enhanced)
- ✅ Multi-server deployment (load balancer)
- ✅ PostgreSQL replication (primary-secondary)
- ✅ Redis Cluster untuk HA
- ✅ Enhanced monitoring & alerting
- ✅ Geographic backup redundancy

#### Testing (Enhanced)
- ✅ Mobile app testing (Detox, Jest)
- ✅ Group chat integration tests
- ✅ Push notification testing
- ✅ Cross-platform testing

---

### Phase 3: Advanced Features (Months 17-28 untuk Solo Dev, Months 9-12 untuk Team)
**Goal**: Fitur advanced, search, dan optimasi performance

**Timeline Realistis untuk Solo Developer**: 8-12 months full-time, atau 12-18 months part-time

#### Advanced Messaging
- ✅ @mentions di groups (tag specific members)
- ✅ Disappearing messages (1 hour, 24 hours, 7 days, 30 days)
- ✅ Message search within conversation
- ✅ Full-text search across all messages (client-side cached)
- ✅ Search filters (date range, from user, media only)
- ✅ Search results dengan context (2 messages before/after)
- ✅ Jump to message di chat

#### Group Features (Advanced)
- ✅ Group permissions (Creator/Admin roles)
- ✅ Promote/demote members
- ✅ Admin can edit group info
- ✅ Admin can remove members
- ✅ Typing indicator untuk groups >50 members (disabled untuk performance)

#### User Search (Enhanced)
- ✅ Search users by partial matches
- ✅ Browse group info sebelum joining

#### Account Settings (Advanced)
- ✅ Export data option
- ✅ Clear cache option
- ✅ Clear message history option (dengan warning)
- ✅ Two-factor authentication (optional)

#### Security (Advanced)
- ✅ Sealed Sender (UnidentifiedSender) - optional enhancement
- ✅ Certificate pinning rotation (every 90 days)
- ✅ Master encryption key rotation (every 90 days)
- ✅ Pre-Key rotation (automatic, weekly)
- ✅ Enhanced metadata protection
- ✅ Group metadata encryption (member list, group info)

#### Database Security (Enhanced)
- ✅ Field-level encryption untuk email & phone
- ✅ Database-level encryption (pgcrypto)
- ✅ Master encryption key dengan KMS
- ✅ Encrypted backups dengan separate key storage
- ✅ Quarterly backup restore testing

#### API Security (Enhanced)
- ✅ Advanced rate limiting (per-endpoint)
- ✅ File upload validation (magic bytes, MIME type, malware scan)
- ✅ Image re-encoding (strip metadata)
- ✅ CSRF protection (token-based)
- ✅ Enhanced error handling (no sensitive info leakage)

#### Client-Side Security (Enhanced)
- ✅ IndexedDB encrypted untuk cache (web)
- ✅ Code obfuscation (minify, mangle JavaScript)
- ✅ Runtime integrity checks
- ✅ Rooted/jailbroken device detection (dengan graceful fallback)
- ✅ Code signing untuk release builds

#### Performance Optimization
- ✅ Message compression (gzip)
- ✅ Image compression optimization
- ✅ Batch API requests
- ✅ Lazy load message history
- ✅ Optimized database queries dengan proper indexing
- ✅ CDN untuk static assets

#### Infrastructure (Production-Ready)
- ✅ Kubernetes orchestration (optional)
- ✅ Auto-scaling app servers (2-10 based on CPU/memory)
- ✅ Database read replicas untuk read-heavy operations
- ✅ CDN untuk static content dan image caching
- ✅ 99.9% uptime target dengan HA setup

#### Monitoring & Logging (Advanced)
- ✅ ELK Stack atau Loki + Grafana
- ✅ Distributed tracing (Jaeger)
- ✅ Uptime monitoring (Uptime Kuma)
- ✅ Real-time alerts untuk security events
- ✅ Audit logs (tamper-proof, 90-day retention)

---

### Phase 4: Compliance & Scale (Months 29+ untuk Solo Dev, Months 13+ untuk Team)
**Goal**: Security audits, compliance, dan optimasi untuk scale

**Timeline Realistis untuk Solo Developer**: Ongoing, bisa dilakukan parallel dengan maintenance dan feature development

#### Security Compliance
- ✅ Quarterly penetration testing oleh external firm
- ✅ OWASP Top 10 testing
- ✅ Cryptographic audit oleh experts (semi-annually)
- ✅ Code review process untuk semua PRs
- ✅ Automated security scanning (SonarQube, Snyk)
- ✅ Weekly dependency vulnerability scanning
- ✅ 48-hour patch timeline untuk critical vulnerabilities
- ✅ 1-week update timeline untuk high vulnerabilities

#### Incident Response
- ✅ Security incident response plan
- ✅ User notification dalam 72 hours untuk incidents
- ✅ Transparency report publishing
- ✅ Post-mortem analysis
- ✅ Vulnerability disclosure process (security@email)

#### Open Source & Auditability
- ✅ Source code published di GitHub
- ✅ AGPL-3.0 license
- ✅ Third-party security audit setiap 6 months
- ✅ Cryptography review oleh experts
- ✅ Peer review process untuk contributions
- ✅ Public disclosure of audit findings
- ✅ Security roadmap documentation

#### Privacy Policy Implementation
- ✅ Privacy policy link
- ✅ Terms of service link
- ✅ GDPR compliance
- ✅ CCPA compliance
- ✅ Minimal data collection enforcement
- ✅ User consent mechanisms
- ✅ Data retention policy enforcement
- ✅ Government request handling process
- ✅ Transparency report (semi-annually)

#### Data & Privacy (Advanced)
- ✅ Cryptographic deletion untuk deleted messages
- ✅ Account data deletion (30-day grace period)
- ✅ Audit log retention (90 days)
- ✅ Metadata retention (90 days)
- ✅ Log retention (30 days)

#### Performance & Reliability (Production)
- ✅ 99.9% uptime dengan monitoring
- ✅ Graceful degradation pada partial outages
- ✅ Auto-failover untuk critical components
- ✅ Recovery time objective (RTO): 1 hour
- ✅ Recovery point objective (RPO): 1 hour
- ✅ Geographic redundancy untuk backups
- ✅ 30-90 days backup retention

#### Offline Support (Enhanced)
- ✅ Queue outgoing messages (encrypted local storage)
- ✅ Sync ketika connection restored
- ✅ Message status: pending → sent → delivered
- ✅ Retry dengan exponential backoff
- ✅ Local cache untuk recent messages (last 100)

#### Testing (Comprehensive)
- ✅ Load testing (100 concurrent users)
- ✅ Stress testing (1000 concurrent users)
- ✅ Endurance testing (24 hours sustained load)
- ✅ Response time monitoring
- ✅ Memory/CPU profiling
- ✅ Cross-browser testing
- ✅ Accessibility testing (screen readers, keyboard navigation)
- ✅ Mobile testing (iOS Safari, Chrome Android)

#### UI/UX (Polish)
- ✅ User/Group info screen lengkap
- ✅ Privacy & Security settings screen
- ✅ Account settings screen lengkap
- ✅ Notification settings screen
- ✅ Data & Privacy settings screen
- ✅ Accessibility improvements (WCAG AA compliance)
- ✅ Keyboard navigation support
- ✅ Voice-over/TalkBack support

---

## Development Timeline Summary

### Timeline untuk Solo Developer

| Phase | Duration (Solo Dev) | Key Deliverables |
|-------|---------------------|------------------|
| **Phase 1: MVP Core** | Months 1-8 (6-8 months) | 1-to-1 chat dengan E2EE, Web app |
| **Phase 2: Enhanced** | Months 9-16 (6-8 months) | Group chat, Mobile apps, Push notifications |
| **Phase 3: Advanced** | Months 17-28 (8-12 months) | Advanced features, Search, Performance optimization |
| **Phase 4: Compliance** | Months 29+ (Ongoing) | Security audits, Compliance, Production scale |

**Total Estimated Timeline untuk Solo Developer**: 20-28 months untuk full feature set

**Catatan**: Timeline ini realistis untuk solo developer yang bekerja part-time atau full-time dengan fokus. Jika bekerja full-time dengan dedikasi tinggi, bisa lebih cepat (15-20 months).

### Timeline untuk Team (Reference)

| Phase | Duration (Team) | Key Deliverables |
|-------|-----------------|------------------|
| **Phase 1: MVP Core** | Months 1-4 | 1-to-1 chat dengan E2EE, Web app |
| **Phase 2: Enhanced** | Months 5-8 | Group chat, Mobile apps, Push notifications |
| **Phase 3: Advanced** | Months 9-12 | Advanced features, Search, Performance optimization |
| **Phase 4: Compliance** | Months 13+ | Security audits, Compliance, Production scale |

**Total Estimated Timeline untuk Team**: 13+ months untuk full feature set

### Team Size Recommendations (Jika nanti perlu expand)

- Phase 1: 2-3 developers (1 backend crypto expert, 1 frontend, 1 full-stack)
- Phase 2: 4-5 developers (+1 mobile developer, +1 backend)
- Phase 3: 5-7 developers (+1 DevOps, +1 QA)
- Phase 4: 6-8 developers (+1 security specialist, +1 compliance)

---

## Next Steps (Solo Developer)

### Immediate Actions (Week 1-2)

1. **Project Setup**:
   - Initialize Git repository
   - Setup monorepo structure (backend + frontend)
   - Configure TypeScript untuk backend dan frontend
   - Setup Docker Compose untuk PostgreSQL + Redis
   - Setup development environment (VS Code, extensions)
   - Create `.env.example` files

2. **Database Setup**:
   - Install PostgreSQL (local atau Docker)
   - Install Prisma ORM
   - Design database schema (berdasarkan requirements)
   - Create migration files
   - Setup database seeding untuk development

3. **Backend Foundation**:
   - Setup Express.js dengan TypeScript
   - Configure ESLint + Prettier
   - Setup environment variables
   - Create basic folder structure
   - Setup error handling middleware
   - Setup logging (Winston)

### Phase 1 Development (Months 1-8)

**Month 1-2: Authentication**
- Implement user registration dengan email verification
- Implement login dengan JWT
- Implement password reset flow
- Implement session management
- Basic rate limiting
- Unit tests untuk auth module

**Month 3-4: Basic Messaging (Tanpa E2EE dulu)**
- Create conversation model
- Implement send message endpoint
- Implement get messages endpoint
- Basic WebSocket setup
- Real-time message delivery
- Message status (sent, delivered)
- Unit tests untuk messaging

**Month 5-6: Signal Protocol Integration (E2EE)**
- Research dan pilih Signal Protocol library
- Implement key generation (Identity Key, Pre-Keys)
- Implement X3DH key exchange
- Implement message encryption/decryption
- Implement Double Ratchet
- Integration tests untuk E2EE
- ⚠️ **Critical**: Review crypto implementation dengan expert

**Month 7: Image Sharing**
- File upload endpoint
- Image compression
- Image encryption dengan E2EE
- Thumbnail generation
- Download endpoint

**Month 8: UI & Polish**
- Build React frontend
- Implement authentication screens
- Implement chat interface
- Implement conversation list
- UI polish dan responsive design
- E2E testing

### Phase 1 Security (Parallel dengan Development)

- ✅ Dependency audit (npm audit, Snyk)
- ✅ Basic security scanning (OWASP ZAP)
- ✅ Code review sendiri (review setiap PR sebelum merge)
- ⚠️ **Before Launch**: Cryptography review oleh expert (bayar consultant jika perlu)

### Phase 1 Testing Strategy

**Unit Tests**:
- Target: 70-80% coverage untuk critical paths
- Focus: Auth, encryption, message handling
- Tools: Jest, Vitest

**Integration Tests**:
- Test API endpoints dengan real database
- Test E2EE flow end-to-end
- Tools: Supertest

**Manual Testing**:
- Test di browser berbeda (Chrome, Firefox, Safari)
- Test di mobile browser
- Test dengan 2+ users simultaneously

### Phase 1 Deployment (Simple untuk MVP)

**Infrastructure**:
- Single VPS (DigitalOcean, Hetzner, atau Linode)
- Docker Compose untuk semua services
- Nginx sebagai reverse proxy
- Let's Encrypt untuk SSL
- Daily automated backups ke S3 atau local

**Deployment Process**:
1. Build Docker images
2. Push ke registry (Docker Hub atau private)
3. Pull dan restart containers di server
4. Run database migrations
5. Health check

**Monitoring** (Basic):
- Uptime monitoring (UptimeRobot - free)
- Basic logging (Winston files)
- Error tracking (Sentry - free tier)

### Post-Phase 1 Launch

1. **Monitor & Iterate**:
   - Monitor error logs
   - Monitor user feedback
   - Fix critical bugs
   - Improve performance

2. **Gather Feedback**:
   - Create feedback form
   - Talk to early users
   - Identify pain points

3. **Plan Phase 2**:
   - Prioritize features berdasarkan feedback
   - Start dengan group chat atau mobile app?

### Tips untuk Solo Developer Success

✅ **Do**:
- Commit code setiap hari (jangan skip)
- Write tests sambil develop (jangan nanti)
- Document decisions dan trade-offs
- Take breaks (burnout is real)
- Ask for help di communities (Reddit, Discord, Stack Overflow)
- Use existing libraries (don't reinvent the wheel)

❌ **Don't**:
- Don't implement Signal Protocol from scratch
- Don't skip testing untuk "save time"
- Don't deploy tanpa security review untuk crypto code
- Don't try to build everything perfect di pertama kali
- Don't work 16 hours/day (sustainable pace > burnout)

### Resources & Communities

- **Signal Protocol**: https://signal.org/docs/
- **React**: https://react.dev
- **Node.js**: https://nodejs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Communities**: r/node, r/reactjs, r/crypto, Discord servers

---

**Document Version**: 1.2  
**Last Updated**: January 2026  
**Status**: Ready for Development - Solo Developer Optimized  
**Note**: 
- Semua fitur tetap dipertahankan, diorganisir ke dalam 4 fase development yang realistis
- Timeline dan strategi telah disesuaikan untuk solo developer
- Estimasi timeline: 20-28 months untuk full feature set (solo dev)
