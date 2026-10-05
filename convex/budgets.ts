import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { awardXp, checkTrophies, localToday, setUpGame } from './gameEngine';
import { XpReward } from './gameRules';
import { findUser, requireUser } from './lib';
import { category } from './schema';

export const list = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return [];
    return ctx.db
      .query('budgets')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

/** Sets the limit for a category; a limit of 0 removes the budget. */
export const set = mutation({
  args: { deviceId: v.string(), category, limit: v.number(), today: v.optional(v.string()) },
  handler: async (ctx, { deviceId, category, limit, today }) => {
    const user = await requireUser(ctx, deviceId);
    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_user', (q) => q.eq('userId', user._id).eq('category', category))
      .unique();
    if (!Number.isFinite(limit) || limit <= 0) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }
    if (existing) await ctx.db.patch(existing._id, { limit });
    else await ctx.db.insert('budgets', { userId: user._id, category, limit });

    // One-time reward for planning budgets.
    const day = localToday(today);
    await setUpGame(ctx, user._id, day);
    await awardXp(ctx, user._id, 'budgets', XpReward.budgets, day);
    await checkTrophies(ctx, user._id, day);
  },
});
