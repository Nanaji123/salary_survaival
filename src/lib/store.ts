import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import { ConvexReactClient, useQuery } from 'convex/react';
import * as Application from 'expo-application';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { CategoryId, PaymentMethod } from '@/constants/categories';
import { identifyPurchaser } from '@/lib/subscription';

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

/** Signs in with the device ID, creating the account on first launch. */
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
  setSession(id);
  identifyPurchaser(id);
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

// Mutations.

export function updateAccount(patch: {
  name?: string;
  currency?: string;
  onboarded?: boolean;
  payday?: number;
  savingsGoal?: number;
}) {
  return convex.mutation(api.users.update, { deviceId: requireDeviceId(), ...patch });
}

type CycleInput = { amount: number; receivedOn: string; note?: string };

export function addCycle(input: CycleInput) {
  return convex.mutation(api.cycles.add, { deviceId: requireDeviceId(), ...input });
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
  return convex.mutation(api.expenses.save, { deviceId: requireDeviceId(), ...expense });
}

export function deleteExpense(id: ExpenseId) {
  return convex.mutation(api.expenses.remove, { deviceId: requireDeviceId(), id });
}

export function setBudget(category: CategoryId, limit: number) {
  return convex.mutation(api.budgets.set, { deviceId: requireDeviceId(), category, limit });
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
