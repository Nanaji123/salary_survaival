import { FREE_LIMITS } from '@convex/plans';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AiBasis, type BasisRow } from '@/components/ai-basis';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aiErrorMessage, cycleFacts, summarizeCycle } from '@/lib/ai';
import { loadSummary, saveSummary, type SavedSummary } from '@/lib/ai-cache';
import { cycleProgress } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { freeLeft, useUsage } from '@/lib/limits';
import { summarize, type Account, type Budget, type Expense, type SalaryCycle } from '@/lib/store';

const MINT = '#C6F45A';

/**
 * AI written summary of the current salary cycle. The last summary is kept on the device and
 * shown without calling the API. A new one is only requested after the user has seen what it is
 * based on and confirmed.
 */
export function AiSummaryCard({
  account,
  cycle,
  expenses,
  budgets,
}: {
  account: Account | null | undefined;
  cycle: SalaryCycle;
  expenses: Expense[];
  budgets: Budget[];
}) {
  const theme = useTheme();
  const [saved, setSaved] = useState<SavedSummary | null>(() => loadSummary(cycle._id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const currency = account?.currency ?? 'USD';
  const expenseCount = expenses.filter((e) => e.cycleId === cycle._id).length;
  const left = freeLeft('summary', useUsage());
  const outdated = !!saved && saved.expenseCount !== expenseCount;

  // What the summary will be written from, shown before anything is sent.
  const basis = useMemo((): BasisRow[] => {
    const s = summarize(cycle, expenses);
    const top = s.categories[0];
    return [
      { emoji: 'ledger', label: 'Expenses this cycle', value: String(s.items.length) },
      { emoji: 'banknote', label: 'Spent so far', value: `${formatMoney(s.spent, currency)} of ${formatMoney(cycle.amount, currency)}` },
      top
        ? { emoji: getCategory(top.id).emoji, label: 'Biggest category', value: getCategory(top.id).label }
        : { emoji: 'package', label: 'Biggest category', value: 'None yet' },
      { emoji: 'alarm', label: 'Days to payday', value: String(cycleProgress(cycle).daysLeft) },
      { emoji: 'coin', label: 'Budgets', value: budgets.length ? String(budgets.length) : 'None' },
      {
        emoji: 'moneyBag',
        label: 'Savings goal',
        value: account?.savingsGoal ? formatMoney(account.savingsGoal, currency) : 'None',
      },
    ];
  }, [cycle, expenses, budgets, account, currency]);

  /** Checks whether a new summary makes sense, then asks for confirmation. */
  function ask() {
    if (expenseCount === 0) {
      setError('Add a few expenses first, then I can summarize them.');
      return;
    }
    // Nothing new since the last summary, so another API call would return the same thing.
    if (saved && !outdated) {
      Haptics.selectionAsync();
      setNote('Your summary is already up to date.');
      return;
    }
    setNote(null);
    setError(null);
    setConfirming(true);
  }

  async function generate() {
    // Free plan: one summary a day. Skip the request when it is already used.
    if (left <= 0) {
      router.push('/paywall');
      return;
    }
    setConfirming(false);
    setLoading(true);
    setError(null);
    try {
      const text = await summarizeCycle(cycleFacts(account, cycle, expenses, budgets));
      const next = { text, expenseCount, savedAt: Date.now() };
      saveSummary(cycle._id, next);
      setSaved(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(198,244,90,0.28) 0%, transparent 55%)',
        },
      ]}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Icon name={Icons.sparkles} size={13} color="#0E1116" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" style={{ color: theme.heroText }}>
            AI summary
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            {saved
              ? `Saved ${new Date(saved.savedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
              : 'Your spending, explained simply'}
          </Text>
        </View>
        {saved && !loading && !confirming && (
          <Pressable accessibilityRole="button" accessibilityLabel="Regenerate summary" hitSlop={10} onPress={ask} style={styles.refresh}>
            <Icon name={Icons.wand} size={13} color={theme.heroText} />
            <Text variant="caption" style={{ color: theme.heroText, ...Fonts.semibold }}>
              Regenerate
            </Text>
          </Pressable>
        )}
      </View>

      {confirming ? (
        <AiBasis
          title="Here’s what I’ll read"
          rows={basis}
          result="3 to 4 short points: how you’re doing, where the money went, one thing to watch and one tip."
          privacy="Your totals per category and your 5 biggest expenses (name and amount) are sent to the AI. Notes are not."
          freeNote={
            Number.isFinite(left)
              ? left > 0
                ? `Uses your free AI summary (${FREE_LIMITS.summary} on the free plan). Pro is unlimited.`
                : 'Your free summary is used. Upgrade to Pro for unlimited summaries.'
              : undefined
          }
          confirmLabel={Number.isFinite(left) && left <= 0 ? 'Unlock with Pro' : saved ? 'Write a new summary' : 'Write my summary'}
          onConfirm={generate}
          onCancel={() => setConfirming(false)}
        />
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={MINT} />
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            Reading your expenses…
          </Text>
        </View>
      ) : saved ? (
        <Animated.View entering={FadeIn.duration(400)} style={{ gap: Spacing.two }}>
          <Text variant="body" style={{ color: theme.heroText, lineHeight: 24 }}>
            {saved.text}
          </Text>
          {outdated && (
            <Text variant="caption" style={{ color: '#FFB84D' }}>
              You have added expenses since this summary. Regenerate to include them.
            </Text>
          )}
          {!!error && (
            <Text variant="caption" style={{ color: '#FFB84D' }}>
              {error}
            </Text>
          )}
          {!!note && (
            <Text variant="caption" style={{ color: theme.heroMuted }}>
              {note}
            </Text>
          )}
        </Animated.View>
      ) : (
        <>
          {!!error && (
            <Text variant="caption" style={{ color: '#FFB84D' }}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={error ? generate : ask}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaText}>{error ? 'Try again' : left <= 0 ? 'Unlock with Pro' : 'Summarize my spending'}</Text>
            <Icon name={Icons.arrow} size={14} color="#0E1116" />
          </Pressable>
          {Number.isFinite(left) && (
            <Text variant="caption" style={{ color: theme.heroMuted, textAlign: 'center' }}>
              {left > 0 ? 'Free plan: 1 free AI summary' : 'Your free summary is used. Pro is unlimited.'}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  cta: {
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: '#0E1116', ...Fonts.bold, fontSize: 15 },
});
