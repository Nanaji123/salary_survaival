/**
 * Free plan allowances, shared by the backend and the app. Each is a one-time allowance: used
 * counts never reset, and Pro is unlimited. Keep this file free of server imports so the app can
 * import it too.
 */

export type Feature = 'expense' | 'assistant' | 'summary' | 'plan';

export const FREE_LIMITS: Record<Feature, number> = {
  /** Expenses added by hand or by voice, together. */
  expense: 3,
  /** Messages understood by the AI assistant (voice or typed). */
  assistant: 3,
  summary: 1,
  plan: 1,
};

const LABELS: Record<Feature, string> = {
  expense: 'expenses',
  assistant: 'AI assistant messages',
  summary: 'AI summary',
  plan: 'AI salary plan',
};

/** `code` of the ConvexError thrown when a free allowance is used up. */
export const LIMIT_CODE = 'FREE_LIMIT';

export type LimitError = { code: typeof LIMIT_CODE; feature: Feature; message: string };

export function limitMessage(feature: Feature) {
  const n = FREE_LIMITS[feature];
  return `You’ve used your free ${n === 1 ? '' : `${n} `}${LABELS[feature]}. Upgrade to Pro for unlimited.`;
}
