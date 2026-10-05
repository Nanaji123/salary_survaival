import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  DAILY_EXPENSE_XP_CAP,
  dayDiff,
  isDateKey,
  levelFor,
  rationFor,
  Trophies,
  XpReward,
  type QuestId,
  type TrophyId,
} from './gameRules';

/** The user's local date sent by the app, trusted only within a day of the server clock (time zones). */
export function localToday(today?: string) {
  const utc = new Date().toISOString().slice(0, 10);
  if (today && isDateKey(today) && Math.abs(dayDiff(utc, today)) <= 1) return today;
  return utc;
}

async function loadHistory(ctx: QueryCtx, userId: Id<'users'>) {
  const [expenses, cycles, budgets] = await Promise.all([
    ctx.db
      .query('expenses')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('cycles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect(),
    ctx.db
      .query('budgets')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ]);
  return { expenses, cycles, budgets };
}

/** Adds XP once per `key`. Returns the XP actually awarded: 0 when that reward was already given. */
export async function awardXp(ctx: MutationCtx, userId: Id<'users'>, key: string, xp: number, day: string) {
  const existing = await ctx.db
    .query('xpEvents')
    .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('key', key))
    .unique();
  if (existing) return 0;
  await ctx.db.insert('xpEvents', { userId, key, xp, day });
  const user = await ctx.db.get(userId);
  await ctx.db.patch(userId, { xp: (user?.xp ?? 0) + xp });
  return xp;
}

/** XP for a newly logged expense, capped per day. */
export async function awardExpenseXp(ctx: MutationCtx, userId: Id<'users'>, expenseId: Id<'expenses'>, day: string) {
  const todays = await ctx.db
    .query('xpEvents')
    .withIndex('by_user_day', (q) => q.eq('userId', userId).eq('day', day))
    .collect();
  if (todays.filter((e) => e.key.startsWith('expense:')).length >= DAILY_EXPENSE_XP_CAP) return 0;
  return awardXp(ctx, userId, `expense:${expenseId}`, XpReward.expense, day);
}

/** Marks `today` as active: extends the streak after yesterday, otherwise starts a new one. */
export async function recordActivity(ctx: MutationCtx, userId: Id<'users'>, today: string) {
  const user = await ctx.db.get(userId);
  if (!user || user.lastActiveDay === today) return;
  // A date earlier than the last activity (clock or time zone change) leaves the streak alone.
  if (user.lastActiveDay && user.lastActiveDay > today) return;
  const continues = !!user.lastActiveDay && dayDiff(user.lastActiveDay, today) === 1;
  const streak = continues ? (user.streak ?? 0) + 1 : 1;
  await ctx.db.patch(userId, {
    streak,
    bestStreak: Math.max(user.bestStreak ?? 0, streak),
    lastActiveDay: today,
  });
}

function trophyConditions(user: Doc<'users'>, history: Awaited<ReturnType<typeof loadHistory>>) {
  const spentByCycle = new Map<string, number>();
  for (const e of history.expenses) spentByCycle.set(e.cycleId, (spentByCycle.get(e.cycleId) ?? 0) + e.amount);
  const best = user.bestStreak ?? 0;
  const met: Record<TrophyId, boolean> = {
    first: history.expenses.length >= 1,
    streak3: best >= 3,
    saver: (user.savingsGoal ?? 0) > 0,
    planner: history.budgets.length > 0,
    streak7: best >= 7,
    // Every cycle except the live one has reached payday.
    survivor: history.cycles.slice(1).some((c) => (spentByCycle.get(c._id) ?? 0) < c.amount),
    tracker: history.expenses.length >= 50,
    legend: levelFor(user.xp ?? 0).level >= 5,
  };
  return met;
}

/** Unlocks every trophy whose condition is now met and awards its bonus XP. */
export async function checkTrophies(ctx: MutationCtx, userId: Id<'users'>, today: string) {
  // A second pass catches trophies unlocked by the bonus XP of the first (e.g. reaching level 5).
  for (let pass = 0; pass < 2; pass++) {
    const user = await ctx.db.get(userId);
    if (!user) return;
    const have = new Set((user.trophies ?? []).map((t) => t.id));
    const met = trophyConditions(user, await loadHistory(ctx, userId));
    const fresh = Trophies.filter((t) => !have.has(t.id) && met[t.id]);
    if (fresh.length === 0) return;
    await ctx.db.patch(userId, {
      trophies: [...(user.trophies ?? []), ...fresh.map((t) => ({ id: t.id, at: Date.now() }))],
    });
    for (const t of fresh) await awardXp(ctx, userId, `trophy:${t.id}`, XpReward.trophy, today);
  }
}

/**
 * First-time setup. Accounts that existed before the game get XP, streaks and trophies backfilled
 * from their history, so long-time users don't start from zero. Safe to call repeatedly.
 */
export async function setUpGame(ctx: MutationCtx, userId: Id<'users'>, today: string) {
  const user = await ctx.db.get(userId);
  if (!user || user.gameReady) return;
  const history = await loadHistory(ctx, userId);

  const rewards: { key: string; xp: number; day: string }[] = [
    ...history.expenses.map((e) => ({ key: `expense:${e._id}`, xp: XpReward.expense, day: e.date })),
    ...history.cycles.map((c) => ({ key: `salary:${c._id}`, xp: XpReward.salary, day: c.receivedOn })),
  ];
  if ((user.savingsGoal ?? 0) > 0) rewards.push({ key: 'goal', xp: XpReward.goal, day: today });
  if (history.budgets.length > 0) rewards.push({ key: 'budgets', xp: XpReward.budgets, day: today });
  for (const r of rewards) await ctx.db.insert('xpEvents', { userId, ...r });

  // Streaks from the days that have logged expenses.
  const days = [...new Set(history.expenses.map((e) => e.date))].filter((d) => d <= today).sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && dayDiff(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  await ctx.db.patch(userId, {
    gameReady: true,
    xp: rewards.reduce((sum, r) => sum + r.xp, 0),
    streak: run,
    bestStreak: best,
    lastActiveDay: days[days.length - 1],
    trophies: user.trophies ?? [],
  });
  await checkTrophies(ctx, userId, today);
}

/** Checks a daily quest against the stored data. Returns why it can't be claimed, or null when it can. */
export async function questBlocker(
  ctx: QueryCtx,
  user: Doc<'users'>,
  quest: QuestId,
  today: string,
): Promise<string | null> {
  if (quest === 'log') {
    return user.lastActiveDay === today ? null : 'Log something today first.';
  }

  const cycle = await ctx.db
    .query('cycles')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .order('desc')
    .first();
  if (!cycle) return 'Add your salary first.';
  const expenses = await ctx.db
    .query('expenses')
    .withIndex('by_cycle', (q) => q.eq('cycleId', cycle._id))
    .collect();

  if (quest === 'ration') {
    const todays = expenses.filter((e) => e.date === today);
    if (todays.length === 0) return "Log today's spending first.";
    const spentToday = todays.reduce((s, e) => s + e.amount, 0);
    const spentBefore = expenses.filter((e) => e.date < today).reduce((s, e) => s + e.amount, 0);
    return spentToday <= rationFor(cycle.amount, cycle.receivedOn, spentBefore, today)
      ? null
      : "You're over today's ration.";
  }

  const budgets = await ctx.db
    .query('budgets')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  if (budgets.length === 0) return 'Set a budget first.';
  const spent = new Map<string, number>();
  for (const e of expenses) spent.set(e.category, (spent.get(e.category) ?? 0) + e.amount);
  return budgets.every((b) => (spent.get(b.category) ?? 0) <= b.limit) ? null : 'A budget is over its limit.';
}
