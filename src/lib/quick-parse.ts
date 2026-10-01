import type { CategoryId } from '@/constants/categories';
import { todayKey } from '@/lib/format';
import type { Interpretation } from '@/lib/ai';

// Words that map confidently to a category. Anything not listed falls through to the AI.
const KEYWORDS: [CategoryId, string[]][] = [
  ['food', ['coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks', 'pizza', 'burger', 'biryani', 'restaurant', 'cafe', 'swiggy', 'zomato', 'juice', 'ice cream']],
  ['groceries', ['grocery', 'groceries', 'vegetables', 'veggies', 'fruits', 'milk', 'supermarket', 'bigbasket', 'blinkit', 'zepto']],
  ['transport', ['cab', 'taxi', 'uber', 'ola', 'rapido', 'auto', 'bus', 'metro', 'train', 'fuel', 'petrol', 'diesel', 'parking', 'toll']],
  ['rent', ['rent', 'maintenance']],
  ['bills', ['electricity', 'water bill', 'gas bill', 'wifi', 'internet', 'recharge', 'phone bill', 'bill']],
  ['subscriptions', ['netflix', 'spotify', 'prime', 'hotstar', 'youtube premium', 'subscription']],
  ['health', ['medicine', 'medicines', 'doctor', 'pharmacy', 'hospital', 'gym']],
  ['entertainment', ['movie', 'movies', 'cinema', 'game', 'games', 'concert']],
  ['shopping', ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart']],
];

function categoryFor(title: string): CategoryId | null {
  const t = title.toLowerCase();
  for (const [id, words] of KEYWORDS) {
    if (words.some((w) => new RegExp(`\b${w}\b`).test(t))) return id;
  }
  return null;
}

const AMOUNT = '(?:rs\.?|inr|₹|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:rs\.?|rupees|bucks)?';
const TITLE = "([a-z][a-z &'-]{1,30})";
const PATTERNS = [
  new RegExp(`^(?:spent\s+|paid\s+)?${TITLE}\s+${AMOUNT}$`, 'i'), // "coffee 120"
  new RegExp(`^(?:spent\s+|paid\s+)?${AMOUNT}\s+(?:on|for)\s+${TITLE}$`, 'i'), // "250 on lunch"
];

/**
 * Handles the simplest typed entries ("coffee 120", "spent 250 on lunch") without an AI call.
 * Returns null when the text is not that simple or the category is not obvious.
 */
export function quickParse(text: string): Interpretation | null {
  const input = text.trim().replace(/\s+/g, ' ');
  if (!input || input.length > 60) return null;

  const first = PATTERNS[0].exec(input);
  const second = PATTERNS[1].exec(input);
  const title = first ? first[1] : second ? second[2] : null;
  const amountText = first ? first[2] : second ? second[1] : null;
  if (!title || !amountText) return null;

  const amount = Number.parseFloat(amountText.replace(/,/g, ''));
  const category = categoryFor(title);
  if (!Number.isFinite(amount) || amount <= 0 || !category) return null;

  const clean = title.trim().replace(/^./, (c) => c.toUpperCase());
  return {
    reply: `Got it: ${clean}.`,
    expenses: [{ title: clean, amount, category, date: todayKey(), method: null }],
    salary: null,
    savingsGoal: null,
    budgets: [],
  };
}
