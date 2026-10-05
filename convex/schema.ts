import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const category = v.union(
  v.literal('rent'),
  v.literal('food'),
  v.literal('groceries'),
  v.literal('transport'),
  v.literal('bills'),
  v.literal('shopping'),
  v.literal('health'),
  v.literal('entertainment'),
  v.literal('education'),
  v.literal('travel'),
  v.literal('subscriptions'),
  v.literal('family'),
  v.literal('personal'),
  v.literal('gifts'),
  v.literal('savings'),
  v.literal('other'),
);

export const paymentMethod = v.union(
  v.literal('cash'),
  v.literal('card'),
  v.literal('bank'),
  v.literal('wallet'),
);

export default defineSchema({
  users: defineTable({
    /** iOS identifierForVendor / Android ID: one device maps to one account. */
    deviceId: v.string(),
    name: v.string(),
    currency: v.string(),
    onboarded: v.boolean(),
    /** Usual day of the month the salary arrives (1–31). */
    payday: v.optional(v.number()),
    /** Amount the user wants to keep aside from each salary. */
    savingsGoal: v.optional(v.number()),

    // Game progress. Optional because accounts created before the game existed are backfilled
    // from their history the first time the app asks (see gameEngine.setUpGame).
    gameReady: v.optional(v.boolean()),
    /** Running total of the xpEvents ledger. */
    xp: v.optional(v.number()),
    /** Days in a row with something logged, ending on `lastActiveDay`. */
    streak: v.optional(v.number()),
    bestStreak: v.optional(v.number()),
    /** Local YYYY-MM-DD of the last day something was logged. */
    lastActiveDay: v.optional(v.string()),
    trophies: v.optional(v.array(v.object({ id: v.string(), at: v.number() }))),

    /** Pro subscription, synced from RevenueCat by usage.syncPro. Free plan limits skip Pro users. */
    pro: v.optional(v.boolean()),
    proCheckedAt: v.optional(v.number()),
  }).index('by_device', ['deviceId']),

  /** Free plan usage per user, local day and feature (see plans.ts). */
  usage: defineTable({
    userId: v.id('users'),
    day: v.string(), // local YYYY-MM-DD
    feature: v.union(v.literal('expense'), v.literal('assistant'), v.literal('summary'), v.literal('plan')),
    count: v.number(),
  }).index('by_user_day_feature', ['userId', 'day', 'feature']),

  /** XP ledger. `key` makes every reward idempotent, e.g. "expense:<id>" or "quest:log:2026-10-04". */
  xpEvents: defineTable({
    userId: v.id('users'),
    key: v.string(),
    xp: v.number(),
    day: v.string(), // local YYYY-MM-DD the XP was earned
  })
    .index('by_user_key', ['userId', 'key'])
    .index('by_user_day', ['userId', 'day']),

  /** AI calls per user per day, used to cap usage. */
  aiUsage: defineTable({
    userId: v.id('users'),
    day: v.string(), // UTC YYYY-MM-DD
    count: v.number(),
  }).index('by_user_day', ['userId', 'day']),

  /** Spending limit per category, applied to every salary cycle. */
  budgets: defineTable({
    userId: v.id('users'),
    category,
    limit: v.number(),
  }).index('by_user', ['userId', 'category']),

  /** One salary payment and the spending cycle that follows it. */
  cycles: defineTable({
    userId: v.id('users'),
    amount: v.number(),
    receivedOn: v.string(), // local YYYY-MM-DD
    note: v.optional(v.string()),
  }).index('by_user', ['userId', 'receivedOn']),

  expenses: defineTable({
    userId: v.id('users'),
    cycleId: v.id('cycles'),
    title: v.string(),
    amount: v.number(),
    category,
    date: v.string(), // local YYYY-MM-DD
    method: v.optional(paymentMethod),
    note: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_cycle', ['cycleId']),
});
