import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { findUser, requireUser, validateAmount, validateDate } from './lib';

/** All salary cycles for the user, newest first. */
export const list = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return [];
    return ctx.db
      .query('cycles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

const fields = {
  amount: v.number(),
  receivedOn: v.string(),
  note: v.optional(v.string()),
};

export const add = mutation({
  args: { deviceId: v.string(), ...fields },
  handler: async (ctx, { deviceId, amount, receivedOn, note }) => {
    const user = await requireUser(ctx, deviceId);
    validateAmount(amount);
    validateDate(receivedOn);
    return ctx.db.insert('cycles', { userId: user._id, amount, receivedOn, note });
  },
});

export const update = mutation({
  args: { deviceId: v.string(), id: v.id('cycles'), ...fields },
  handler: async (ctx, { deviceId, id, amount, receivedOn, note }) => {
    const user = await requireUser(ctx, deviceId);
    const cycle = await ctx.db.get(id);
    if (!cycle || cycle.userId !== user._id) throw new ConvexError('Salary not found');
    validateAmount(amount);
    validateDate(receivedOn);
    await ctx.db.patch(id, { amount, receivedOn, note });
  },
});
