/**
 * Game rules shared by the backend and the app: XP rewards, levels, quests, trophies and date math.
 * Keep this file free of server imports so the app can import it too.
 */

export const XpReward = {
  expense: 10,
  salary: 25,
  goal: 30,
  budgets: 30,
  trophy: 50,
} as const;

/** Logging XP is capped per day so creating and deleting expenses cannot farm XP. */
export const DAILY_EXPENSE_XP_CAP = 10;

export type QuestId = 'log' | 'ration' | 'budgets';

/** Daily quests are claimed once per local day. */
export const QuestXp: Record<QuestId, number> = { log: 15, ration: 20, budgets: 20 };

export const LevelTitles = [
  'Rookie',
  'Penny Pincher',
  'Budget Scout',
  'Money Ninja',
  'Cash Commander',
  'Wealth Wizard',
  'Salary Legend',
] as const;

/** Total XP needed to reach `level` (1-based): 0, 100, 300, 600, 1000… */
export function xpForLevel(level: number) {
  return 50 * level * (level - 1);
}

export function levelFor(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const needed = xpForLevel(level + 1) - floor;
  return {
    level,
    title: LevelTitles[Math.min(level - 1, LevelTitles.length - 1)],
    xp,
    into: xp - floor,
    needed,
    progress: (xp - floor) / needed,
  };
}

export type TrophyId = 'first' | 'streak3' | 'saver' | 'planner' | 'streak7' | 'survivor' | 'tracker' | 'legend';

export const Trophies: { id: TrophyId; title: string; hint: string }[] = [
  { id: 'first', title: 'First log', hint: 'Log 1 expense' },
  { id: 'streak3', title: 'On fire', hint: '3-day streak' },
  { id: 'saver', title: 'Saver', hint: 'Set a savings goal' },
  { id: 'planner', title: 'Planner', hint: 'Set a budget' },
  { id: 'streak7', title: 'Unstoppable', hint: '7-day streak' },
  { id: 'survivor', title: 'Survivor', hint: 'Reach payday with money left' },
  { id: 'tracker', title: 'Tracker', hint: 'Log 50 expenses' },
  { id: 'legend', title: 'Legend', hint: 'Reach level 5' },
];

// Dates are local YYYY-MM-DD keys. The math runs in UTC so daylight saving never shifts a day.

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtc(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function shiftDay(key: string, days: number) {
  return fromUtc(toUtc(key) + days * 86_400_000);
}

export function dayDiff(fromKey: string, toKey: string) {
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86_400_000);
}

/** One month after a salary date; matches the app's cycle end for the live cycle. */
export function monthAfter(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return fromUtc(Date.UTC(y, m, d));
}

/** The streak shown on `today`: it survives until the end of the day after the last activity. */
export function liveStreak(streak: number, lastActiveDay: string | undefined, today: string) {
  if (!lastActiveDay) return 0;
  return dayDiff(lastActiveDay, today) <= 1 ? streak : 0;
}

/** Today's ration: the salary left before today, spread over the days until payday. */
export function rationFor(amount: number, receivedOn: string, spentBefore: number, today: string) {
  const daysLeft = Math.max(1, dayDiff(today, monthAfter(receivedOn)));
  return Math.max(0, amount - spentBefore) / daysLeft;
}
