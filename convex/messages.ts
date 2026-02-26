import { v } from 'convex/values';
import { mutation, MutationCtx } from './_generated/server';
// import { Id } from './_generated/dataModel';

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const NONCE_BASE64_LENGTH = 32; // 24-byte nonce encoded in base64
const PUBLIC_KEY_BASE64_LENGTH = 44; // 32-byte key encoded in base64
const MIN_CIPHERTEXT_BASE64_LENGTH = 24; // 16-byte nacl.box overhead encoded in base64

function isBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && BASE64_PATTERN.test(value);
}

function assertValidEncryptedPayload(
  ciphertext: string,
  nonce: string,
  ciphertextSelf?: string
): void {
  if (!isBase64(ciphertext) || ciphertext.length < MIN_CIPHERTEXT_BASE64_LENGTH) {
    throw new Error('Invalid ciphertext format');
  }

  if (!isBase64(nonce) || nonce.length !== NONCE_BASE64_LENGTH) {
    throw new Error('Invalid nonce format');
  }

  if (
    ciphertextSelf !== undefined &&
    (!isBase64(ciphertextSelf) || ciphertextSelf.length < MIN_CIPHERTEXT_BASE64_LENGTH)
  ) {
    throw new Error('Invalid self-ciphertext format');
  }
}

function assertValidPublicKey(publicKey: string): void {
  if (!isBase64(publicKey) || publicKey.length !== PUBLIC_KEY_BASE64_LENGTH) {
    throw new Error('Invalid sender public key');
  }
}

// Helper to get current user from session token
async function getCurrentUserId(ctx: MutationCtx, token: string, deviceId: string) {
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', q => q.eq('token', token))
    .first();

  if (!session || session.expiresAt < Date.now() || session.deviceId !== deviceId) {
    throw new Error('Not authenticated');
  }

  return session.userId;
}

// Send a new message
export const send = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    conversationId: v.id('conversations'),
    ciphertext: v.string(), // Base64 encrypted message for recipient
    ciphertextSelf: v.optional(v.string()), // Base64 encrypted message for sender (self)
    nonce: v.string(), // Base64 nonce
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);
    assertValidEncryptedPayload(args.ciphertext, args.nonce, args.ciphertextSelf);

    const sender = await ctx.db.get(userId);
    if (!sender) {
      throw new Error('User not found');
    }
    assertValidPublicKey(sender.publicKey);

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Conversation not found');
    }

    // Create message
    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: userId,
      senderPublicKey: sender.publicKey,
      ciphertext: args.ciphertext,
      ciphertextSelf: args.ciphertextSelf,
      nonce: args.nonce,
      deletedForUserIds: [],
      isDeleted: false,
      editedAt: null,
      deliveredAt: null,
      readAt: null,
    });

    // Update conversation updatedAt
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      hiddenForUserIds: [],
    });

    // Update sender's presence to online (since they just sent a message)
    await ctx.db.patch(userId, {
      lastSeenAt: Date.now(),
      isOnline: true,
    });

    return { messageId };
  },
});

// Edit a message (re-encrypt with new ciphertext)
export const edit = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    messageId: v.id('messages'),
    ciphertext: v.string(),
    ciphertextSelf: v.optional(v.string()),
    nonce: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);
    assertValidEncryptedPayload(args.ciphertext, args.nonce, args.ciphertextSelf);

    const sender = await ctx.db.get(userId);
    if (!sender) {
      throw new Error('User not found');
    }
    assertValidPublicKey(sender.publicKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can edit
    if (message.senderId !== userId) {
      throw new Error('Cannot edit message from another user');
    }

    // Cannot edit deleted message
    if (message.isDeleted || (message.deletedForUserIds ?? []).includes(userId)) {
      throw new Error('Cannot edit deleted message');
    }

    // Check edit time limit (24 hours)
    const messageAge = Date.now() - message._creationTime;
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
    if (messageAge > maxEditAge) {
      throw new Error('Cannot edit message older than 24 hours');
    }

    // Update message (no history stored - privacy first)
    await ctx.db.patch(args.messageId, {
      senderPublicKey: sender.publicKey,
      ciphertext: args.ciphertext,
      ciphertextSelf: args.ciphertextSelf,
      nonce: args.nonce,
      editedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a message (hard delete - set ciphertext to null)
export const remove = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Not authorized to delete this message');
    }

    // Local delete: hide message only for the current user.
    const deletedForUserIds = [...(message.deletedForUserIds ?? [])];
    if (!deletedForUserIds.includes(userId)) {
      deletedForUserIds.push(userId);
    }

    const allParticipantsDeleted = conversation.participantIds.every((participantId) =>
      deletedForUserIds.includes(participantId)
    );

    if (allParticipantsDeleted) {
      // If every participant deleted it, remove encrypted payload permanently.
      await ctx.db.patch(args.messageId, {
        deletedForUserIds,
        ciphertext: null,
        ciphertextSelf: null,
        isDeleted: true,
      });
    } else {
      await ctx.db.patch(args.messageId, {
        deletedForUserIds,
      });
    }

    return { success: true };
  },
});

// Backfill senderPublicKey for historical messages created before snapshot support.
// Safe to run repeatedly: only updates rows that still miss senderPublicKey.
export const backfillSenderPublicKeys = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);
    const sender = await ctx.db.get(userId);
    if (!sender) {
      throw new Error('User not found');
    }
    assertValidPublicKey(sender.publicKey);

    const ownMessages = await ctx.db
      .query('messages')
      .withIndex('by_sender', q => q.eq('senderId', userId))
      .collect();

    let updated = 0;
    for (const message of ownMessages) {
      if (!message.senderPublicKey) {
        await ctx.db.patch(message._id, {
          senderPublicKey: sender.publicKey,
        });
        updated += 1;
      }
    }

    return {
      scanned: ownMessages.length,
      updated,
    };
  },
});

// Mark message as delivered
export const markDelivered = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);

    const message = await ctx.db.get(args.messageId);
    if (!message) return { success: false };

    // Only recipient can mark as delivered
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      return { success: false };
    }

    // Don't mark own messages
    if (message.senderId === userId) {
      return { success: false };
    }
    if ((message.deletedForUserIds ?? []).includes(userId)) {
      return { success: false };
    }

    // Only update if not already delivered
    if (!message.deliveredAt) {
      await ctx.db.patch(args.messageId, {
        deliveredAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Mark message as read
export const markRead = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);

    const message = await ctx.db.get(args.messageId);
    if (!message) return { success: false };

    // Only recipient can mark as read
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      return { success: false };
    }

    // Don't mark own messages
    if (message.senderId === userId) {
      return { success: false };
    }
    if ((message.deletedForUserIds ?? []).includes(userId)) {
      return { success: false };
    }

    // Update delivered and read
    const updates: { deliveredAt?: number; readAt?: number } = {};
    if (!message.deliveredAt) {
      updates.deliveredAt = Date.now();
    }
    if (!message.readAt) {
      updates.readAt = Date.now();
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.messageId, updates);
    }

    return { success: true };
  },
});

// Mark all messages in conversation as read
export const markAllRead = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token, args.deviceId);

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Conversation not found');
    }

    // Get all unread messages from other user
    const unreadMessagesRaw = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .filter(q =>
        q.and(
          q.neq(q.field('senderId'), userId),
          q.eq(q.field('readAt'), null)
        )
      )
      .collect();
    const unreadMessages = unreadMessagesRaw.filter((message) =>
      !(message.deletedForUserIds ?? []).includes(userId)
    );

    // Mark all as read
    const now = Date.now();
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, {
        deliveredAt: message.deliveredAt ?? now,
        readAt: now,
      });
    }

    return { count: unreadMessages.length };
  },
});
