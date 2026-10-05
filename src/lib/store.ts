import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import { ConvexReactClient, useQueries, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import * as Application from 'expo-application';
import Storage from 'expo-sqlite/kv-store';
import { useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { QuestId } from '@convex/gameRules';

import type { CategoryId, PaymentMethod } from '@/constants/categories';
import { todayKey } from '@/lib/format';
import { identifyPurchaser, resetPurchaser } from '@/lib/subscription';

export type Account = Doc<'users'>;
export type SalaryCycle = Doc<'cycles'>;
export type Expense = Doc<'expenses'>;
export type Budget = Doc<'budgets'>;
export type CycleId = Id<'cycles'>;
export type ExpenseId = Id<'expenses'>;

export const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Session: the only thing kept on the device is which device ID is signed in.

const SESSION_KEY = 'salary-planner/device-id';
let deviceId: string | null = Storage.getItemSync(SESSION_KEY);
const listeners = new Set<() => void>();

function setSession(id: string | null) {
  deviceId = id;
  if (id) Storage.setItemSync(SESSION_KEY, id);
  else Storage.removeItemSync(SESSION_KEY);
  listeners.forEach((l) => l());
}

export function useDeviceId() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deviceId,
    () => deviceId,
  );
}

function requireDeviceId() {
  if (!deviceId) throw new Error('Not signed in');
  return deviceId;
}

export const getDeviceId = requireDeviceId;

async function readDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'ios') {
      // identifierForVendor can be briefly nil right after boot; retry once.
      const id =
        (await Application.getIosIdForVendorAsync()) ??
        (await new Promise((r) => setTimeout(r, 500)).then(() =>
          Application.getIosIdForVendorAsync(),
        ));
      if (id) return id;
    } else if (Platform.OS === 'android') {
      return Application.getAndroidId();
    }
  } catch {
    // Fall through to a generated ID.
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Signs in with the device ID, creating the account on first launch. Resolves whether setup is already done. */
export async function signInWithDevice() {
  const id = deviceId ?? (await readDeviceId());
  // Mutations wait for a connection indefinitely; fail fast so the user can retry.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Sign-in timed out')), 15_000);
  });
  try {
    await Promise.race([convex.mutation(api.users.signIn, { deviceId: id }), timeout]);
  } finally {
    clearTimeout(timer);
  }
  const account = await convex.query(api.users.get, { deviceId: id });
  setSession(id);
  identifyPurchaser(id);
  return account?.onboarded ?? false;
}

/** Signs out of this device. The account and its data stay in the cloud; signing in again restores them. */
export function signOut() {
  setSession(null);
  resetPurchaser();
}

// Queries. Each returns `undefined` while loading.

export function useAccount() {
  const id = useDeviceId();
  return useQuery(api.users.get, id ? { deviceId: id } : 'skip');
}

export function useCycles() {
  const id = useDeviceId();
  return useQuery(api.cycles.list, id ? { deviceId: id } : 'skip');
}

export function useExpenses() {
  const id = useDeviceId();
  return useQuery(api.expenses.list, id ? { deviceId: id } : 'skip');
}

export function useBudgets() {
  const id = useDeviceId();
  return useQuery(api.budgets.list, id ? { deviceId: id } : 'skip');
}

/**
 * XP, streak, trophies and today's claimed quests, stored on the backend. Returns `undefined` while
 * loading and `null` when unavailable. Unlike useQuery it never throws: a failing game backend only
 * hides the game cards instead of taking down Home.
 */
export function useGameProgress(): FunctionReturnType<typeof api.game.get> | undefined {
  const id = useDeviceId();
  const today = todayKey();
  const queries = useMemo(
    (): Parameters<typeof useQueries>[0] =>
      id ? { game: { query: api.game.get, args: { deviceId: id, today } } } : {},
    [id, today],
  );
  const result = useQueries(queries).game;
  if (result instanceof Error) {
    console.warn('Game progress unavailable:', result.message);
    return null;
  }
  return result;
}

// Mutations.

export function updateAccount(patch: {
  name?: string;
  currency?: string;
  onboarded?: boolean;
  payday?: number;
  savingsGoal?: number;
}) {
  return convex.mutation(api.users.update, { deviceId: requireDeviceId(), ...patch, today: todayKey() });
}

type CycleInput = { amount: number; receivedOn: string; note?: string };

export function addCycle(input: CycleInput) {
  return convex.mutation(api.cycles.add, { deviceId: requireDeviceId(), ...input, today: todayKey() });
}

export function updateCycle(id: CycleId, input: CycleInput) {
  return convex.mutation(api.cycles.update, { deviceId: requireDeviceId(), id, ...input });
}

export function saveExpense(expense: {
  id?: ExpenseId;
  cycleId: CycleId;
  title: string;
  amount: number;
  category: CategoryId;
  date: string;
  method?: PaymentMethod;
  note?: string;
}) {
  return convex.mutation(api.expenses.save, { deviceId: requireDeviceId(), ...expense, today: todayKey() });
}

export function deleteExpense(id: ExpenseId) {
  return convex.mutation(api.expenses.remove, { deviceId: requireDeviceId(), id });
}

export function setBudget(category: CategoryId, limit: number) {
  return convex.mutation(api.budgets.set, { deviceId: requireDeviceId(), category, limit, today: todayKey() });
}

/**
 * Today's free plan usage from the backend. Like useGameProgress it never throws, so a backend
 * hiccup can't take a screen down; `null` means unavailable.
 */
export function useUsageQuery(): FunctionReturnType<typeof api.usage.today> | undefined {
  const id = useDeviceId();
  const today = todayKey();
  const queries = useMemo(
    (): Parameters<typeof useQueries>[0] =>
      id ? { usage: { query: api.usage.today, args: { deviceId: id, today } } } : {},
    [id, today],
  );
  const result = useQueries(queries).usage;
  return result instanceof Error ? null : result;
}

/** Tells the backend whether this account has Pro, so free limits don't apply to subscribers. */
export function syncProStatus(pro: boolean) {
  return convex.action(api.usage.syncPro, { deviceId: requireDeviceId(), pro });
}

/** Backfills game progress for accounts created before the game existed. */
export function initGame() {
  return convex.mutation(api.game.init, { deviceId: requireDeviceId(), today: todayKey() });
}

/** Claims a daily quest; the backend checks it is really complete. Resolves to the XP awarded. */
export function claimQuest(quest: QuestId) {
  return convex.mutation(api.game.claimQuest, { deviceId: requireDeviceId(), quest, today: todayKey() });
}

export async function eraseAll() {
  await convex.mutation(api.users.eraseAll, { deviceId: requireDeviceId() });
  setSession(null);
}

// Pure helpers.

/** Cycles arrive newest first from the server; the first one is the live cycle. */
export function currentCycle(cycles: SalaryCycle[] | undefined) {
  return cycles?.[0] ?? null;
}

export function expensesFor(expenses: Expense[], cycleId: CycleId) {
  return expenses
    .filter((e) => e.cycleId === cycleId)
    .sort((a, b) => b.date.localeCompare(a.date) || b._creationTime - a._creationTime);
}

export function summarize(cycle: SalaryCycle, expenses: Expense[]) {
  const items = expensesFor(expenses, cycle._id);
  const spent = items.reduce((sum, e) => sum + e.amount, 0);
  const remaining = cycle.amount - spent;
  const byCategory = new Map<CategoryId, number>();
  for (const e of items) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const categories = [...byCategory.entries()]
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);
  return {
    items,
    spent,
    remaining,
    ratio: cycle.amount > 0 ? spent / cycle.amount : 0,
    categories,
  };
}
