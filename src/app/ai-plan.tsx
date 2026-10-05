import { FREE_LIMITS } from '@convex/plans';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiBasis, type BasisRow } from '@/components/ai-basis';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory, type CategoryId } from '@/constants/categories';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { aiErrorMessage, applyPlan, historyFacts, planSalary, type SalaryPlan } from '@/lib/ai';
import { loadPlan, savePlan, type SavedPlan } from '@/lib/ai-cache';
import { formatMoney, parseAmount, sanitizeAmountInput } from '@/lib/format';
import { freeLeft, useUsage } from '@/lib/limits';
import { currentCycle, getDeviceId, summarize, useAccount, useBudgets, useCycles, useExpenses } from '@/lib/store';

const INK = '#0E1116';
const CARD = 'rgba(255,255,255,0.06)';
const LINE = 'rgba(255,255,255,0.1)';
const MINT = '#C6F45A';
const MUTED = 'rgba(255,255,255,0.62)';

type Draft = { goal: string; limits: Partial<Record<CategoryId, string>> };

/**
 * AI salary plan. The last plan is saved on the device and shown instantly. A new plan is only
 * requested after the user has seen what it is based on and confirmed.
 */
export default function AiPlanScreen() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycles = useCycles();
  const expenses = useExpenses();
  const budgets = useBudgets();
  const usage = useUsage();
  const cycle = currentCycle(cycles);
  const currency = account?.currency ?? 'USD';
  const deviceId = getDeviceId();

  const [saved, setSaved] = useState<SavedPlan | null>(() => loadPlan(deviceId));
  const [error, setError] = useState<string | null>(null);
  // Each confirmed request bumps the attempt; 0 means nothing has been requested yet.
  const [attempt, setAttempt] = useState(0);
  // Without a saved plan, start on the confirmation that explains what the plan is based on.
  const [confirming, setConfirming] = useState(() => !loadPlan(deviceId));
  const [fetched, setFetched] = useState(0);
  const [applying, setApplying] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const facts = useMemo(() => (cycles && expenses ? historyFacts(cycles, expenses) : null), [cycles, expenses]);
  const salary = cycle?.amount ?? null;
  const loading = attempt > fetched && !error && !!cycle;
  const dataReady = facts !== null && salary !== null;

  useEffect(() => {
    if (attempt === 0 || facts === null || salary === null) return;
    let cancelled = false;
    planSalary(facts, salary)
      .then((plan) => {
        if (cancelled) return;
        const next: SavedPlan = { plan, salary, applied: false, savedAt: Date.now() };
        savePlan(deviceId, next);
        setSaved(next);
        setDraft(null);
        setFetched(attempt);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch((e) => {
        if (!cancelled) setError(aiErrorMessage(e));
      });
    return () => {
      cancelled = true;
    };
    // Re-run for a new attempt or once the data first arrives, not on every live data update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, dataReady]);

  function regenerate() {
    setError(null);
    setDraft(null);
    setConfirming(true);
  }

  function generate() {
    if (freeLeft('plan', usage) <= 0) {
      router.push('/paywall');
      return;
    }
    setConfirming(false);
    setError(null);
    setDraft(null);
    setAttempt((n) => n + 1);
  }

  // What the plan will be built from, shown before anything is sent.
  const basis = useMemo((): BasisRow[] => {
    if (!cycles || !expenses || !cycle) return [];
    const looked = cycles.slice(0, 4);
    const count = looked.reduce((n, c) => n + summarize(c, expenses).items.length, 0);
    const totals = new Map<CategoryId, number>();
    for (const c of looked) for (const x of summarize(c, expenses).categories) totals.set(x.id, (totals.get(x.id) ?? 0) + x.amount);
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    return [
      { emoji: 'banknote', label: 'Salary to plan', value: formatMoney(cycle.amount, currency) },
      { emoji: 'scroll', label: 'Salary cycles read', value: String(looked.length) },
      { emoji: 'ledger', label: 'Expenses in them', value: String(count) },
      top
        ? { emoji: getCategory(top[0]).emoji, label: 'Biggest category', value: getCategory(top[0]).label }
        : { emoji: 'package', label: 'Biggest category', value: 'None yet' },
      {
        emoji: 'moneyBag',
        label: 'Current savings goal',
        value: account?.savingsGoal ? formatMoney(account.savingsGoal, currency) : 'None',
      },
      { emoji: 'coin', label: 'Current budgets', value: budgets?.length ? String(budgets.length) : 'None' },
    ];
  }, [cycles, expenses, cycle, account, budgets, currency]);
  const planLeft = freeLeft('plan', usage);

  function startEdit() {
    if (!saved) return;
    setDraft({
      goal: String(saved.plan.savingsGoal),
      limits: Object.fromEntries(saved.plan.budgets.map((b) => [b.category, String(b.limit)])),
    });
  }

  function finishEdit() {
    if (!saved || !draft) return;
    const num = (t: string | undefined) => {
      const v = t ? parseAmount(t) : 0;
      return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
    };
    const plan: SalaryPlan = {
      ...saved.plan,
      savingsGoal: num(draft.goal),
      budgets: saved.plan.budgets
        .map((b) => ({ ...b, limit: num(draft.limits[b.category]) }))
        .filter((b) => b.limit > 0),
    };
    const next = { ...saved, plan, applied: false, savedAt: Date.now() };
    savePlan(deviceId, next);
    setSaved(next);
    setDraft(null);
  }

  async function apply() {
    if (!saved) return;
    setApplying(true);
    try {
      await applyPlan(saved.plan);
      const next = { ...saved, applied: true };
      savePlan(deviceId, next);
      setSaved(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 700);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  const plan = saved?.plan ?? null;
  const budgeted = plan?.budgets.reduce((sum, b) => sum + b.limit, 0) ?? 0;
  const draftTotal = draft
    ? Object.values(draft.limits).reduce((sum, t) => sum + (parseAmount(t ?? '') || 0), 0) + (parseAmount(draft.goal) || 0)
    : 0;
  const overBudget = draft !== null && salary !== null && draftTotal > salary;
  const stale = !!saved && salary !== null && saved.salary !== salary;

  return (
    <View
      style={[
        styles.container,
        {
          experimental_backgroundImage:
            'radial-gradient(circle at 90% 0%, rgba(198,244,90,0.24) 0%, transparent 45%), radial-gradient(circle at 0% 60%, rgba(255,150,60,0.16) 0%, transparent 40%)',
        },
      ]}>
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <View style={styles.top}>
          <View style={styles.pill}>
            <Icon name={Icons.wand} size={12} color={INK} />
            <Text style={styles.pillText}>AI SALARY PLAN</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} style={styles.close}>
            <Icon name={Icons.close} size={14} color={MUTED} />
          </Pressable>
        </View>

        <Text style={styles.title}>Your salary,{'\n'}planned.</Text>

        {!cycle && cycles !== undefined ? (
          <Text style={styles.sub}>Add your salary first and I will build a plan around it.</Text>
        ) : confirming && cycle ? (
          <AiBasis
            title="Here’s what I’ll look at"
            rows={basis}
            result="A savings goal and 5 to 8 category budgets that fit inside your salary. Nothing changes until you tap Apply."
            privacy="Only your salary and spending totals per category are sent to the AI. Expense names and notes are not."
            freeNote={
              Number.isFinite(planLeft)
                ? planLeft > 0
                  ? `Uses your free AI plan (${FREE_LIMITS.plan} on the free plan). Pro is unlimited.`
                  : 'Your free AI plan is used. Upgrade to Pro for unlimited plans.'
                : undefined
            }
            confirmLabel={Number.isFinite(planLeft) && planLeft <= 0 ? 'Unlock with Pro' : saved ? 'Generate a new plan' : 'Generate my plan'}
            cancelLabel={saved ? 'Keep my current plan' : 'Not now'}
            onConfirm={generate}
            onCancel={() => (saved ? setConfirming(false) : router.back())}
          />
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={MINT} />
            <Text style={styles.sub}>
              {saved ? 'Rebuilding your plan with your current salary…' : 'Looking at your spending and building a plan…'}
            </Text>
          </View>
        ) : error && !plan ? (
          <View style={{ gap: Spacing.three }}>
            <View style={styles.hint}>
              <Icon name={Icons.alert} size={14} color="#FFB84D" />
              <Text style={styles.hintText}>{error}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={generate} style={styles.cta}>
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          </View>
        ) : plan && saved ? (
          <>
            {!!error && (
              <View style={styles.hint}>
                <Icon name={Icons.alert} size={14} color="#FFB84D" />
                <Text style={styles.hintText}>{error}</Text>
              </View>
            )}
            {stale && salary !== null && (
              <View style={styles.hint}>
                <Icon name={Icons.salary} size={14} color="#FFB84D" />
                <Text style={styles.hintText}>
                  This plan was made for a salary of {formatMoney(saved.salary, currency)}. Your current salary is{' '}
                  {formatMoney(salary, currency)}. Regenerate to update it.
                </Text>
              </View>
            )}

            <Animated.View entering={FadeInDown.duration(380)} style={styles.summary}>
              <Text style={styles.summaryText}>{plan.summary}</Text>
              <Text style={styles.savedMeta}>
                {saved.applied ? 'Applied to your budgets · ' : 'Not applied yet · '}
                {new Date(saved.savedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </Text>
            </Animated.View>

            <View style={styles.figures}>
              <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.figure}>
                <Text style={styles.figLabel}>SAVE EACH SALARY</Text>
                {draft ? (
                  <MoneyInput value={draft.goal} onChange={(t) => setDraft({ ...draft, goal: t })} label="Savings goal" />
                ) : (
                  <Text style={styles.figValue}>{formatMoney(plan.savingsGoal, currency)}</Text>
                )}
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(140).duration(380)} style={styles.figure}>
                <Text style={styles.figLabel}>BUDGETED</Text>
                <Text style={styles.figValue}>{formatMoney(budgeted, currency)}</Text>
              </Animated.View>
            </View>

            <Text style={styles.section}>Suggested budgets</Text>
            {plan.budgets.map((b, i) => (
              <Animated.View key={b.category} entering={FadeInDown.delay(200 + i * 60).duration(380)} style={styles.row}>
                <CategoryIcon id={b.category} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{getCategory(b.category).label}</Text>
                  {!!b.reason && <Text style={styles.rowSub}>{b.reason}</Text>}
                </View>
                {draft ? (
                  <MoneyInput
                    value={draft.limits[b.category] ?? ''}
                    onChange={(t) => setDraft({ ...draft, limits: { ...draft.limits, [b.category]: t } })}
                    label={`${getCategory(b.category).label} limit`}
                    compact
                  />
                ) : (
                  <Text style={styles.rowAmount}>{formatMoney(b.limit, currency)}</Text>
                )}
              </Animated.View>
            ))}

            {draft && (
              <Text style={overBudget ? styles.hintText : styles.savedMeta}>
                {overBudget && salary !== null
                  ? `Goal plus budgets come to ${formatMoney(draftTotal, currency)}, more than your salary of ${formatMoney(salary, currency)}.`
                  : 'Set a limit to 0 to drop a budget.'}
              </Text>
            )}

            {draft ? (
              <Pressable accessibilityRole="button" onPress={finishEdit} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
                <Text style={styles.ctaText}>Done editing</Text>
                <Icon name={Icons.check} size={16} color={INK} />
              </Pressable>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={applying || saved.applied}
                  onPress={apply}
                  style={({ pressed }) => [styles.cta, (applying || saved.applied) && { opacity: 0.55 }, pressed && { opacity: 0.85 }]}>
                  {applying ? (
                    <ActivityIndicator color={INK} />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>{saved.applied ? 'Plan applied' : 'Apply this plan'}</Text>
                      <Icon name={Icons.check} size={16} color={INK} />
                    </>
                  )}
                </Pressable>
                <View style={styles.secondaryRow}>
                  <Pressable accessibilityRole="button" onPress={startEdit} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
                    <Icon name={Icons.edit} size={15} color="#FFFFFF" />
                    <Text style={styles.secondaryText}>Edit</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={applying} onPress={regenerate} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
                    <Icon name={Icons.wand} size={15} color="#FFFFFF" />
                    <Text style={styles.secondaryText}>Regenerate</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MoneyInput({
  value,
  onChange,
  label,
  compact,
}: {
  value: string;
  onChange: (t: string) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(sanitizeAmountInput(t))}
      keyboardType="decimal-pad"
      selectionColor={MINT}
      accessibilityLabel={label}
      placeholder="0"
      placeholderTextColor="rgba(255,255,255,0.3)"
      style={[styles.moneyInput, compact && { width: 96 }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.three,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MINT,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: INK, ...Fonts.extrabold, fontSize: 11, letterSpacing: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    ...Fonts.extrabold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    marginTop: Spacing.three,
  },
  sub: { color: MUTED, ...Fonts.medium, fontSize: 15, lineHeight: 22 },
  loading: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.three },
  summary: {
    backgroundColor: 'rgba(198,244,90,0.1)',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  summaryText: { color: '#FFFFFF', ...Fonts.medium, fontSize: 15, lineHeight: 22 },
  savedMeta: { color: 'rgba(255,255,255,0.5)', ...Fonts.medium, fontSize: 12, marginTop: 8 },
  figures: { flexDirection: 'row', gap: Spacing.three - 4 },
  figure: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: 4,
  },
  figLabel: { color: 'rgba(255,255,255,0.45)', ...Fonts.bold, fontSize: 10.5, letterSpacing: 1 },
  figValue: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 22, letterSpacing: -0.4 },
  section: { color: '#FFFFFF', ...Fonts.bold, fontSize: 17, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: 12,
  },
  rowTitle: { color: '#FFFFFF', ...Fonts.bold, fontSize: 15 },
  rowSub: { color: MUTED, ...Fonts.medium, fontSize: 12.5 },
  rowAmount: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 15, fontVariant: ['tabular-nums'] },
  hint: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,184,77,0.12)',
    borderRadius: Radius.md,
    padding: 12,
  },
  hintText: { flex: 1, color: '#FFD9A0', ...Fonts.medium, fontSize: 13, lineHeight: 18 },
  cta: {
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    boxShadow: '0 12px 30px rgba(198,244,90,0.35)',
    marginTop: Spacing.two,
  },
  ctaText: { color: INK, ...Fonts.bold, fontSize: 17 },
  secondaryRow: { flexDirection: 'row', gap: Spacing.two },
  secondary: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryText: { color: '#FFFFFF', ...Fonts.semibold, fontSize: 15 },
  moneyInput: {
    minWidth: 110,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    ...Fonts.extrabold,
    fontSize: 16,
    paddingHorizontal: 10,
    padding: 0,
    textAlign: 'right',
  },
});
