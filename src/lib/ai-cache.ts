import Storage from 'expo-sqlite/kv-store';

import type { SalaryPlan } from '@/lib/ai';

/** The last generated plan, kept on the device so reopening it never calls the API again. */
export type SavedPlan = {
  plan: SalaryPlan;
  /** Salary the plan was built for; compared with the current salary to offer a refresh. */
  salary: number;
  applied: boolean;
  savedAt: number;
};

export type SavedSummary = { text: string; expenseCount: number; savedAt: number };

function read<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {
    // Caching is best effort.
  }
}

export const loadPlan = (deviceId: string) => read<SavedPlan>(`ai-plan/${deviceId}`);
export const savePlan = (deviceId: string, saved: SavedPlan) => write(`ai-plan/${deviceId}`, saved);
export const loadSummary = (cycleId: string) => read<SavedSummary>(`ai-summary/${cycleId}`);
export const saveSummary = (cycleId: string, saved: SavedSummary) => write(`ai-summary/${cycleId}`, saved);
