import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aiErrorMessage, cycleFacts, summarizeCycle } from '@/lib/ai';
import { loadSummary, saveSummary, type SavedSummary } from '@/lib/ai-cache';
import type { Account, Budget, Expense, SalaryCycle } from '@/lib/store';

const MINT = '#4BE3B0';

/**
 * AI written summary of the current salary cycle. The last summary is kept on the device and
 * shown without calling the API; the refresh button builds a new one from the latest data.
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
  const expenseCount = expenses.filter((e) => e.cycleId === cycle._id).length;
  const outdated = !!saved && saved.expenseCount !== expenseCount;

  async function run() {
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
            'radial-gradient(circle at 100% 0%, rgba(75,227,176,0.28) 0%, transparent 55%)',
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
        {saved && !loading && (
          <Pressable accessibilityRole="button" accessibilityLabel="Regenerate summary" hitSlop={10} onPress={run} style={styles.refresh}>
            <Icon name={Icons.wand} size={13} color={theme.heroText} />
            <Text variant="caption" style={{ color: theme.heroText, fontFamily: Fonts.semibold }}>
              Regenerate
            </Text>
          </Pressable>
        )}
      </View>

      {loading ? (
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
            onPress={run}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaText}>{error ? 'Try again' : 'Summarize my spending'}</Text>
            <Icon name={Icons.arrow} size={14} color="#0E1116" />
          </Pressable>
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
  ctaText: { color: '#0E1116', fontFamily: Fonts.bold, fontSize: 15 },
});
