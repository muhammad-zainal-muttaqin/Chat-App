import { v, ConvexError } from 'convex/values';
import { mutation, query } from './_generated/server';
// import { Id } from './_generated/dataModel';

// Generate random salt for password hashing
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Secure password hashing using PBKDF2 with 100,000 iterations
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2 with 100,000 iterations
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Legacy hash function for backwards compatibility with existing users
async function hashPasswordLegacy(password: string): Promise<string> {
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
    encryptedPrivateKey: v.optional(v.string()), // Accept encrypted private key
    deviceId: v.string(), // Unique device identifier to prevent session hijacking
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

    // SECURITY: Check if public key is already used by another user
    const existingKeyUser = await ctx.db
      .query('users')
      .withIndex('by_public_key', q => q.eq('publicKey', args.publicKey))
      .first();

    if (existingKeyUser) {
      console.error('SECURITY: Attempt to register with duplicate public key', {
        email: args.email,
        existingUserId: existingKeyUser._id,
      });
      throw new ConvexError('ERR_DUPLICATE_PUBLIC_KEY');
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

    // Generate random salt and hash password with PBKDF2
    const passwordSalt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(args.password, passwordSalt);

    // Create user with secure password hash
    const userId = await ctx.db.insert('users', {
      email: args.email.toLowerCase(),
      passwordHash,
      passwordSalt, // Store unique salt per user
      displayName: args.displayName,
      publicKey: args.publicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
      createdAt: Date.now(),
    });

    // Create session with device binding
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.db.insert('sessions', {
      userId,
      token,
      deviceId: args.deviceId, // Bind session to this device
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
    deviceId: v.string(), // Unique device identifier to prevent session hijacking
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase().trim();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', emailLower))
      .first();

    // Generic error message removal to support specific error handling
    // const genericError = 'Email atau password salah. Silakan coba lagi.';

    if (!user) {
      throw new ConvexError('ERR_USER_NOT_FOUND');
    }

    // Check password - support both old and new hash formats
    let passwordValid = false;
    let needsUpgrade = false;

    if (user.passwordSalt) {
      // New secure format with unique salt (PBKDF2)
      const passwordHash = await hashPasswordWithSalt(args.password, user.passwordSalt);
      passwordValid = passwordHash === user.passwordHash;
    } else {
      // Legacy format for existing users (SHA-256 with static salt)
      const legacyHash = await hashPasswordLegacy(args.password);
      passwordValid = legacyHash === user.passwordHash;
      needsUpgrade = passwordValid; // Upgrade to new format on successful login
    }

    if (!passwordValid) {
      throw new ConvexError('ERR_INVALID_PASSWORD');
    }

    // Upgrade legacy password hash to secure PBKDF2 format
    if (needsUpgrade) {
      const newSalt = generateSalt();
      const newHash = await hashPasswordWithSalt(args.password, newSalt);
      await ctx.db.patch(user._id, {
        passwordHash: newHash,
        passwordSalt: newSalt,
      });
    }

    // Create new session with device binding
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Revoke previous sessions on the same device to invalidate old copied tokens
    const existingSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();

    for (const existingSession of existingSessions) {
      if (existingSession.deviceId === args.deviceId) {
        await ctx.db.delete(existingSession._id);
      }
    }

    await ctx.db.insert('sessions', {
      userId: user._id,
      token,
      deviceId: args.deviceId, // Bind session to this device
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      userId: user._id,
      token,
      encryptedPrivateKey: user.encryptedPrivateKey,
      publicKey: user.publicKey
    };
  },
});

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (session && session.deviceId === args.deviceId) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Validate session and get user ID
export const validateSession = query({
  args: {
    token: v.string(),
    deviceId: v.string(), // Must match the device that created the session
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    // SECURITY: Validate device ID to prevent session hijacking
    // If someone copies the token to another device, this check will fail
    if (session.deviceId !== args.deviceId) {
      console.error('SECURITY: Session device mismatch - possible session hijacking', {
        sessionDeviceId: session.deviceId.substring(0, 10) + '...',
        requestDeviceId: args.deviceId.substring(0, 10) + '...',
      });
      return null;
    }

    return session.userId;
  },
});

// Update user's public key (when regenerating keys)
export const updatePublicKey = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (!session || session.expiresAt < Date.now() || session.deviceId !== args.deviceId) {
      throw new Error('Not authenticated');
    }

    // SECURITY: Check if this public key is already used by another user
    // This prevents key collision attacks where one user tries to use another's key
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_public_key', q => q.eq('publicKey', args.publicKey))
      .first();

    if (existingUser && existingUser._id !== session.userId) {
      console.error('SECURITY: Attempt to set duplicate public key', {
        attemptingUserId: session.userId,
        existingUserId: existingUser._id,
      });
      throw new ConvexError('ERR_DUPLICATE_PUBLIC_KEY');
    }

    await ctx.db.patch(session.userId, {
      publicKey: args.publicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
    });

    return { success: true };
  },
});
