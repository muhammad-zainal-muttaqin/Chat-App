import { v } from 'convex/values';
import { query, mutation, QueryCtx } from './_generated/server';
// import { Id } from './_generated/dataModel';

// Helper to get current user from session token with device validation
async function getCurrentUser(ctx: QueryCtx, token: string | undefined, deviceId?: string) {
  if (!token) return null;

  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', q => q.eq('token', token))
    .first();

  if (!session || session.expiresAt < Date.now()) return null;

  // SECURITY: Validate device ID if provided (prevents session hijacking)
  if (deviceId && session.deviceId !== deviceId) {
    console.error('SECURITY: Device mismatch detected in getCurrentUser');
    return null;
  }

  return await ctx.db.get(session.userId);
}

// Helper to check online status (Server Side)
const OFFLINE_THRESHOLD = 5 * 1000; // 5 seconds

function isOnline(lastSeenAt: number | undefined | null, isOnlineFlag: boolean | undefined | null) {
  // If explicitly offline (isOnline: false), trust it immediately
  if (isOnlineFlag === false) return false;
  
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt < OFFLINE_THRESHOLD;
}

// Get current user
export const getMe = query({
  args: {
    token: v.string(),
    deviceId: v.optional(v.string()), // Optional for backwards compatibility, but should be provided
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const user = await getCurrentUser(ctx, args.token, args.deviceId);
    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      publicKey: user.publicKey,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      isOnline: isOnline(user.lastSeenAt, user.isOnline),
    };
  },
});

// Get user by ID (for fetching public key)
export const getById = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      _id: user._id,
      displayName: user.displayName,
      publicKey: user.publicKey,
    };
  },
});

// Search users by email or display name
export const search = query({
  args: {
    query: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.token);
    if (!currentUser) return [];

    const searchQuery = args.query.toLowerCase();
    if (searchQuery.length < 2) return [];

    // Get all users and filter (for MVP, this is fine)
    // In production, use a search index
    const users = await ctx.db.query('users').collect();

    return users
      .filter(user =>
        user._id !== currentUser._id &&
        (user.email.toLowerCase().includes(searchQuery) ||
          user.displayName.toLowerCase().includes(searchQuery))
      )
      .slice(0, 10)
      .map(user => ({
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        publicKey: user.publicKey,
      }));
  },
});

// Update profile
export const updateProfile = mutation({
  args: {
    token: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Not authenticated');
    }

    const updates: Record<string, any> = {};
    if (args.displayName) {
      updates.displayName = args.displayName;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(session.userId, updates);
    }

    return { success: true };
  },
});

// NOTE: updatePublicKey mutation has been moved to convex/auth.ts
// It includes encryptedPrivateKey parameter and duplicate key check for security

// Update user presence (heartbeat)
export const updatePresence = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false };
    }

    const now = Date.now();
    await ctx.db.patch(session.userId, {
      lastSeenAt: now,
      isOnline: true,
    });

    return { success: true, timestamp: now };
  },
});

// Set user offline (explicit - for logout or tab close)
export const setOffline = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session) return { success: false };

    await ctx.db.patch(session.userId, {
      isOnline: false,
    });

    return { success: true };
  },
});
