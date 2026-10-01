import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProLock } from '@/components/pro-lock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ProgressBar } from '@/components/ui/charts';
import { FormScroll, tap } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Categories, type CategoryId } from '@/constants/categories';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { currencySymbol, formatMoney, parseAmount, sanitizeAmountInput } from '@/lib/format';
import { useIsPro } from '@/lib/subscription';
import {
  currentCycle,
  setBudget,
  useAccount,
  useBudgets,
  useCycles,
  useExpenses,
  type Budget,
  type SalaryCycle,
} from '@/lib/store';

/** Per-category monthly limits with live progress for the current cycle. */
export default function BudgetsScreen() {
  const isPro = useIsPro();
  const account = useAccount();
  const budgets = useBudgets();
  const cycles = useCycles();
  const expenses = useExpenses();

  if (isPro === false) {
    return (
      <ProLock
        title="Budgets are a Pro feature"
        body="Set a limit for each category and get warned at 80% and when you go over."
      />
    );
  }
  if (!account || !budgets || !cycles || !expenses) {
    return <ActivityIndicator style={{ marginTop: Spacing.six }} />;
  }

  const cycle = currentCycle(cycles);
  const spentBy = new Map<CategoryId, number>();
  for (const e of expenses) {
    if (e.cycleId === cycle?._id) spentBy.set(e.category, (spentBy.get(e.category) ?? 0) + e.amount);
  }
  return (
    <Budgets
      currency={account.currency}
      savingsGoal={account.savingsGoal ?? 0}
      budgets={budgets}
      cycle={cycle}
      spentBy={spentBy}
    />
  );
}

function Budgets({
  currency,
  savingsGoal,
  budgets,
  cycle,
  spentBy,
}: {
  currency: string;
  savingsGoal: number;
  budgets: Budget[];
  cycle: SalaryCycle | null;
  spentBy: Map<CategoryId, number>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const saved = useMemo(() => new Map(budgets.map((b) => [b.category, b.limit])), [budgets]);
  const [draft, setDraft] = useState<Partial<Record<CategoryId, string>>>(() =>
    Object.fromEntries(budgets.map((b) => [b.category, String(b.limit)])),
  );
  const [submit, saving] = useSubmit();
  const [justSaved, setJustSaved] = useState(false);

  const limitOf = (id: CategoryId) => {
    const v = draft[id] ? parseAmount(draft[id]!) : 0;
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  const budgeted = Categories.reduce((sum, c) => sum + limitOf(c.id), 0);
  const salary = cycle?.amount ?? null;
  // What is left of the salary after the savings goal and every budget in the draft.
  const available = salary === null ? null : salary - savingsGoal - budgeted;
  const over = available !== null && available < 0;
  const changed = Categories.filter((c) => limitOf(c.id) !== (saved.get(c.id) ?? 0));
  const dirty = changed.length > 0;

  function edit(id: CategoryId, text: string) {
    setJustSaved(false);
    setDraft((d) => ({ ...d, [id]: sanitizeAmountInput(text) }));
  }

  async function save() {
    const ok = await submit(async () => {
      for (const c of changed) await setBudget(c.id, limitOf(c.id));
    });
    if (ok) setJustSaved(true);
  }

  const share = (v: number) => (salary ? Math.min(1, Math.max(0, v / salary)) : 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FormScroll>
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          <Text variant="overline" style={{ color: theme.heroMuted }}>
            {salary === null ? 'Budgeted' : over ? 'Over your salary by' : 'Available to budget'}
          </Text>
          <Text variant="hero" style={{ color: over ? theme.danger : theme.heroText }}>
            {salary === null ? formatMoney(budgeted, currency) : formatMoney(Math.abs(available ?? 0), currency)}
          </Text>
          {salary !== null ? (
            <>
              {/* Salary split: budgets, savings goal, then what is still free. */}
              <View style={styles.split}>
                <View style={{ flex: share(budgeted), backgroundColor: theme.heroAccent }} />
                <View style={{ flex: share(savingsGoal), backgroundColor: '#FFB84D' }} />
                <View style={{ flex: Math.max(0, 1 - share(budgeted) - share(savingsGoal)), backgroundColor: 'rgba(255,255,255,0.14)' }} />
              </View>
              <View style={styles.legend}>
                <Legend color={theme.heroAccent} label="Budgets" value={formatMoney(budgeted, currency, { compact: true })} />
                <Legend color="#FFB84D" label="Savings goal" value={formatMoney(savingsGoal, currency, { compact: true })} />
                <Legend color="rgba(255,255,255,0.4)" label="Salary" value={formatMoney(salary, currency, { compact: true })} />
              </View>
            </>
          ) : (
            <Text variant="caption" style={{ color: theme.heroMuted }}>
              Add your salary to see how much you can allocate.
            </Text>
          )}
        </View>

        {budgeted === 0 && (
          <Button title="Let AI plan my budgets" icon={Icons.wand} variant="secondary" onPress={() => router.push('/ai-plan')} />
        )}

        <View style={{ gap: Spacing.two }}>
          {Categories.map((c) => {
            const limit = limitOf(c.id);
            const spent = spentBy.get(c.id) ?? 0;
            // The most this category can be set to without going over the salary.
            const max = available === null ? null : Math.max(0, available + limit);
            const tooHigh = max !== null && limit > max;
            const ratio = limit ? spent / limit : 0;
            const color = ratio > 1 ? theme.danger : ratio >= 0.8 ? theme.warning : c.color;
            return (
              <Card key={c.id} style={styles.row}>
                <View style={styles.top}>
                  <CategoryIcon id={c.id} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{c.label}</Text>
                    <Text variant="caption" color={ratio > 1 || tooHigh ? 'danger' : 'textSecondary'}>
                      {tooHigh
                        ? `Too high. You can add up to ${formatMoney(max!, currency)}`
                        : limit
                          ? ratio > 1
                            ? `${formatMoney(spent - limit, currency)} over`
                            : `${formatMoney(limit - spent, currency)} left of ${formatMoney(limit, currency)}`
                          : max !== null
                            ? `Up to ${formatMoney(max, currency)}`
                            : 'No limit'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.input,
                      { backgroundColor: theme.cardAlt },
                      tooHigh && { borderColor: theme.danger, borderWidth: 1.5 },
                    ]}>
                    <Text variant="caption" color="textSecondary">
                      {currencySymbol(currency)}
                    </Text>
                    <TextInput
                      value={draft[c.id] ?? ''}
                      onChangeText={(t) => edit(c.id, t)}
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
                {max !== null && max > 0 && limit < max && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      tap();
                      edit(c.id, String(Math.floor(max)));
                    }}
                    hitSlop={8}
                    style={styles.maxButton}>
                    <Text variant="caption" color="primaryInk" style={{ fontFamily: Fonts.bold }}>
                      Use all available ({formatMoney(Math.floor(max), currency, { compact: true })})
                    </Text>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>
      </FormScroll>

      <View
        style={[
          styles.saveBar,
          { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.two },
        ]}>
        <Button
          title={justSaved && !dirty ? 'Saved' : dirty ? `Save ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}` : 'No changes'}
          icon={Icons.check}
          disabled={!dirty || over || saving}
          loading={saving}
          onPress={save}
        />
      </View>
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
          {label}
        </Text>
        <Text variant="label" style={{ color: '#FFFFFF', fontFamily: Fonts.bold }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.two,
  },
  split: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
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
  maxButton: { alignSelf: 'flex-start' },
  saveBar: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
