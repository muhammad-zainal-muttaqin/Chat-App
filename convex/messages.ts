import { v } from 'convex/values';
import { mutation, MutationCtx } from './_generated/server';
// import { Id } from './_generated/dataModel';

// Helper to get current user from session token
async function getCurrentUserId(ctx: MutationCtx, token: string) {
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', q => q.eq('token', token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error('Not authenticated');
  }

  return session.userId;
}

// Send a new message
export const send = mutation({
  args: {
    token: v.string(),
    conversationId: v.id('conversations'),
    ciphertext: v.string(), // Base64 encrypted message for recipient
    ciphertextSelf: v.optional(v.string()), // Base64 encrypted message for sender (self)
    nonce: v.string(), // Base64 nonce
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Conversation not found');
    }

    // Create message
    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: userId,
      ciphertext: args.ciphertext,
      ciphertextSelf: args.ciphertextSelf,
      nonce: args.nonce,
      isDeleted: false,
      editedAt: null,
      deliveredAt: null,
      readAt: null,
    });

    // Update conversation updatedAt
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
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
    messageId: v.id('messages'),
    ciphertext: v.string(),
    ciphertextSelf: v.optional(v.string()),
    nonce: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can edit
    if (message.senderId !== userId) {
      throw new Error('Cannot edit message from another user');
    }

    // Cannot edit deleted message
    if (message.isDeleted) {
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
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      throw new Error('Cannot delete message from another user');
    }

    // Hard delete - remove ciphertext permanently
    await ctx.db.patch(args.messageId, {
      ciphertext: null,
      isDeleted: true,
    });

    return { success: true };
  },
});

// Mark message as delivered
export const markDelivered = mutation({
  args: {
    token: v.string(),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

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
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

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
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Conversation not found');
    }

    // Get all unread messages from other user
    const unreadMessages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .filter(q =>
        q.and(
          q.neq(q.field('senderId'), userId),
          q.eq(q.field('readAt'), null)
        )
      )
      .collect();

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
