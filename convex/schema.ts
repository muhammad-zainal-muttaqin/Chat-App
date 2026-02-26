import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.optional(v.string()), // Random salt per user (new secure format)
    displayName: v.string(),
    publicKey: v.string(), // X25519 public key (Base64)
    encryptedPrivateKey: v.optional(v.string()), // Encrypted with password (Base64)
    createdAt: v.number(),
    // Online presence
    lastSeenAt: v.optional(v.number()), // Timestamp of last heartbeat
    isOnline: v.optional(v.boolean()), // Online status flag
  })
    .index('by_email', ['email'])
    .index('by_public_key', ['publicKey']), // For duplicate key check security

  // Sessions for auth
  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    deviceId: v.string(), // Unique device identifier to prevent session hijacking
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

  // Conversations (1-to-1)
  conversations: defineTable({
    participantIds: v.array(v.id('users')),
    hiddenForUserIds: v.optional(v.array(v.id('users'))), // Local delete/hide conversation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_participant', ['participantIds']),

  // Messages (encrypted)
  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.id('users'),
    senderPublicKey: v.optional(v.string()), // Public key snapshot when message was encrypted
    ciphertext: v.union(v.string(), v.null()), // Encrypted for recipient
    ciphertextSelf: v.optional(v.union(v.string(), v.null())), // Encrypted for sender (self)
    nonce: v.string(), // Shared nonce
    deletedForUserIds: v.optional(v.array(v.id('users'))), // Local delete ("delete for me")
    isDeleted: v.boolean(),
    editedAt: v.union(v.number(), v.null()),
    deliveredAt: v.union(v.number(), v.null()),
    readAt: v.union(v.number(), v.null()),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_sender', ['senderId']),
});
