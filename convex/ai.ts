import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation } from './_generated/server';
import { findUser } from './lib';
import type { Feature } from './plans';
import { feature, refundAllowance, spendAllowance } from './usage';

/**
 * AI helpers. The OpenAI key lives only in the Convex environment (OPENAI_API_KEY), never in the
 * app bundle. Set it with: npx convex env set OPENAI_API_KEY <key>
 */

const CHAT_MODEL = 'gpt-4o-mini';
// Half the price of whisper-1; whisper-1 remains as a fallback.
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';
const TRANSCRIBE_FALLBACK = 'whisper-1';
/** Each AI request counts once; this keeps a runaway client from spending the OpenAI budget. */
const DAILY_LIMIT = 40;

const CATEGORIES = [
  'rent',
  'food',
  'groceries',
  'transport',
  'bills',
  'shopping',
  'health',
  'entertainment',
  'education',
  'travel',
  'subscriptions',
  'family',
  'personal',
  'gifts',
  'savings',
  'other',
] as const;

const METHODS = ['cash', 'card', 'bank', 'wallet'] as const;

/**
 * Guards every action: only existing accounts can spend AI credits, free users within their daily
 * allowance for the feature, and everyone up to a hard daily cap.
 */
export const consume = internalMutation({
  args: { deviceId: v.string(), feature: v.optional(feature) },
  handler: async (ctx, { deviceId, feature }) => {
    const user = await findUser(ctx, deviceId);
    if (!user) return null;
    if (feature) await spendAllowance(ctx, user, feature);
    const day = new Date().toISOString().slice(0, 10);
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user_day', (q) => q.eq('userId', user._id).eq('day', day))
      .unique();
    if ((usage?.count ?? 0) >= DAILY_LIMIT) {
      throw new ConvexError("You've reached today's AI limit. It resets tomorrow.");
    }
    if (usage) await ctx.db.patch(usage._id, { count: usage.count + 1 });
    else await ctx.db.insert('aiUsage', { userId: user._id, day, count: 1 });
    return { name: user.name, currency: user.currency };
  },
});

// The Convex runtime provides process.env; declare it since this project has no Node typings.
declare const process: { env: Record<string, string | undefined> };

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConvexError('AI is not configured yet. Add OPENAI_API_KEY to the Convex environment.');
  return key;
}

async function chatJson(system: string, user: string, schemaName: string, schema: object, maxTokens: number) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: schemaName, strict: true, schema },
      },
    }),
  });
  if (!res.ok) throw new ConvexError(`The AI service returned an error (${res.status}). Try again.`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new ConvexError('The AI returned an empty answer. Try again.');
  return JSON.parse(content);
}

async function chatText(system: string, user: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.5,
      max_tokens: 260,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new ConvexError(`The AI service returned an error (${res.status}). Try again.`);
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new ConvexError('The AI returned an empty answer. Try again.');
  return content.trim();
}

/** Gives back a free use when the AI request it paid for failed. */
export const refund = internalMutation({
  args: { deviceId: v.string(), feature },
  handler: async (ctx, { deviceId, feature }) => {
    const user = await findUser(ctx, deviceId);
    if (user) await refundAllowance(ctx, user, feature);
  },
});

type Ctx = { runMutation: (...a: any[]) => Promise<any> };

async function requireAccount(ctx: Ctx, deviceId: string, feature?: Feature) {
  // Fail before counting the request, so a missing key doesn't use up the daily limit.
  apiKey();
  const user = await ctx.runMutation(internal.ai.consume, { deviceId, feature });
  if (!user) throw new ConvexError('Account not found');
  return user as { name: string; currency: string };
}

/** Runs `work`, refunding the free use if it fails so a failed request doesn't cost the user. */
async function refundOnFailure<T>(ctx: Ctx, deviceId: string, feature: Feature, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    await ctx.runMutation(internal.ai.refund, { deviceId, feature });
    throw error;
  }
}

/** Speech to text for the hold-to-talk button. */
export const transcribe = action({
  args: { deviceId: v.string(), audio: v.string(), mimeType: v.string() },
  handler: async (ctx, { deviceId, audio, mimeType }) => {
    await requireAccount(ctx, deviceId);
    if (audio.length > 8_000_000) throw new ConvexError('That recording is too long. Keep it under a minute.');

    const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
    const ext = mimeType.includes('3gp') ? '3gp' : mimeType.includes('wav') ? 'wav' : 'm4a';
    const send = (model: string) => {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: mimeType }), `voice.${ext}`);
      form.append('model', model);
      form.append(
        'prompt',
        'Personal finance voice note: expenses, salary, savings goals and budgets with amounts and categories.',
      );
      return fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey()}` },
        body: form,
      });
    };
    let res = await send(TRANSCRIBE_MODEL);
    if (!res.ok) res = await send(TRANSCRIBE_FALLBACK);
    if (!res.ok) throw new ConvexError(`Could not understand the recording (${res.status}). Try again.`);
    const data = await res.json();
    return String(data?.text ?? '').trim();
  },
});

const interpretSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'expenses', 'salary', 'savingsGoal', 'budgets'],
  properties: {
    reply: { type: 'string', description: 'One short friendly sentence confirming what was understood.' },
    expenses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'amount', 'category', 'date', 'method'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string', enum: [...CATEGORIES] },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          method: { type: ['string', 'null'], enum: [...METHODS, null] },
        },
      },
    },
    salary: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['amount', 'date', 'note'],
      properties: {
        amount: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        note: { type: ['string', 'null'] },
      },
    },
    savingsGoal: { type: ['number', 'null'] },
    budgets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'limit'],
        properties: {
          category: { type: 'string', enum: [...CATEGORIES] },
          limit: { type: 'number' },
        },
      },
    },
  },
} as const;

/** Turns a sentence ("lunch 250 and a cab 180") into structured things to log. */
export const interpret = action({
  args: { deviceId: v.string(), text: v.string(), today: v.string() },
  handler: async (ctx, { deviceId, text, today }) => {
    const input = text.trim().slice(0, 1500);
    if (!input) throw new ConvexError('Say or type something first.');
    const user = await requireAccount(ctx, deviceId, 'assistant');

    const system = [
      'You turn a short message from a salary-tracking app user into structured data.',
      `Today is ${today}. The user's currency is ${user.currency}. Resolve words like "yesterday" or "last Friday" to YYYY-MM-DD dates (never in the future).`,
      'Rules:',
      '- expenses: every purchase or payment the user says they made. Short title (2-4 words, capitalised). Amount is a positive number in the user currency. Pick the closest category.',
      '- salary: only if the user says they received/got paid a salary or income. Otherwise null.',
      '- savingsGoal: only if the user asks to set or change how much they want to save each salary. Otherwise null.',
      '- budgets: only if the user asks to set a spending limit for a category. Otherwise an empty array.',
      '- If the message contains none of these, return empty arrays/nulls and use reply to say what you can help with.',
      '- Never invent amounts. Skip anything without a clear amount.',
      '- reply: one short, friendly sentence, no markdown.',
    ].join('\n');

    const result = await refundOnFailure(ctx, deviceId, 'assistant', () =>
      chatJson(system, input, 'interpretation', interpretSchema, 700),
    );

    // Defensive clean-up: the app persists these values, so keep them sane.
    const clean = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e12 ? n : null);
    const date = (d: unknown) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today);
    return {
      reply: String(result.reply ?? ''),
      expenses: (result.expenses ?? [])
        .filter((e: any) => clean(e.amount) !== null && String(e.title ?? '').trim())
        .slice(0, 20)
        .map((e: any) => ({
          title: String(e.title).trim().slice(0, 80),
          amount: Math.round(e.amount * 100) / 100,
          category: (CATEGORIES as readonly string[]).includes(e.category) ? (e.category as string) : 'other',
          date: date(e.date),
          method: (METHODS as readonly string[]).includes(e.method) ? (e.method as string) : null,
        })),
      salary:
        result.salary && clean(result.salary.amount) !== null
          ? {
              amount: Math.round(result.salary.amount * 100) / 100,
              date: date(result.salary.date),
              note: result.salary.note ? String(result.salary.note).slice(0, 120) : null,
            }
          : null,
      savingsGoal: clean(result.savingsGoal),
      budgets: (result.budgets ?? [])
        .filter((b: any) => clean(b.limit) !== null && (CATEGORIES as readonly string[]).includes(b.category))
        .slice(0, 16)
        .map((b: any) => ({ category: b.category as string, limit: Math.round(b.limit) })),
    };
  },
});

/** Plain-language summary of the current cycle. `facts` is a compact JSON blob built by the app. */
export const summarize = action({
  // `today` is accepted from the app but unused: free allowances don't reset daily.
  args: { deviceId: v.string(), facts: v.string(), today: v.optional(v.string()) },
  handler: async (ctx, { deviceId, facts }) => {
    const user = await requireAccount(ctx, deviceId, 'summary');
    const system = [
      `You are a warm, concise money coach inside a salary-tracking app. The user's name is ${user.name} and their currency is ${user.currency}.`,
      'Write a summary of their spending this salary cycle from the facts provided.',
      'Format: 3 to 4 short bullet lines, each starting with "• ". Cover: how they are doing overall, where most money went, one thing to watch, and one specific tip.',
      'Use the currency symbol with numbers. No markdown, no headings, no greetings. Under 90 words.',
    ].join('\n');
    return refundOnFailure(ctx, deviceId, 'summary', () => chatText(system, facts.slice(0, 6000)));
  },
});

const planSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'savingsGoal', 'budgets'],
  properties: {
    summary: { type: 'string', description: 'Two short sentences explaining the plan.' },
    savingsGoal: { type: 'number' },
    budgets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'limit', 'reason'],
        properties: {
          category: { type: 'string', enum: [...CATEGORIES] },
          limit: { type: 'number' },
          reason: { type: 'string', description: 'Max 8 words.' },
        },
      },
    },
  },
} as const;

/** Suggests a savings goal and per-category budgets for a salary. */
export const plan = action({
  // `today` is accepted from the app but unused: free allowances don't reset daily.
  args: { deviceId: v.string(), facts: v.string(), salary: v.number(), today: v.optional(v.string()) },
  handler: async (ctx, { deviceId, facts, salary }) => {
    if (!Number.isFinite(salary) || salary <= 0) throw new ConvexError('Add your salary first.');
    const user = await requireAccount(ctx, deviceId, 'plan');
    const system = [
      `You are a practical budgeting coach. The user's currency is ${user.currency}.`,
      'Create a plan for one salary cycle. Use the 50/30/20 idea as a starting point but adapt to the user history in the facts.',
      'Return 5 to 8 budgets for the categories that matter most to them (always include rent or bills if they appear in the history, and groceries/food/transport when relevant).',
      `The savingsGoal plus the sum of all budget limits must be less than or equal to the salary of ${salary}.`,
      'Round limits to sensible numbers. The summary is two short friendly sentences, no markdown.',
    ].join('\n');
    const result = await refundOnFailure(ctx, deviceId, 'plan', () =>
      chatJson(system, `Salary: ${salary}\n${facts.slice(0, 6000)}`, 'salary_plan', planSchema, 700),
    );

    let goal = Math.max(0, Math.round(Number(result.savingsGoal) || 0));
    let budgets = (result.budgets ?? [])
      .filter((b: any) => (CATEGORIES as readonly string[]).includes(b.category) && Number(b.limit) > 0)
      .slice(0, 10)
      .map((b: any) => ({
        category: b.category as string,
        limit: Math.round(Number(b.limit)),
        reason: String(b.reason ?? '').slice(0, 60),
      }));

    // Scale down if the model overshoots the salary.
    const total = goal + budgets.reduce((s: number, b: { limit: number }) => s + b.limit, 0);
    if (total > salary) {
      const k = salary / total;
      goal = Math.round(goal * k);
      budgets = budgets.map((b: { category: string; limit: number; reason: string }) => ({
        ...b,
        limit: Math.max(1, Math.round(b.limit * k)),
      }));
    }
    return { summary: String(result.summary ?? ''), savingsGoal: goal, budgets };
  },
});
