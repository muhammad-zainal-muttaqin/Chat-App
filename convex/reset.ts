import { internalAction } from './_generated/server';
import { v } from 'convex/values';

// Access Convex environment variables (available in server-side functions)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env as Record<string, string | undefined> | undefined;

// CRITICAL: These operations must NOT be callable from any client SDK.
// Using internalAction ensures they can only be triggered from:
// - Convex cron jobs
// - Convex dashboard
// - Other server-side functions via ctx.runAction
//
// The ADMIN_SECRET env var must be set in the Convex dashboard:
//   npx convex env set ADMIN_SECRET <random-secret>

// Clear all sessions - force logout all users
export const clearAllSessions = internalAction({
  args: {
    adminSecret: v.string(),
  },
  handler: async (_ctx, args) => {
    const adminSecret = env?.ADMIN_SECRET;
    if (!adminSecret || args.adminSecret !== adminSecret) {
      throw new Error('Unauthorized: invalid admin secret');
    }
    return {
      message:
        'Use the Convex dashboard or an internal mutation to clear sessions. This action is intentionally gated.',
    };
  },
});

// Reset database - delete all data from all tables
export const resetDatabase = internalAction({
  args: {
    adminSecret: v.string(),
  },
  handler: async (_ctx, args) => {
    const adminSecret = env?.ADMIN_SECRET;
    if (!adminSecret || args.adminSecret !== adminSecret) {
      throw new Error('Unauthorized: invalid admin secret');
    }
    return {
      message:
        'Use the Convex dashboard or an internal mutation to reset the database. This action is intentionally gated.',
    };
  },
});
