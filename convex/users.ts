import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { findUser, requireUser } from './lib';

export const get = query({
  args: { deviceId: v.string() },
  handler: (ctx, { deviceId }) => findUser(ctx, deviceId),
});

/** Signs in with the device ID, creating the account on first launch. */
export const signIn = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const existing = await findUser(ctx, deviceId);
    if (existing) return existing._id;
    return ctx.db.insert('users', { deviceId, name: '', currency: 'INR', onboarded: false });
  },
});

export const update = mutation({
  args: {
    deviceId: v.string(),
    name: v.optional(v.string()),
    currency: v.optional(v.string()),
    onboarded: v.optional(v.boolean()),
    payday: v.optional(v.number()),
    savingsGoal: v.optional(v.number()),
  },
  handler: async (ctx, { deviceId, ...patch }) => {
    const user = await requireUser(ctx, deviceId);
    if (patch.payday !== undefined && !(patch.payday >= 1 && patch.payday <= 31)) {
      throw new ConvexError('Payday must be between 1 and 31');
    }
    if (patch.savingsGoal !== undefined && !(patch.savingsGoal >= 0 && patch.savingsGoal < 1e12)) {
      throw new ConvexError('Enter a valid savings goal');
    }
    await ctx.db.patch(user._id, {
      ...patch,
      name: patch.name?.trim().slice(0, 60) ?? user.name,
    });
  },
});

/** Deletes the account and all of its salaries and expenses. */
export const eraseAll = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return;
    const [expenses, cycles, budgets] = await Promise.all([
      ctx.db
        .query('expenses')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
      ctx.db
        .query('cycles')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
      ctx.db
        .query('budgets')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
    ]);
    await Promise.all([...expenses, ...cycles, ...budgets].map((d) => ctx.db.delete(d._id)));
    await ctx.db.delete(user._id);
  },
});
