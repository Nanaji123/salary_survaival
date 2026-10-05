import { api } from '@convex/_generated/api';
import {
  levelFor,
  QuestXp,
  rationFor,
  Trophies,
  XpReward,
  type QuestId,
  type TrophyId,
} from '@convex/gameRules';
import type { FunctionReturnType } from 'convex/server';

import type { EmojiName } from '@/constants/emoji';
import { cycleProgress } from '@/lib/analytics';
import { todayKey } from '@/lib/format';
import { expensesFor, type Account, type Budget, type Expense, type SalaryCycle } from '@/lib/store';

/**
 * Game layer for the home screen. XP, levels, streaks, trophies and claimed quests live on the
 * backend (convex/game.ts); this file adds the artwork and works out which quests can be claimed.
 */

export type GameProgress = NonNullable<FunctionReturnType<typeof api.game.get>>;

const LEVEL_EMOJI: EmojiName[] = ['seedling', 'coin', 'scale', 'swords', 'rocket', 'crystalBall', 'crown'];

export const TROPHY_EMOJI: Record<TrophyId, EmojiName> = {
  first: 'sparkles',
  streak3: 'fire',
  saver: 'moneyBag',
  planner: 'ledger',
  streak7: 'zap',
  survivor: 'trophy',
  tracker: 'star',
  legend: 'crown',
};

export function levelInfo(xp: number) {
  const level = levelFor(xp);
  return { ...level, emoji: LEVEL_EMOJI[Math.min(level.level - 1, LEVEL_EMOJI.length - 1)] };
}

/** Today's spending ration: what is left before today, spread over the days until payday. */
export function todayRation(cycle: SalaryCycle, expenses: Expense[]) {
  const today = todayKey();
  let spentToday = 0;
  let spentBefore = 0;
  let loggedToday = false;
  for (const e of expensesFor(expenses, cycle._id)) {
    if (e.date === today) {
      spentToday += e.amount;
      loggedToday = true;
    } else if (e.date < today) spentBefore += e.amount;
  }
  const ration = rationFor(cycle.amount, cycle.receivedOn, spentBefore, today);
  return { ration, spentToday, left: ration - spentToday, under: spentToday <= ration, loggedToday };
}

export type Health = { hp: number; state: 'strong' | 'hurt' | 'critical' | 'ko'; label: string };

/** Remaining salary as a health bar, judged against how far into the cycle we are. */
export function survivalHealth(cycle: SalaryCycle, spent: number): Health {
  const remaining = cycle.amount - spent;
  if (remaining <= 0) return { hp: 0, state: 'ko', label: 'Knocked out' };
  const hp = cycle.amount > 0 ? remaining / cycle.amount : 0;
  const { ratio } = cycleProgress(cycle);
  const expected = 1 - ratio;
  if (hp >= expected - 0.05) return { hp, state: 'strong', label: 'Going strong' };
  if (hp >= expected * 0.6) return { hp, state: 'hurt', label: 'Hanging on' };
  return { hp, state: 'critical', label: 'Critical' };
}

export type Quest = {
  id: string;
  /** Set for daily quests that are claimed on the backend; one-time quests pay out automatically. */
  claim?: QuestId;
  title: string;
  detail: string;
  xp: number;
  /** todo: not complete yet · ready: complete, tap to claim · claimed: XP collected. */
  status: 'todo' | 'ready' | 'claimed';
  emoji: EmojiName;
  action: 'expense' | 'goal' | 'plan' | 'budgets';
};

export type Trophy = { id: TrophyId; title: string; hint: string; emoji: EmojiName; unlocked: boolean };

export function gameState({
  progress,
  account,
  cycle,
  expenses,
  budgets,
  over,
  formatMoney,
}: {
  progress: GameProgress;
  account: Account | null | undefined;
  cycle: SalaryCycle;
  expenses: Expense[];
  budgets: Budget[];
  /** Number of budgets that are over their limit. */
  over: number;
  formatMoney: (n: number) => string;
}) {
  const ration = todayRation(cycle, expenses);
  const claimed = new Set(progress.claimed);
  const daily = (id: QuestId, complete: boolean): Quest['status'] =>
    claimed.has(id) ? 'claimed' : complete ? 'ready' : 'todo';

  const quests: Quest[] = [
    {
      id: 'log',
      claim: 'log',
      title: "Log today's spending",
      detail: progress.loggedToday
        ? `Streak is safe: ${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}`
        : progress.streak > 0
          ? `Keep your ${progress.streak}-day streak alive`
          : 'Start a streak today',
      xp: QuestXp.log,
      status: daily('log', progress.loggedToday),
      emoji: 'fire',
      action: 'expense',
    },
    {
      id: 'ration',
      claim: 'ration',
      title: `Stay under ${formatMoney(Math.floor(ration.ration))} today`,
      detail: !ration.loggedToday
        ? "Log today's spending to qualify"
        : ration.under
          ? `${formatMoney(Math.floor(ration.left))} of today's ration left`
          : `${formatMoney(Math.ceil(-ration.left))} over today's ration`,
      xp: QuestXp.ration,
      status: daily('ration', ration.loggedToday && ration.under),
      emoji: 'coin',
      action: 'expense',
    },
    !account?.savingsGoal
      ? {
          id: 'goal',
          title: 'Set a savings goal',
          detail: 'Decide what to keep from every salary',
          xp: XpReward.goal,
          status: 'todo',
          emoji: 'moneyBag',
          action: 'goal',
        }
      : budgets.length === 0
        ? {
            id: 'plan',
            title: 'Plan budgets with AI',
            detail: 'One tap splits your salary into limits',
            xp: XpReward.budgets,
            status: 'todo',
            emoji: 'crystalBall',
            action: 'plan',
          }
        : {
            id: 'budgets',
            claim: 'budgets',
            title: 'Keep every budget in check',
            detail: over ? `${over} ${over === 1 ? 'budget is' : 'budgets are'} over the limit` : 'All budgets within limits',
            xp: QuestXp.budgets,
            status: daily('budgets', over === 0),
            emoji: 'ledger',
            action: 'budgets',
          },
  ];

  const unlocked = new Set(progress.trophies.map((t) => t.id));
  const trophies: Trophy[] = Trophies.map((t) => ({ ...t, emoji: TROPHY_EMOJI[t.id], unlocked: unlocked.has(t.id) }));

  return { streak: progress.streak, ration, level: levelInfo(progress.xp), xpToday: progress.xpToday, quests, trophies };
}
