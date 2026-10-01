import { ConvexError } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

export function findUser(ctx: QueryCtx, deviceId: string) {
  return ctx.db
    .query('users')
    .withIndex('by_device', (q) => q.eq('deviceId', deviceId))
    .unique();
}

export async function requireUser(ctx: QueryCtx, deviceId: string): Promise<Doc<'users'>> {
  const user = await findUser(ctx, deviceId);
  if (!user) throw new ConvexError('Account not found');
  return user;
}

export function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    throw new ConvexError('Enter a valid amount');
  }
}

export function validateDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ConvexError('Invalid date');
}
