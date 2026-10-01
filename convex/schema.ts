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
  }).index('by_device', ['deviceId']),

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
