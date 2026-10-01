import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

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
};

export const Categories: Category[] = [
  { id: 'rent', label: 'Rent & Home', color: '#5B5BD6', tint: '#E9E8FB', icon: { ios: 'house.fill', android: 'home' } },
  { id: 'food', label: 'Food & Dining', color: '#E0703A', tint: '#FCEADF', icon: { ios: 'fork.knife', android: 'restaurant' } },
  { id: 'groceries', label: 'Groceries', color: '#3E9A5C', tint: '#E1F2E6', icon: { ios: 'cart.fill', android: 'shopping_cart' } },
  { id: 'transport', label: 'Transport', color: '#2F8AC4', tint: '#E0EFF8', icon: { ios: 'car.fill', android: 'directions_car' } },
  { id: 'bills', label: 'Bills & Utilities', color: '#C99A0E', tint: '#F8F0D6', icon: { ios: 'bolt.fill', android: 'bolt' } },
  { id: 'shopping', label: 'Shopping', color: '#D2507E', tint: '#FAE3EB', icon: { ios: 'bag.fill', android: 'shopping_bag' } },
  { id: 'health', label: 'Health', color: '#D9534F', tint: '#FAE3E2', icon: { ios: 'heart.text.square.fill', android: 'medical_services' } },
  { id: 'entertainment', label: 'Entertainment', color: '#9057C8', tint: '#F0E6FA', icon: { ios: 'popcorn.fill', android: 'movie' } },
  { id: 'education', label: 'Education', color: '#1E9C94', tint: '#DDF3F1', icon: { ios: 'graduationcap.fill', android: 'school' } },
  { id: 'travel', label: 'Travel', color: '#3D72D9', tint: '#E3EBFA', icon: { ios: 'airplane', android: 'flight' } },
  { id: 'subscriptions', label: 'Subscriptions', color: '#6B5BD6', tint: '#ECE9FB', icon: { ios: 'tv.fill', android: 'subscriptions' } },
  { id: 'family', label: 'Family', color: '#C7743A', tint: '#F8EADF', icon: { ios: 'figure.2.and.child.holdinghands', android: 'family_restroom' } },
  { id: 'personal', label: 'Personal Care', color: '#C25BA8', tint: '#F8E5F3', icon: { ios: 'scissors', android: 'content_cut' } },
  { id: 'gifts', label: 'Gifts', color: '#D0465E', tint: '#FAE2E6', icon: { ios: 'gift.fill', android: 'redeem' } },
  { id: 'savings', label: 'Savings', color: '#0FA37A', tint: '#DCF5EC', icon: { ios: 'banknote.fill', android: 'savings' } },
  { id: 'other', label: 'Other', color: '#6B7280', tint: '#ECEDEF', icon: { ios: 'square.grid.2x2.fill', android: 'category' } },
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
