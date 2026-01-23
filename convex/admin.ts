import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Hash function duplicated from auth.ts
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'privacy-chat-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const resetUserPassword = mutation({
    args: {
        email: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', q => q.eq('email', args.email.toLowerCase()))
            .first();

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        const passwordHash = await hashPassword(args.newPassword);

        await ctx.db.patch(user._id, {
            passwordHash,
        });

        return { success: true, message: `Password for ${args.email} updated successfully` };
    },
});

export const simpleListUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query('users').collect();
        return users.map(u => ({ displayName: u.displayName, email: u.email }));
    }
});
