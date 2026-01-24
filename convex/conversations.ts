import { v } from 'convex/values';
import { query, mutation, QueryCtx, MutationCtx } from './_generated/server';
// import { Id } from './_generated/dataModel';

// Helper to get current user from session token
async function getCurrentUserId(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', q => q.eq('token', token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error('Not authenticated');
  }

  return session.userId;
}

// List all conversations for current user
export const list = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    // Get all conversations
    const allConversations = await ctx.db.query('conversations').collect();

    // Filter conversations where user is a participant
    const userConversations = allConversations.filter(conv =>
      conv.participantIds.includes(userId)
    );

    // Get conversation details with last message and other participant
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        // Get other participant
        const otherUserId = conv.participantIds.find(id => id !== userId);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        // Get last message
        const lastMessage = await ctx.db
          .query('messages')
          .withIndex('by_conversation', q => q.eq('conversationId', conv._id))
          .order('desc')
          .first();

        // Count unread messages
        const unreadMessages = await ctx.db
          .query('messages')
          .withIndex('by_conversation', q => q.eq('conversationId', conv._id))
          .filter(q =>
            q.and(
              q.neq(q.field('senderId'), userId),
              q.eq(q.field('readAt'), null),
              q.eq(q.field('isDeleted'), false)
            )
          )
          .collect();

        return {
          _id: conv._id,
          otherUser: otherUser ? {
            _id: otherUser._id,
            displayName: otherUser.displayName,
            publicKey: otherUser.publicKey,
            lastSeenAt: otherUser.lastSeenAt ?? null,
            isOnline: otherUser.isOnline ?? false,
          } : null,
          lastMessage: lastMessage ? {
            _id: lastMessage._id,
            isDeleted: lastMessage.isDeleted,
            senderId: lastMessage.senderId,
            createdAt: lastMessage._creationTime,
          } : null,
          unreadCount: unreadMessages.length,
          updatedAt: conv.updatedAt,
        };
      })
    );

    // Sort by updatedAt descending
    return conversationsWithDetails.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get or create conversation with another user
export const getOrCreate = mutation({
  args: {
    token: v.string(),
    otherUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    if (userId === args.otherUserId) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Check if other user exists
    const otherUser = await ctx.db.get(args.otherUserId);
    if (!otherUser) {
      throw new Error('User not found');
    }

    // Check if conversation already exists
    const allConversations = await ctx.db.query('conversations').collect();
    const existingConv = allConversations.find(conv =>
      conv.participantIds.includes(userId) &&
      conv.participantIds.includes(args.otherUserId)
    );

    if (existingConv) {
      return {
        _id: existingConv._id,
        isNew: false,
      };
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert('conversations', {
      participantIds: [userId, args.otherUserId],
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: conversationId,
      isNew: true,
    };
  },
});

// Get conversation by ID
export const getById = query({
  args: {
    token: v.string(),
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Check if user is participant
    if (!conversation.participantIds.includes(userId)) {
      return null;
    }

    // Get other participant
    const otherUserId = conversation.participantIds.find(id => id !== userId);
    const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

    return {
      _id: conversation._id,
      otherUser: otherUser ? {
        _id: otherUser._id,
        displayName: otherUser.displayName,
        publicKey: otherUser.publicKey,
        lastSeenAt: otherUser.lastSeenAt ?? null,
        isOnline: otherUser.isOnline ?? false,
      } : null,
      createdAt: conversation.createdAt,
    };
  },
});

// Get messages for a conversation (paginated)
export const getMessages = query({
  args: {
    token: v.string(),
    conversationId: v.id('conversations'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // timestamp for pagination
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);
    const limit = args.limit ?? 50;

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Conversation not found');
    }

    // Get messages
    let messagesQuery = ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .order('desc');

    const allMessages = await messagesQuery.collect();

    // Filter by cursor if provided
    let filteredMessages = allMessages;
    if (args.cursor) {
      filteredMessages = allMessages.filter(m => m._creationTime < args.cursor!);
    }

    // Take limit + 1 to check if there are more
    const messages = filteredMessages.slice(0, limit + 1);
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Get next cursor
    const nextCursor = messages.length > 0
      ? messages[messages.length - 1]._creationTime
      : null;

    return {
      messages: messages.map(m => ({
        _id: m._id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        ciphertext: m.ciphertext,
        ciphertextSelf: m.ciphertextSelf, // Include self-encrypted content
        nonce: m.nonce,
        isDeleted: m.isDeleted,
        editedAt: m.editedAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        createdAt: m._creationTime,
      })),
      nextCursor,
      hasMore,
    };
  },
});

// Delete a conversation and all its messages
export const deleteConversation = mutation({
  args: {
    token: v.string(),
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.participantIds.includes(userId)) {
      throw new Error('Not authorized to delete this conversation');
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation itself
    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});
