import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ProLock } from '@/components/pro-lock';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ProgressBar } from '@/components/ui/charts';
import { FormScroll } from '@/components/ui/form';
import { Text } from '@/components/ui/text';
import { Categories, type CategoryId } from '@/constants/categories';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatuses } from '@/lib/analytics';
import { currencySymbol, formatMoney, parseAmount, sanitizeAmountInput } from '@/lib/format';
import { useIsPro } from '@/lib/subscription';
import { currentCycle, setBudget, useAccount, useBudgets, useCycles, useExpenses } from '@/lib/store';

/** Per-category monthly limits with live progress for the current cycle. */
export default function BudgetsScreen() {
  const isPro = useIsPro();
  if (isPro === false) {
    return (
      <ProLock
        title="Budgets are a Pro feature"
        body="Set a limit for each category and get warned at 80% and when you go over."
      />
    );
  }
  return <Budgets />;
}

function Budgets() {
  const currency = useAccount()?.currency ?? 'USD';
  const budgets = useBudgets();
  const cycle = currentCycle(useCycles());
  const expenses = useExpenses();

  const statuses = useMemo(
    () => new Map(budgetStatuses(budgets ?? [], cycle, expenses ?? []).map((s) => [s.category, s])),
    [budgets, cycle, expenses],
  );
  const spentBy = useMemo(() => {
    const m = new Map<CategoryId, number>();
    for (const e of expenses ?? []) if (e.cycleId === cycle?._id) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return m;
  }, [expenses, cycle]);
  const totalLimit = [...statuses.values()].reduce((s, b) => s + b.limit, 0);
  const totalSpent = [...statuses.values()].reduce((s, b) => s + b.spent, 0);

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.two }}>
        <Text variant="overline" color="textSecondary">
          Budgeted this cycle
        </Text>
        <Text variant="display">{formatMoney(totalLimit, currency)}</Text>
        <Text variant="caption" color="textSecondary">
          {totalLimit > 0
            ? `${formatMoney(totalSpent, currency)} spent across budgeted categories${cycle ? ` · salary ${formatMoney(cycle.amount, currency)}` : ''}`
            : 'Enter a limit next to any category to start tracking it.'}
        </Text>
      </Card>
      <View style={{ gap: Spacing.two }}>
        {Categories.map((c) => (
          // Keyed by the saved limit so the input resets when the server value changes.
          <BudgetRow
            key={`${c.id}-${statuses.get(c.id)?.limit ?? 0}`}
            category={c.id}
            limit={statuses.get(c.id)?.limit}
            spent={spentBy.get(c.id) ?? 0}
            currency={currency}
          />
        ))}
      </View>
    </FormScroll>
  );
}

function BudgetRow({
  category,
  limit,
  spent,
  currency,
}: {
  category: CategoryId;
  limit?: number;
  spent: number;
  currency: string;
}) {
  const theme = useTheme();
  const c = Categories.find((x) => x.id === category)!;
  const [text, setText] = useState(limit ? String(limit) : '');
  const [submit] = useSubmit();
  const ratio = limit ? spent / limit : 0;
  const color = ratio > 1 ? theme.danger : ratio >= 0.8 ? theme.warning : c.color;

  function commit() {
    const value = text ? parseAmount(text) : 0;
    if (!Number.isFinite(value) || value === (limit ?? 0)) return;
    submit(() => setBudget(category, value));
  }

  return (
    <Card style={styles.row}>
      <View style={styles.top}>
        <CategoryIcon id={category} size={38} />
        <View style={{ flex: 1 }}>
          <Text variant="label">{c.label}</Text>
          <Text variant="caption" color={ratio > 1 ? 'danger' : 'textSecondary'}>
            {limit
              ? ratio > 1
                ? `${formatMoney(spent - limit, currency)} over`
                : `${formatMoney(limit - spent, currency)} left of ${formatMoney(limit, currency)}`
              : spent > 0
                ? `${formatMoney(spent, currency)} spent · no limit`
                : 'No limit'}
          </Text>
        </View>
        <View style={[styles.input, { backgroundColor: theme.cardAlt }]}>
          <Text variant="caption" color="textSecondary">
            {currencySymbol(currency)}
          </Text>
          <TextInput
            value={text}
            onChangeText={(t) => setText(sanitizeAmountInput(t))}
            onEndEditing={commit}
            placeholder="Limit"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectionColor={theme.primary}
            accessibilityLabel={`${c.label} budget limit`}
            style={[styles.inputText, { color: theme.text }]}
          />
        </View>
      </View>
      {!!limit && <ProgressBar value={ratio} color={color} height={6} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.three - 4,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  input: {
    width: 110,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
  },
  inputText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 15,
    padding: 0,
    textAlign: 'right',
  },
});
