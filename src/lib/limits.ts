import type { api } from '@convex/_generated/api';
import { LIMIT_CODE, type Feature, type LimitError } from '@convex/plans';
import { ConvexError } from 'convex/values';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { currentlyPro } from '@/lib/subscription';

/**
 * One-time free plan allowances on the device. The backend counts and enforces them (convex/usage.ts); this
 * keeps the latest numbers so any screen can show what's left and open the paywall before a request
 * that would be refused.
 */

export type Usage = NonNullable<FunctionReturnType<typeof api.usage.today>>;

let snapshot: Usage | null = null;
const listeners = new Set<() => void>();

/** Called by PlanSync whenever the backend usage changes. */
export function setUsage(next: Usage | null) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function useUsage() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );
}

/** Free uses left; Infinity for Pro, or while the numbers are still loading. */
export function freeLeft(feature: Feature, usage: Usage | null = snapshot) {
  if (currentlyPro() || !usage || usage.pro) return Infinity;
  return Math.max(0, usage.limits[feature] - usage.used[feature]);
}

/** Opens the add expense screen, or the plans when the free adds are used up. */
export function openAddExpense(params?: { title: string; category: string }) {
  if (freeLeft('expense') <= 0) {
    router.push('/paywall');
    return;
  }
  router.push(params ? { pathname: '/expense', params } : '/expense');
}

export function isLimitError(error: unknown): error is ConvexError<LimitError> {
  return error instanceof ConvexError && (error.data as LimitError | undefined)?.code === LIMIT_CODE;
}

/** The user-facing message of a backend error, which may be a string or a structured error. */
export function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ConvexError)) return fallback;
  const data = error.data as unknown;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'message' in data) return String((data as { message: unknown }).message);
  return fallback;
}
