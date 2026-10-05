import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { awardExpenseXp, checkTrophies, localToday, recordActivity, setUpGame } from './gameEngine';
import { findUser, requireUser, validateAmount, validateDate } from './lib';
import { spendAllowance } from './usage';
import { category, paymentMethod } from './schema';

/** Every expense for the user, across all salary cycles. */
export const list = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return [];
    return ctx.db
      .query('expenses')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

/** Creates an expense, or updates it when `id` is passed. */
export const save = mutation({
  args: {
    deviceId: v.string(),
    id: v.optional(v.id('expenses')),
    cycleId: v.id('cycles'),
    title: v.string(),
    amount: v.number(),
    category,
    date: v.string(),
    method: v.optional(paymentMethod),
    note: v.optional(v.string()),
    /** The app's local date, for streaks and daily XP. */
    today: v.optional(v.string()),
  },
  handler: async (ctx, { deviceId, id, today, ...fields }) => {
    const user = await requireUser(ctx, deviceId);
    const cycle = await ctx.db.get(fields.cycleId);
    if (!cycle || cycle.userId !== user._id) throw new ConvexError('Salary not found');
    validateAmount(fields.amount);
    validateDate(fields.date);
    const title = fields.title.trim().slice(0, 80);
    if (!title) throw new ConvexError('Add a title');

    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.userId !== user._id) throw new ConvexError('Expense not found');
      await ctx.db.patch(id, { ...fields, title });
      return id;
    }
    // New expenses count towards the free plan's allowance (Pro is unlimited).
    await spendAllowance(ctx, user, 'expense');
    const day = localToday(today);
    const newId = await ctx.db.insert('expenses', { ...fields, title, userId: user._id });

    // Logging is what the game rewards: XP, the daily streak and any trophies it unlocks.
    await setUpGame(ctx, user._id, day);
    await awardExpenseXp(ctx, user._id, newId, day);
    await recordActivity(ctx, user._id, day);
    await checkTrophies(ctx, user._id, day);
    return newId;
  },
});

export const remove = mutation({
  args: { deviceId: v.string(), id: v.id('expenses') },
  handler: async (ctx, { deviceId, id }) => {
    const user = await requireUser(ctx, deviceId);
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== user._id) throw new ConvexError('Expense not found');
    await ctx.db.delete(id);
  },
});
