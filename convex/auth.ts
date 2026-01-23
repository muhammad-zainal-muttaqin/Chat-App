import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
// import { Id } from './_generated/dataModel';

// Simple hash function (in production, use bcrypt via action)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'privacy-chat-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Register new user
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    displayName: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error('Email already registered');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (args.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    // Create user
    const userId = await ctx.db.insert('users', {
      email: args.email.toLowerCase(),
      passwordHash,
      displayName: args.displayName,
      publicKey: args.publicKey,
      createdAt: Date.now(),
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert('sessions', {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return { userId, token };
  },
});

// Login
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase().trim();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', emailLower))
      .first();

    if (!user) {
      throw new Error('Email tidak terdaftar. Silakan daftar terlebih dahulu.');
    }

    const passwordHash = await hashPassword(args.password);
    if (passwordHash !== user.passwordHash) {
      throw new Error('Password salah. Silakan coba lagi.');
    }

    // Create new session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert('sessions', {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return { userId: user._id, token };
  },
});

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Validate session and get user ID
export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    return session.userId;
  },
});

// Update user's public key (when regenerating keys)
export const updatePublicKey = mutation({
  args: {
    token: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Not authenticated');
    }

    await ctx.db.patch(session.userId, {
      publicKey: args.publicKey,
    });

    return { success: true };
  },
});
