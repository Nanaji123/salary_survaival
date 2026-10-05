import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AiSummaryCard } from '@/components/ai-summary-card';
import { EmptyState } from '@/components/empty-state';
import {
  CategoryBreakdown,
  InsightsHero,
  SpendCalendar,
  UnlockCard,
  type Unlockable,
} from '@/components/insight-cards';
import { ScreenTitle, Section } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { BarChart, GroupedBars, LegendDot, StackedBar, TrendChart } from '@/components/ui/charts';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Icon, Icons } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { Text } from '@/components/ui/text';
import { getCategory, PaymentMethods } from '@/constants/categories';
import type { EmojiName } from '@/constants/emoji';
import { Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTabTopInset } from '@/hooks/use-tab-top-inset';
import { useTheme } from '@/hooks/use-theme';
import {
  biggestExpense,
  cumulativeSpending,
  cycleEnd,
  cycleHistory,
  cycleProgress,
  dailySpending,
  insights,
  methodSplit,
  weekdaySpending,
} from '@/lib/analytics';
import { formatMoney, fromDateKey } from '@/lib/format';
import { currentCycle, summarize, useAccount, useBudgets, useCycles, useExpenses } from '@/lib/store';

const METHOD_COLORS: Record<string, string> = {
  cash: '#16A34A',
  card: '#9333EA',
  bank: '#E8A400',
  wallet: '#EA580C',
};

const NOTE_EMOJI: Record<'good' | 'warn' | 'info', EmojiName> = { good: 'check', warn: 'warning', info: 'bulb' };

export default function InsightsScreen() {
  const theme = useTheme();
  const topInset = useTabTopInset();
  const account = useAccount();
  const currency = account?.currency ?? 'USD';
  const budgets = useBudgets();
  const cycles = useCycles();
  const expenses = useExpenses();
  const cycle = currentCycle(cycles);
  const [trend, setTrend] = useState<'daily' | 'pace'>('daily');

  const data = useMemo(() => {
    if (!cycle || !cycles || !expenses) return null;
    const summary = summarize(cycle, expenses);
    const progress = cycleProgress(cycle);
    const weekdays = weekdaySpending(cycle, expenses);
    const busiest = weekdays.reduce((m, d) => (d.total > m.total ? d : m), weekdays[0]);
    return {
      summary,
      progress,
      projected: (summary.spent / Math.max(1, progress.elapsed)) * progress.total,
      daily: dailySpending(cycle, expenses),
      cumulative: cumulativeSpending(cycle, expenses),
      weekdays,
      busiest: busiest.total > 0 ? busiest : null,
      methods: methodSplit(cycle, expenses),
      history: cycleHistory(cycles, expenses),
      biggest: biggestExpense(cycle, expenses),
      top: summary.items.slice().sort((a, b) => b.amount - a.amount).slice(0, 3),
      notes: insights(cycle, expenses, cycles[1] ?? null),
      activeDays: new Set(summary.items.map((e) => e.date)).size,
    };
  }, [cycle, cycles, expenses]);

  const compact = (v: number) => formatMoney(Math.round(v), currency, { compact: true });

  // Charts that need more data than the user has yet, listed together in one checklist.
  const locked: Unlockable[] = [];
  if (data) {
    if (data.summary.items.length < 3)
      locked.push({ title: 'Spending trends', requirement: 'Log 3 expenses', have: data.summary.items.length, need: 3, emoji: 'rocket' });
    if (data.activeDays < 3)
      locked.push({ title: 'Your week', requirement: 'Log spending on 3 different days', have: data.activeDays, need: 3, emoji: 'sun' });
    if (data.methods.length === 0)
      locked.push({ title: 'How you pay', requirement: 'Pick Card, UPI, Cash or Wallet on an expense', have: 0, need: 1, emoji: 'banknote' });
    if (data.history.length < 2)
      locked.push({ title: 'Month vs month', requirement: 'Log your next salary', have: data.history.length, need: 2, emoji: 'scroll' });
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + Spacing.three, paddingBottom: TabBarSpace }]}>
      <ScreenTitle eyebrow="Current salary cycle" title="Insights" />

      {!data || !cycle ? (
        cycles === undefined || expenses === undefined ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />
        ) : (
          <EmptyState
            icon={Icons.insights}
            title="Insights appear here"
            body="Add your salary and a few expenses and I will chart where your money goes."
            suggestions={[{ label: 'Plan with AI', icon: Icons.wand, onPress: () => router.push('/ai-plan') }]}
            suggestionsTitle="Get started"
          />
        )
      ) : (
        <>
          {/* Where you stand. */}
          <Reveal>
            <InsightsHero
              salary={cycle.amount}
              spent={data.summary.spent}
              elapsed={data.progress.elapsed}
              total={data.progress.total}
              daysLeft={data.progress.daysLeft}
              receivedOn={cycle.receivedOn}
              currency={currency}
            />
          </Reveal>

          <Reveal index={1}>
            <AiSummaryCard key={cycle._id} account={account} cycle={cycle} expenses={expenses ?? []} budgets={budgets ?? []} />
          </Reveal>

          {/* Day by day. */}
          <Reveal index={2}>
            <Section title="Spending calendar">
              <SpendCalendar
                receivedOn={cycle.receivedOn}
                payday={cycleEnd(cycle)}
                salary={cycle.amount}
                totalDays={data.progress.total}
                items={data.summary.items}
                currency={currency}
              />
            </Section>
          </Reveal>

          {/* Where it goes. */}
          {data.summary.spent > 0 && (
            <Reveal index={3}>
              <Section title="Where it goes">
                <CategoryBreakdown categories={data.summary.categories} spent={data.summary.spent} currency={currency} />
              </Section>
            </Reveal>
          )}

          {data.summary.items.length > 0 && (
            <Reveal index={4} style={styles.tiles}>
              <StatTile
                emoji={data.biggest ? getCategory(data.biggest.category).emoji : 'zap'}
                label="Biggest expense"
                value={data.biggest ? formatMoney(data.biggest.amount, currency) : '—'}
                caption={data.biggest?.title}
              />
              <StatTile
                emoji={data.summary.categories[0] ? getCategory(data.summary.categories[0].id).emoji : 'package'}
                label="Top category"
                value={data.summary.categories[0] ? getCategory(data.summary.categories[0].id).label : '—'}
                caption={
                  data.summary.categories[0]
                    ? `${Math.round((data.summary.categories[0].amount / data.summary.spent) * 100)}% of spending`
                    : undefined
                }
              />
              <StatTile
                emoji="ledger"
                label="Expenses"
                value={String(data.summary.items.length)}
                caption={`on ${data.activeDays} ${data.activeDays === 1 ? 'day' : 'days'}`}
              />
              <StatTile
                emoji="sun"
                label="Busiest day"
                value={data.busiest ? data.busiest.label : '—'}
                caption={data.busiest ? `${compact(data.busiest.total)} in total` : undefined}
              />
            </Reveal>
          )}

          {/* Trends, once there is enough to draw. */}
          {data.summary.items.length >= 3 && (
            <Reveal index={5}>
              <Section title="Trends">
                <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <View style={[styles.segment, { backgroundColor: theme.cardAlt }]}>
                    {(['daily', 'pace'] as const).map((t) => (
                      <Pressable
                        key={t}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: trend === t }}
                        onPress={() => setTrend(t)}
                        style={[styles.segmentItem, trend === t && { backgroundColor: theme.card, boxShadow: `0 1px 3px ${theme.shadow}` }]}>
                        <Text variant="caption" style={{ ...Fonts.bold, color: trend === t ? theme.text : theme.textSecondary }}>
                          {t === 'daily' ? 'Daily spending' : 'Pace to payday'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {trend === 'daily' ? (
                    <BarChart
                      data={data.daily.map((d) => ({ label: String(fromDateKey(d.date).getDate()), value: d.amount }))}
                      color={theme.primary}
                      highlightIndex={data.daily.length - 1}
                      highlightColor={theme.text}
                      formatValue={compact}
                      maxLabels={7}
                    />
                  ) : (
                    <>
                      <TrendChart
                        points={data.cumulative}
                        totalDays={data.progress.total}
                        limit={cycle.amount}
                        color={data.projected > cycle.amount ? theme.danger : theme.primary}
                        paceColor={theme.textTertiary}
                        gridColor={theme.border}
                        labelColor={theme.textTertiary}
                        formatValue={compact}
                      />
                      <View style={styles.legendInline}>
                        <LegendDot color={data.projected > cycle.amount ? theme.danger : theme.primary} />
                        <Text variant="caption" color="textSecondary">
                          Your spending
                        </Text>
                        <View style={[styles.dash, { borderColor: theme.textTertiary }]} />
                        <Text variant="caption" color="textSecondary">
                          Even pace
                        </Text>
                      </View>
                    </>
                  )}
                </Card>
              </Section>
            </Reveal>
          )}

          {data.activeDays >= 3 && (
            <Reveal index={6}>
              <Section title="Your week">
                <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <BarChart
                    data={data.weekdays.map((d) => ({ label: d.label, value: d.average }))}
                    color={theme.gold}
                    highlightIndex={data.busiest ? data.weekdays.findIndex((d) => d.label === data.busiest!.label) : undefined}
                    highlightColor={theme.fire}
                    formatValue={compact}
                    maxLabels={7}
                    height={120}
                  />
                  <Text variant="caption" color="textSecondary">
                    {data.busiest
                      ? `Average per day. ${data.busiest.label} is your biggest spending day.`
                      : 'Average spend per weekday.'}
                  </Text>
                </Card>
              </Section>
            </Reveal>
          )}

          {data.methods.length > 0 && (
            <Reveal index={7}>
              <Section title="How you pay">
                <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <StackedBar
                    segments={data.methods.map((m) => ({
                      key: m.method,
                      value: m.amount,
                      color: METHOD_COLORS[m.method] ?? theme.textTertiary,
                    }))}
                  />
                  <View style={{ gap: Spacing.two + 2 }}>
                    {data.methods.map((m) => {
                      const method = PaymentMethods.find((x) => x.id === m.method);
                      return (
                        <View key={m.method} style={styles.legendRow}>
                          <LegendDot color={METHOD_COLORS[m.method] ?? theme.textTertiary} />
                          {method && <Icon name={method.icon} size={14} color={theme.textSecondary} />}
                          <Text variant="label" style={{ flex: 1 }}>
                            {method?.label ?? m.method}
                          </Text>
                          <Text variant="money">{formatMoney(m.amount, currency)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </Section>
            </Reveal>
          )}

          {data.history.length > 1 && (
            <Reveal index={8}>
              <Section title="Month vs month">
                <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <View style={styles.legendInline}>
                    <LegendDot color={theme.text} />
                    <Text variant="caption" color="textSecondary">
                      Spent
                    </Text>
                    <LegendDot color={theme.primary} />
                    <Text variant="caption" color="textSecondary">
                      Saved
                    </Text>
                  </View>
                  <GroupedBars
                    groups={data.history.map((h) => ({ label: h.label, values: [h.spent, h.saved] }))}
                    colors={[theme.text, theme.primary]}
                  />
                </Card>
              </Section>
            </Reveal>
          )}

          {/* What's still locked. */}
          {locked.length > 0 && (
            <Reveal index={9}>
              <UnlockCard items={locked} />
            </Reveal>
          )}

          {/* Takeaways. */}
          {data.notes.length > 0 && (
            <Section title="What we noticed">
              <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
                {data.notes.map((n, i) => (
                  <View key={i} style={{ gap: Spacing.three }}>
                    {i > 0 && <Divider inset={36} />}
                    <View style={styles.note}>
                      <EmojiImage name={NOTE_EMOJI[n.tone]} size={24} />
                      <Text variant="body" style={{ flex: 1 }}>
                        {n.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            </Section>
          )}

          {data.top.length > 0 && (
            <Section title="Biggest expenses">
              <Card style={{ paddingVertical: Spacing.one, paddingHorizontal: Spacing.three }}>
                {data.top.map((e, i) => (
                  <View key={e._id}>
                    {i > 0 && <Divider inset={58} />}
                    <TransactionRow expense={e} currency={currency} />
                  </View>
                ))}
              </Card>
            </Section>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/ai-plan')}
            style={({ pressed }) => [styles.planRow, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.planIcon, { backgroundColor: theme.primarySoft }]}>
              <EmojiImage name="crystalBall" size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={Fonts.bold}>
                Plan my salary with AI
              </Text>
              <Text variant="caption" color="textSecondary">
                Get a savings goal and budgets in one tap
              </Text>
            </View>
            <Icon name={Icons.forward} size={13} color={theme.textTertiary} />
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function StatTile({ emoji, label, value, caption }: { emoji: EmojiName; label: string; value: string; caption?: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: theme.cardAlt }]}>
        <EmojiImage name={emoji} size={22} />
      </View>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!caption && (
        <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ fontSize: 11 }}>
          {caption}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.four,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three - 4 },
  tile: { width: '48%', flexGrow: 1, gap: 3, padding: Spacing.three },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dash: { width: 18, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', marginLeft: Spacing.two },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three - 4 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
