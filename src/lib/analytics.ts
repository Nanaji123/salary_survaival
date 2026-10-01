import { getCategory, type CategoryId } from '@/constants/categories';
import { daysBetween, formatDateKey, fromDateKey, shiftDateKey, toDateKey, todayKey } from '@/lib/format';
import { expensesFor, summarize, type Budget, type Expense, type SalaryCycle } from '@/lib/store';

/** End of a cycle: the next cycle's start, or one month after it was received. */
export function cycleEnd(cycle: SalaryCycle, next?: SalaryCycle) {
  if (next) return next.receivedOn;
  const d = fromDateKey(cycle.receivedOn);
  d.setMonth(d.getMonth() + 1);
  return toDateKey(d);
}

export function cycleProgress(cycle: SalaryCycle) {
  const end = cycleEnd(cycle);
  const total = Math.max(1, daysBetween(cycle.receivedOn, end));
  const elapsed = Math.min(total, Math.max(0, daysBetween(cycle.receivedOn, todayKey()) + 1));
  const daysLeft = Math.max(1, daysBetween(todayKey(), end));
  return { total, elapsed, daysLeft, end, ratio: elapsed / total };
}

/** Spending per day from the cycle start through today (or the cycle end). */
export function dailySpending(cycle: SalaryCycle, expenses: Expense[]) {
  const { total, elapsed } = cycleProgress(cycle);
  const days = Math.min(total, Math.max(elapsed, 1));
  const totals = new Map<string, number>();
  for (const e of expensesFor(expenses, cycle._id)) {
    totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDateKey(cycle.receivedOn, i);
    return { date, amount: totals.get(date) ?? 0 };
  });
}

export type BudgetStatus = {
  category: CategoryId;
  limit: number;
  spent: number;
  ratio: number;
  state: 'ok' | 'near' | 'over';
};

export function budgetStatuses(budgets: Budget[], cycle: SalaryCycle | null, expenses: Expense[]) {
  const spentBy = new Map<CategoryId, number>();
  if (cycle) {
    for (const e of expensesFor(expenses, cycle._id)) {
      spentBy.set(e.category, (spentBy.get(e.category) ?? 0) + e.amount);
    }
  }
  return budgets
    .map((b): BudgetStatus => {
      const spent = spentBy.get(b.category) ?? 0;
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      return {
        category: b.category,
        limit: b.limit,
        spent,
        ratio,
        state: ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok',
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Past cycles (oldest first) with what was spent and saved, for comparison charts. */
export function cycleHistory(cycles: SalaryCycle[], expenses: Expense[], limit = 6) {
  return cycles
    .slice(0, limit)
    .map((c) => {
      const s = summarize(c, expenses);
      return {
        cycle: c,
        label: fromDateKey(c.receivedOn).toLocaleDateString('en-US', { month: 'short' }),
        spent: s.spent,
        saved: Math.max(0, s.remaining),
      };
    })
    .reverse();
}

export function insights(cycle: SalaryCycle, expenses: Expense[], previous: SalaryCycle | null) {
  const s = summarize(cycle, expenses);
  const { elapsed, total, daysLeft } = cycleProgress(cycle);
  const out: { tone: 'good' | 'warn' | 'info'; text: string }[] = [];
  const avg = s.spent / Math.max(1, elapsed);
  const projected = avg * total;

  if (s.remaining < 0) {
    out.push({ tone: 'warn', text: 'You have spent more than this salary. Pause non-essential spending until payday.' });
  } else if (projected > cycle.amount) {
    out.push({
      tone: 'warn',
      text: `At this pace you'll run out about ${Math.max(0, Math.round(total - cycle.amount / Math.max(avg, 1)))} days before payday.`,
    });
  } else if (s.spent > 0) {
    out.push({ tone: 'good', text: `On track: at this pace you'll finish the cycle with money to spare.` });
  }

  const top = s.categories[0];
  if (top && s.spent > 0) {
    out.push({
      tone: 'info',
      text: `${getCategory(top.id).label} is your biggest category at ${Math.round((top.amount / s.spent) * 100)}% of spending.`,
    });
  }

  if (previous) {
    const prev = summarize(previous, expenses);
    const prevDays = Math.max(1, daysBetween(previous.receivedOn, cycle.receivedOn));
    const prevAvg = prev.spent / prevDays;
    if (prevAvg > 0 && avg > 0) {
      const change = Math.round(((avg - prevAvg) / prevAvg) * 100);
      if (Math.abs(change) >= 5) {
        out.push({
          tone: change > 0 ? 'warn' : 'good',
          text: `Daily spending is ${Math.abs(change)}% ${change > 0 ? 'higher' : 'lower'} than your previous salary cycle.`,
        });
      }
    }
  }

  if (daysLeft <= 5 && s.remaining > 0) {
    out.push({ tone: 'info', text: `Payday is ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}. Nice work making it this far.` });
  }
  return out;
}

export function biggestExpense(cycle: SalaryCycle, expenses: Expense[]) {
  return expensesFor(expenses, cycle._id).reduce<Expense | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max),
    null,
  );
}

/** Groups expenses into day sections, newest first. */
export function groupByDay(items: Expense[]) {
  const groups: { date: string; title: string; total: number; items: Expense[] }[] = [];
  for (const e of items) {
    let group = groups.find((g) => g.date === e.date);
    if (!group) {
      group = { date: e.date, title: formatDateKey(e.date, 'long'), total: 0, items: [] };
      groups.push(group);
    }
    group.items.push(e);
    group.total += e.amount;
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}
