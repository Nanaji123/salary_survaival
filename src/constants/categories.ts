import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import type { EmojiName } from '@/constants/emoji';

export type CategoryId =
  | 'rent'
  | 'food'
  | 'groceries'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'education'
  | 'travel'
  | 'subscriptions'
  | 'family'
  | 'personal'
  | 'gifts'
  | 'savings'
  | 'other';

export type Category = {
  id: CategoryId;
  label: string;
  /** Saturated tone for glyphs, chart bars and dots. */
  color: string;
  /** Muted pastel for icon tile backgrounds (light mode). */
  tint: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
  /** 3D artwork shown on category tiles. */
  emoji: EmojiName;
};

export const Categories: Category[] = [
  { id: 'rent', label: 'Rent & Home', color: '#B45309', tint: '#FBEBD7', icon: { ios: 'house.fill', android: 'home' }, emoji: 'house' },
  { id: 'food', label: 'Food & Dining', color: '#EA580C', tint: '#FDE7D8', icon: { ios: 'fork.knife', android: 'restaurant' }, emoji: 'hamburger' },
  { id: 'groceries', label: 'Groceries', color: '#16A34A', tint: '#DCF5E3', icon: { ios: 'cart.fill', android: 'shopping_cart' }, emoji: 'cart' },
  { id: 'transport', label: 'Transport', color: '#CA8A04', tint: '#FAF0CF', icon: { ios: 'car.fill', android: 'directions_car' }, emoji: 'taxi' },
  { id: 'bills', label: 'Bills & Utilities', color: '#E8A400', tint: '#FCF4CF', icon: { ios: 'bolt.fill', android: 'bolt' }, emoji: 'zap' },
  { id: 'shopping', label: 'Shopping', color: '#DB2777', tint: '#FCE3EF', icon: { ios: 'bag.fill', android: 'shopping_bag' }, emoji: 'handbag' },
  { id: 'health', label: 'Health', color: '#DC2626', tint: '#FCE2E2', icon: { ios: 'heart.text.square.fill', android: 'medical_services' }, emoji: 'pill' },
  { id: 'entertainment', label: 'Entertainment', color: '#9333EA', tint: '#F1E4FC', icon: { ios: 'popcorn.fill', android: 'movie' }, emoji: 'popcorn' },
  { id: 'education', label: 'Education', color: '#4D7C0F', tint: '#E6F0D5', icon: { ios: 'graduationcap.fill', android: 'school' }, emoji: 'graduationCap' },
  { id: 'travel', label: 'Travel', color: '#C2410C', tint: '#FBE4D6', icon: { ios: 'airplane', android: 'flight' }, emoji: 'compass' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#C026D3', tint: '#FAE3FC', icon: { ios: 'tv.fill', android: 'subscriptions' }, emoji: 'headphone' },
  { id: 'family', label: 'Family', color: '#E11D48', tint: '#FDE2E8', icon: { ios: 'figure.2.and.child.holdinghands', android: 'family_restroom' }, emoji: 'twoHearts' },
  { id: 'personal', label: 'Personal Care', color: '#BE185D', tint: '#F9E0EB', icon: { ios: 'scissors', android: 'content_cut' }, emoji: 'lotion' },
  { id: 'gifts', label: 'Gifts', color: '#F43F5E', tint: '#FDE4E8', icon: { ios: 'gift.fill', android: 'redeem' }, emoji: 'gift' },
  { id: 'savings', label: 'Savings', color: '#22A355', tint: '#E1F4E5', icon: { ios: 'banknote.fill', android: 'savings' }, emoji: 'moneyBag' },
  { id: 'other', label: 'Other', color: '#78716C', tint: '#EEECEA', icon: { ios: 'square.grid.2x2.fill', android: 'category' }, emoji: 'package' },
];

const byId = new Map(Categories.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  return byId.get(id) ?? Categories[Categories.length - 1];
}

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'wallet';

export const PaymentMethods: {
  id: PaymentMethod;
  label: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
}[] = [
  { id: 'card', label: 'Card', icon: { ios: 'creditcard.fill', android: 'credit_card' } },
  { id: 'bank', label: 'UPI / Bank', icon: { ios: 'building.columns.fill', android: 'account_balance' } },
  { id: 'cash', label: 'Cash', icon: { ios: 'banknote', android: 'payments' } },
  { id: 'wallet', label: 'Wallet', icon: { ios: 'wallet.bifold.fill', android: 'account_balance_wallet' } },
];
