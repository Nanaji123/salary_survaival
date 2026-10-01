import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { Text } from '@/components/ui/text';
import { getCategory, PaymentMethods } from '@/constants/categories';
import { formatDateKey, formatMoney } from '@/lib/format';
import type { Expense } from '@/lib/store';

export function TransactionRow({
  expense,
  currency,
  showDate = true,
}: {
  expense: Expense;
  currency: string;
  showDate?: boolean;
}) {
  const category = getCategory(expense.category);
  const method = PaymentMethods.find((m) => m.id === expense.method)?.label;
  const meta = [category.label, method, showDate ? formatDateKey(expense.date) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.title}, ${formatMoney(expense.amount, currency)}`}
      onPress={() => router.push({ pathname: '/expense', params: { id: expense._id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <CategoryIcon id={expense.category} size={44} />
      <View style={styles.body}>
        <Text variant="label" numberOfLines={1}>
          {expense.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text variant="money">−{formatMoney(expense.amount, currency)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  body: {
    flex: 1,
    gap: 2,
  },
});

