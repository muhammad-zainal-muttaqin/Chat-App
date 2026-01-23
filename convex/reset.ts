import { mutation } from './_generated/server';

// Reset database - delete all data from all tables
export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all messages
    const messages = await ctx.db.query('messages').collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all conversations
    const conversations = await ctx.db.query('conversations').collect();
    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id);
    }

    // Delete all sessions
    const sessions = await ctx.db.query('sessions').collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all users
    const users = await ctx.db.query('users').collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      deleted: {
        messages: messages.length,
        conversations: conversations.length,
        sessions: sessions.length,
        users: users.length,
      },
    };
  },
});
