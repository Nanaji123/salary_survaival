import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { action, internalMutation, query, type MutationCtx } from './_generated/server';
import { findUser } from './lib';
import { FREE_LIMITS, LIMIT_CODE, limitMessage, type Feature, type LimitError } from './plans';

// The Convex runtime provides process.env; declare it since this project has no Node typings.
declare const process: { env: Record<string, string | undefined> };

/** Free allowances are one-time, so every use is counted in this single period (see schema `usage.day`). */
const PERIOD = 'lifetime';

export const feature = v.union(v.literal('expense'), v.literal('assistant'), v.literal('summary'), v.literal('plan'));

async function usageRow(ctx: MutationCtx, userId: Doc<'users'>['_id'], f: Feature) {
  return ctx.db
    .query('usage')
    .withIndex('by_user_day_feature', (q) => q.eq('userId', userId).eq('day', PERIOD).eq('feature', f))
    .unique();
}

/**
 * Counts `amount` uses of a free feature, or throws a LimitError when that would go over the
 * one-time free allowance. Pro users are never counted. Runs inside the caller's mutation, so a
 * rejected request leaves nothing behind.
 */
export async function spendAllowance(ctx: MutationCtx, user: Doc<'users'>, f: Feature, amount = 1) {
  if (user.pro) return;
  const row = await usageRow(ctx, user._id, f);
  const used = row?.count ?? 0;
  if (used + amount > FREE_LIMITS[f]) {
    throw new ConvexError<LimitError>({ code: LIMIT_CODE, feature: f, message: limitMessage(f) });
  }
  if (row) await ctx.db.patch(row._id, { count: used + amount });
  else await ctx.db.insert('usage', { userId: user._id, day: PERIOD, feature: f, count: amount });
}

/** Gives a use back, e.g. when the AI request it paid for failed. */
export async function refundAllowance(ctx: MutationCtx, user: Doc<'users'>, f: Feature) {
  if (user.pro) return;
  const row = await usageRow(ctx, user._id, f);
  if (row && row.count > 0) await ctx.db.patch(row._id, { count: row.count - 1 });
}

/** Free plan usage so far, for the app to show what's left. */
export const today = query({
  // `today` is still accepted from older app versions but no longer used: allowances don't reset.
  args: { deviceId: v.string(), today: v.optional(v.string()) },
  handler: async (ctx, { deviceId }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return null;
    const rows = await ctx.db
      .query('usage')
      .withIndex('by_user_day_feature', (q) => q.eq('userId', user._id).eq('day', PERIOD))
      .collect();
    const used: Record<Feature, number> = { expense: 0, assistant: 0, summary: 0, plan: 0 };
    for (const r of rows) used[r.feature] = r.count;
    return { pro: !!user.pro, used, limits: FREE_LIMITS };
  },
});

export const setPro = internalMutation({
  args: { deviceId: v.string(), pro: v.boolean() },
  handler: async (ctx, { deviceId, pro }) => {
    const user = await findUser(ctx, deviceId);
    if (user && user.pro !== pro) await ctx.db.patch(user._id, { pro, proCheckedAt: Date.now() });
  },
});

/**
 * Records whether the account has Pro. With REVENUECAT_SECRET_KEY set in the Convex environment the
 * claim is checked against RevenueCat (the app logs in to RevenueCat with the device ID); without it
 * the app's own RevenueCat result is used.
 */
export const syncPro = action({
  args: { deviceId: v.string(), pro: v.boolean() },
  handler: async (ctx, { deviceId, pro }) => {
    let verified = pro;
    const secret = process.env.REVENUECAT_SECRET_KEY;
    if (secret) {
      try {
        const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(deviceId)}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        if (res.ok) {
          const data = await res.json();
          const entitlements: Record<string, { expires_date: string | null }> = data?.subscriber?.entitlements ?? {};
          const now = Date.now();
          verified = Object.values(entitlements).some((e) => !e.expires_date || Date.parse(e.expires_date) > now);
        }
      } catch {
        // RevenueCat unreachable: keep the app's answer rather than locking a paying user out.
      }
    }
    await ctx.runMutation(internal.usage.setPro, { deviceId, pro: verified });
    return verified;
  },
});
