import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { awardXp, checkTrophies, localToday, questBlocker, setUpGame } from './gameEngine';
import { liveStreak, QuestXp, type QuestId } from './gameRules';
import { findUser, requireUser } from './lib';

const questId = v.union(v.literal('log'), v.literal('ration'), v.literal('budgets'));

/** XP, streak, trophies and today's claimed quests. `today` is the app's local date. */
export const get = query({
  args: { deviceId: v.string(), today: v.string() },
  handler: async (ctx, { deviceId, today }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return null;
    const day = localToday(today);
    const todays = await ctx.db
      .query('xpEvents')
      .withIndex('by_user_day', (q) => q.eq('userId', user._id).eq('day', day))
      .collect();
    const claimed = todays
      .filter((e) => e.key.startsWith('quest:'))
      .map((e) => e.key.split(':')[1] as QuestId);
    return {
      ready: user.gameReady ?? false,
      xp: user.xp ?? 0,
      streak: liveStreak(user.streak ?? 0, user.lastActiveDay, day),
      bestStreak: user.bestStreak ?? 0,
      loggedToday: user.lastActiveDay === day,
      trophies: user.trophies ?? [],
      claimed,
      xpToday: todays.reduce((sum, e) => sum + e.xp, 0),
    };
  },
});

/** Sets up the game for the account, backfilling progress from existing history. */
export const init = mutation({
  args: { deviceId: v.string(), today: v.string() },
  handler: async (ctx, { deviceId, today }) => {
    const user = await requireUser(ctx, deviceId);
    await setUpGame(ctx, user._id, localToday(today));
  },
});

/** Claims a daily quest after checking it against the stored data. Returns the XP awarded. */
export const claimQuest = mutation({
  args: { deviceId: v.string(), quest: questId, today: v.string() },
  handler: async (ctx, { deviceId, quest, today }) => {
    const day = localToday(today);
    await setUpGame(ctx, (await requireUser(ctx, deviceId))._id, day);
    // Read again: setup may have just filled in the streak fields.
    const user = await requireUser(ctx, deviceId);
    const blocker = await questBlocker(ctx, user, quest, day);
    if (blocker) throw new ConvexError(blocker);
    const xp = await awardXp(ctx, user._id, `quest:${quest}:${day}`, QuestXp[quest], day);
    await checkTrophies(ctx, user._id, day);
    return xp;
  },
});
