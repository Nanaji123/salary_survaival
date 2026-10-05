import { api } from '@convex/_generated/api';
import { router } from 'expo-router';

import type { CategoryId, PaymentMethod } from '@/constants/categories';
import { getCategory } from '@/constants/categories';
import { cycleProgress } from '@/lib/analytics';
import { AiConsentDeclined, requireAiConsent } from '@/lib/ai-consent';
import { todayKey } from '@/lib/format';
import { errorMessage, isLimitError } from '@/lib/limits';
import { quickParse } from '@/lib/quick-parse';
import {
  addCycle,
  convex,
  getDeviceId,
  saveExpense,
  setBudget,
  summarize,
  updateAccount,
  type Account,
  type Budget,
  type CycleId,
  type Expense,
  type SalaryCycle,
} from '@/lib/store';

const requireDevice = getDeviceId;

/**
 * Turns a Convex error into a sentence that is safe to show to the user. When a free plan
 * allowance is used up it also opens the plans.
 */
export function aiErrorMessage(error: unknown) {
  if (error instanceof AiConsentDeclined) return 'AI is off, so nothing was sent. Try again any time to turn it on.';
  if (isLimitError(error)) router.push('/paywall');
  return errorMessage(error, 'Could not reach the assistant. Check your connection and try again.');
}

export type Interpretation = {
  reply: string;
  expenses: { title: string; amount: number; category: CategoryId; date: string; method: PaymentMethod | null }[];
  salary: { amount: number; date: string; note: string | null } | null;
  savingsGoal: number | null;
  budgets: { category: CategoryId; limit: number }[];
};

export type SalaryPlan = {
  summary: string;
  savingsGoal: number;
  budgets: { category: CategoryId; limit: number; reason: string }[];
};

export async function transcribeAudio(audio: string, mimeType: string) {
  await requireAiConsent();
  return convex.action(api.ai.transcribe, { deviceId: requireDevice(), audio, mimeType });
}

export async function interpretText(text: string) {
  // Simple entries like "coffee 120" are understood on the device, which saves an API call.
  const quick = quickParse(text);
  if (quick) return quick;
  await requireAiConsent();
  return (await convex.action(api.ai.interpret, {
    deviceId: requireDevice(),
    text,
    today: todayKey(),
  })) as Interpretation;
}

export async function summarizeCycle(facts: string) {
  await requireAiConsent();
  return convex.action(api.ai.summarize, { deviceId: requireDevice(), facts, today: todayKey() });
}

export async function planSalary(facts: string, salary: number) {
  await requireAiConsent();
  return (await convex.action(api.ai.plan, { deviceId: requireDevice(), facts, salary, today: todayKey() })) as SalaryPlan;
}

/** Compact description of the current cycle that is sent to the model. */
export function cycleFacts(
  account: Account | null | undefined,
  cycle: SalaryCycle,
  expenses: Expense[],
  budgets: Budget[] = [],
) {
  const s = summarize(cycle, expenses);
  const p = cycleProgress(cycle);
  return JSON.stringify({
    salary: cycle.amount,
    spent: s.spent,
    remaining: s.remaining,
    daysElapsed: p.elapsed,
    daysLeft: p.daysLeft,
    savingsGoal: account?.savingsGoal ?? null,
    byCategory: s.categories.map((c) => ({ category: getCategory(c.id).label, amount: c.amount })),
    biggest: s.items
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((e) => ({ title: e.title, amount: e.amount, category: e.category })),
    transactions: s.items.length,
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit })),
  });
}

/** History across cycles, used when planning the next salary. */
export function historyFacts(cycles: SalaryCycle[], expenses: Expense[]) {
  return JSON.stringify(
    cycles.slice(0, 4).map((c) => {
      const s = summarize(c, expenses);
      return {
        salary: c.amount,
        spent: s.spent,
        byCategory: s.categories.map((x) => ({ category: x.id, amount: x.amount })),
      };
    }),
  );
}

/** Writes everything the user confirmed. Expenses need a live salary cycle. */
export async function applyInterpretation(
  result: Interpretation,
  cycleId: CycleId | null,
): Promise<{ added: number; needsSalary: boolean }> {
  let activeCycle = cycleId;
  if (result.salary) {
    activeCycle = await addCycle({
      amount: result.salary.amount,
      receivedOn: result.salary.date,
      note: result.salary.note ?? undefined,
    });
  }
  let added = 0;
  if (activeCycle) {
    for (const e of result.expenses) {
      await saveExpense({
        cycleId: activeCycle,
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: e.date,
        method: e.method ?? undefined,
      });
      added++;
    }
  }
  if (result.savingsGoal) await updateAccount({ savingsGoal: result.savingsGoal });
  for (const b of result.budgets) await setBudget(b.category, b.limit);
  return { added, needsSalary: !activeCycle && result.expenses.length > 0 };
}

export async function applyPlan(plan: SalaryPlan) {
  await updateAccount({ savingsGoal: plan.savingsGoal });
  for (const b of plan.budgets) await setBudget(b.category, b.limit);
}
