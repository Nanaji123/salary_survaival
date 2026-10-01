import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { HeaderTextButton } from '@/components/header-button';
import { Button } from '@/components/ui/button';
import { AmountField, CategoryGrid, DateStepper, Field, FormScroll, MethodPicker } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { type CategoryId, type PaymentMethod } from '@/constants/categories';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { ProLock } from '@/components/pro-lock';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, parseAmount, todayKey } from '@/lib/format';
import { useIsPro } from '@/lib/subscription';
import {
  currentCycle,
  deleteExpense,
  expensesFor,
  saveExpense,
  useAccount,
  useCycles,
  useExpenses,
  type Expense,
  type SalaryCycle,
} from '@/lib/store';

export default function ExpenseScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const account = useAccount();
  const cycles = useCycles();
  const expenses = useExpenses();
  const isPro = useIsPro();

  // Adding expenses is a Pro feature; existing ones stay viewable and editable.
  if (!id && isPro === false) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerLeft: () => <HeaderTextButton title="Close" onPress={() => router.back()} />,
          }}
        />
        <ProLock
          title="Track every expense"
          body="Upgrade to Pro to record expenses, see where your salary goes and get alerts before you overspend."
        />
      </>
    );
  }

  if (!cycles || !expenses || (!id && isPro === undefined)) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />;
  }

  const existing = id ? expenses.find((e) => e._id === id) : undefined;
  const cycle = existing ? cycles.find((c) => c._id === existing.cycleId) : currentCycle(cycles);

  // Keyed per expense so form state never carries over between edits.
  return (
    <ExpenseForm
      key={id ?? 'new'}
      existing={existing}
      cycle={cycle ?? null}
      expenses={expenses}
      currency={account?.currency ?? 'INR'}
    />
  );
}

function ExpenseForm({
  existing,
  cycle,
  expenses,
  currency,
}: {
  existing?: Expense;
  cycle: SalaryCycle | null;
  expenses: Expense[];
  currency: string;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'food');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [method, setMethod] = useState<PaymentMethod>(existing?.method ?? 'card');
  const [note, setNote] = useState(existing?.note ?? '');

  const [submit, saving] = useSubmit();
  const value = parseAmount(amount);
  const valid = !!cycle && Number.isFinite(value) && value > 0 && title.trim().length > 0;

  // Balance preview: what is left in this cycle after saving this expense.
  const otherSpent = cycle
    ? expensesFor(expenses, cycle._id)
        .filter((e) => e._id !== existing?._id)
        .reduce((sum, e) => sum + e.amount, 0)
    : 0;
  const after = cycle ? cycle.amount - otherSpent - (Number.isFinite(value) ? value : 0) : 0;

  async function save() {
    if (!valid || !cycle) return;
    const ok = await submit(() =>
      saveExpense({
        id: existing?._id,
        cycleId: cycle._id,
        title: title.trim(),
        amount: value,
        category,
        date,
        method,
        note: note.trim() || undefined,
      }),
    );
    if (ok) router.back();
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete expense?', `“${existing.title}” will be removed from this cycle.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (await submit(() => deleteExpense(existing._id))) router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Edit expense' : 'New expense',
          headerLeft: () => <HeaderTextButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () =>
            valid && !saving ? <HeaderTextButton title="Save" bold onPress={save} /> : null,
        }}
      />
      <FormScroll>
        <AmountField
          label="Amount spent"
          value={amount}
          onChangeText={setAmount}
          currency={currency}
          autoFocus={!existing}
          footer={
            cycle && (
              <View style={[styles.after, { backgroundColor: after < 0 ? theme.dangerSoft : theme.primarySoft }]}>
                <Text
                  variant="caption"
                  style={{ fontFamily: Fonts.semibold, color: after < 0 ? theme.danger : theme.primaryInk }}>
                  {after < 0
                    ? `${formatMoney(-after, currency)} over your salary`
                    : `${formatMoney(after, currency)} left after this`}
                </Text>
              </View>
            )
          }
        />
        <Field
          label="What was it for?"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Rent, Groceries, Coffee"
          autoCapitalize="sentences"
          returnKeyType="done"
        />
        <CategoryGrid value={category} onChange={setCategory} />
        <MethodPicker value={method} onChange={setMethod} />
        <DateStepper label="Date" value={date} onChange={setDate} />
        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a detail to remember"
          returnKeyType="done"
        />
        <View style={{ gap: Spacing.two }}>
          <Button
            title={existing ? 'Save changes' : 'Add expense'}
            icon={Icons.check}
            disabled={!valid}
            loading={saving}
            onPress={save}
          />
          {existing && (
            <Button title="Delete expense" variant="danger" icon={Icons.trash} onPress={confirmDelete} />
          )}
        </View>
      </FormScroll>
    </>
  );
}

const styles = StyleSheet.create({
  after: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
