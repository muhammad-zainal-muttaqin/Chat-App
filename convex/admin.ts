import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

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

// Legacy hash function for backwards compatibility
async function hashPasswordLegacy(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'privacy-chat-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to validate session
async function validateSession(ctx: { db: any }, token: string) {
    const session = await ctx.db
        .query('sessions')
        .withIndex('by_token', (q: any) => q.eq('token', token))
        .first();

    if (!session || session.expiresAt < Date.now()) {
        throw new Error('Not authenticated');
    }

    return session.userId;
}

// Password reset - REQUIRES authentication token
// Only allows users to reset their OWN password
export const resetOwnPassword = mutation({
    args: {
        token: v.string(),
        currentPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate session first
        const userId = await validateSession(ctx, args.token);

        const user = await ctx.db
            .query('users')
            .filter(q => q.eq(q.field('_id'), userId))
            .first();

        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password - support both old and new formats
        let currentPasswordValid = false;

        if (user.passwordSalt) {
            // New secure format
            const currentHash = await hashPasswordWithSalt(args.currentPassword, user.passwordSalt);
            currentPasswordValid = currentHash === user.passwordHash;
        } else {
            // Legacy format
            const legacyHash = await hashPasswordLegacy(args.currentPassword);
            currentPasswordValid = legacyHash === user.passwordHash;
        }

        if (!currentPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password strength
        if (args.newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters');
        }

        // Hash new password with secure PBKDF2 format
        const newSalt = generateSalt();
        const newHash = await hashPasswordWithSalt(args.newPassword, newSalt);

        await ctx.db.patch(userId, {
            passwordHash: newHash,
            passwordSalt: newSalt,
        });

        return { success: true, message: 'Password updated successfully' };
    },
});

// List users - REQUIRES authentication
// Only returns limited public info for authenticated users
export const listUsers = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate session first
        await validateSession(ctx, args.token);

        const users = await ctx.db.query('users').collect();
        // Only return public display names, NOT emails
        return users.map(u => ({
            id: u._id,
            displayName: u.displayName
        }));
    }
});
