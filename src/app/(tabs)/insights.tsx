import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiSummaryCard } from '@/components/ai-summary-card';
import { EmptyState, expenseSuggestions } from '@/components/empty-state';
import { ScreenTitle, Section } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import {
  BarChart,
  Donut,
  Gauge,
  GroupedBars,
  LegendDot,
  ProgressBar,
  StackedBar,
  TrendChart,
} from '@/components/ui/charts';
import { Divider } from '@/components/ui/divider';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { Text } from '@/components/ui/text';
import { getCategory, PaymentMethods } from '@/constants/categories';
import { Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  biggestExpense,
  cumulativeSpending,
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
  cash: '#3E9A5C',
  card: '#5B5BD6',
  bank: '#2F8AC4',
  wallet: '#E0703A',
};

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const currency = account?.currency ?? 'USD';
  const budgets = useBudgets();
  const cycles = useCycles();
  const expenses = useExpenses();
  const cycle = currentCycle(cycles);

  const data = useMemo(() => {
    if (!cycle || !cycles || !expenses) return null;
    const summary = summarize(cycle, expenses);
    const progress = cycleProgress(cycle);
    const avg = summary.spent / Math.max(1, progress.elapsed);
    const weekdays = weekdaySpending(cycle, expenses);
    const busiest = weekdays.reduce((m, d) => (d.total > m.total ? d : m), weekdays[0]);
    return {
      summary,
      progress,
      avg,
      projected: avg * progress.total,
      safePerDay: Math.max(0, summary.remaining) / progress.daysLeft,
      daily: dailySpending(cycle, expenses),
      cumulative: cumulativeSpending(cycle, expenses),
      weekdays,
      busiest: busiest.total > 0 ? busiest : null,
      methods: methodSplit(cycle, expenses),
      history: cycleHistory(cycles, expenses),
      biggest: biggestExpense(cycle, expenses),
      top: summary.items.slice().sort((a, b) => b.amount - a.amount).slice(0, 3),
      notes: insights(cycle, expenses, cycles[1] ?? null),
    };
  }, [cycle, cycles, expenses]);

  const compact = (v: number) => formatMoney(Math.round(v), currency, { compact: true });

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: TabBarSpace + insets.bottom },
      ]}>
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
          <Reveal>
            <Hero
              spent={data.summary.spent}
              salary={cycle.amount}
              ratio={data.summary.ratio}
              avg={data.avg}
              safePerDay={data.safePerDay}
              projected={data.projected}
              daysLeft={data.progress.daysLeft}
              currency={currency}
            />
          </Reveal>

          <Reveal index={1}>
            <AiSummaryCard key={cycle._id} account={account} cycle={cycle} expenses={expenses ?? []} budgets={budgets ?? []} />
          </Reveal>

          <Reveal index={2}>
            <View style={styles.tiles}>
              <StatTile icon={Icons.receipt} label="Transactions" value={String(data.summary.items.length)} />
              <StatTile
                icon={Icons.pie}
                label="Top category"
                value={data.summary.categories[0] ? getCategory(data.summary.categories[0].id).label : '—'}
              />
              <StatTile
                icon={Icons.trendUp}
                label="Biggest expense"
                value={data.biggest ? formatMoney(data.biggest.amount, currency) : '—'}
                caption={data.biggest?.title}
              />
              <StatTile icon={Icons.calendar} label="Busiest day" value={data.busiest ? data.busiest.label : '—'} caption={data.busiest ? `${compact(data.busiest.total)} in total` : undefined} />
            </View>
          </Reveal>

          {data.summary.spent > 0 && (
            <Reveal index={3}>
              <Section title="Spending pace">
                <Card style={{ gap: Spacing.three }}>
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
                      Even pace to payday
                    </Text>
                  </View>
                </Card>
              </Section>
            </Reveal>
          )}

          <Reveal index={4}>
            <Section title="Daily spending">
              <Card>
                <BarChart
                  data={data.daily.map((d) => ({ label: String(fromDateKey(d.date).getDate()), value: d.amount }))}
                  color={theme.primary}
                  highlightIndex={data.daily.length - 1}
                  highlightColor={theme.text}
                  formatValue={compact}
                  maxLabels={7}
                />
              </Card>
            </Section>
          </Reveal>

          <Reveal index={5}>
            <Section title="By category">
              <Card style={{ gap: Spacing.four }}>
                {data.summary.spent > 0 ? (
                  <>
                    <View style={{ alignItems: 'center' }}>
                      <Donut
                        segments={data.summary.categories.map((c) => ({
                          key: c.id,
                          value: c.amount,
                          color: getCategory(c.id).color,
                        }))}>
                        <Text variant="caption" color="textSecondary">
                          Total spent
                        </Text>
                        <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 110 }}>
                          {formatMoney(data.summary.spent, currency)}
                        </Text>
                      </Donut>
                    </View>
                    <View style={{ gap: Spacing.three }}>
                      {data.summary.categories.map((c) => {
                        const cat = getCategory(c.id);
                        const share = c.amount / data.summary.spent;
                        return (
                          <View key={c.id} style={{ gap: 6 }}>
                            <View style={styles.legendRow}>
                              <CategoryIcon id={c.id} size={30} />
                              <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                                {cat.label}
                              </Text>
                              <Text variant="caption" color="textSecondary" style={styles.percent}>
                                {Math.round(share * 100)}%
                              </Text>
                              <Text variant="money" style={styles.legendAmount}>
                                {formatMoney(c.amount, currency)}
                              </Text>
                            </View>
                            <ProgressBar value={share} color={cat.color} height={5} />
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <EmptyState
                    icon={Icons.pie}
                    title="No spending yet"
                    body="Your category breakdown shows up after your first expense."
                    suggestions={expenseSuggestions().slice(0, 3)}
                    suggestionsTitle="Quick add"
                  />
                )}
              </Card>
            </Section>
          </Reveal>

          {data.summary.spent > 0 && (
            <Reveal index={6}>
              <Section title="Your week">
                <Card style={{ gap: Spacing.three }}>
                  <BarChart
                    data={data.weekdays.map((d) => ({ label: d.label, value: d.average }))}
                    color={theme.primary}
                    highlightIndex={data.busiest ? data.weekdays.findIndex((d) => d.label === data.busiest!.label) : undefined}
                    highlightColor={theme.text}
                    formatValue={compact}
                    maxLabels={7}
                    height={120}
                  />
                  <Text variant="caption" color="textSecondary">
                    {data.busiest
                      ? `Average per day. ${data.busiest.label} is where most of your money goes.`
                      : 'Average spend per weekday.'}
                  </Text>
                </Card>
              </Section>
            </Reveal>
          )}

          {data.methods.length > 0 && (
            <Reveal index={7}>
              <Section title="How you pay">
                <Card style={{ gap: Spacing.three }}>
                  <StackedBar segments={data.methods.map((m) => ({ key: m.method, value: m.amount, color: METHOD_COLORS[m.method] ?? theme.textTertiary }))} />
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

          {data.top.length > 0 && (
            <Reveal index={8}>
              <Section title="Biggest expenses">
                <Card style={{ paddingVertical: Spacing.one }}>
                  {data.top.map((e, i) => (
                    <View key={e._id}>
                      {i > 0 && <Divider inset={58} />}
                      <TransactionRow expense={e} currency={currency} />
                    </View>
                  ))}
                </Card>
              </Section>
            </Reveal>
          )}

          {data.history.length > 1 && (
            <Reveal index={9}>
              <Section title="Salary cycles">
                <Card style={{ gap: Spacing.three }}>
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

          {data.notes.length > 0 && (
            <Reveal index={10}>
              <Section title="What we noticed">
                <View style={{ gap: Spacing.two }}>
                  {data.notes.map((n, i) => {
                    const tone =
                      n.tone === 'good'
                        ? { bg: theme.primarySoft, fg: theme.primaryInk, icon: Icons.checkCircle }
                        : n.tone === 'warn'
                          ? { bg: theme.warningSoft, fg: theme.warning, icon: Icons.alert }
                          : { bg: theme.card, fg: theme.textSecondary, icon: Icons.bulb };
                    return (
                      <View key={i} style={[styles.note, { backgroundColor: tone.bg }]}>
                        <Icon name={tone.icon} size={16} color={tone.fg} />
                        <Text variant="body" style={{ flex: 1 }}>
                          {n.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Section>
            </Reveal>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/ai-plan')}
            style={({ pressed }) => [styles.planRow, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.tileIcon, { backgroundColor: theme.primarySoft, marginBottom: 0 }]}>
              <Icon name={Icons.wand} size={15} color={theme.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">Plan my salary with AI</Text>
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

/** Dark summary card: how much of the salary is gone, and whether the pace will last to payday. */
function Hero({
  spent,
  salary,
  ratio,
  avg,
  safePerDay,
  projected,
  daysLeft,
  currency,
}: {
  spent: number;
  salary: number;
  ratio: number;
  avg: number;
  safePerDay: number;
  projected: number;
  daysLeft: number;
  currency: string;
}) {
  const theme = useTheme();
  const over = spent > salary;
  const pace = spent === 0 ? 'ok' : over ? 'over' : projected > salary ? 'fast' : 'ok';
  const status = {
    ok: { label: spent === 0 ? 'No spending yet' : 'On track', color: theme.heroAccent },
    fast: { label: 'Spending fast', color: '#FFB84D' },
    over: { label: 'Over salary', color: theme.danger },
  }[pace];

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(75,227,176,0.28) 0%, transparent 55%), radial-gradient(circle at 0% 100%, rgba(91,91,214,0.2) 0%, transparent 50%)',
        },
      ]}>
      <View style={styles.heroTop}>
        <Text variant="overline" style={{ color: theme.heroMuted }}>
          Spent this cycle
        </Text>
        <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: Fonts.semibold }}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.gaugeWrap}>
        <Gauge value={ratio} size={230} stroke={16} color={over ? theme.danger : theme.heroAccent} track="rgba(255,255,255,0.12)" />
        <View style={styles.gaugeCenter}>
          <Text variant="display" style={{ color: theme.heroText, fontSize: 34, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(spent, currency)}
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            of {formatMoney(salary, currency)} · {Math.round(Math.min(ratio, 9.99) * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.heroStats}>
        <HeroStat label="Average / day" value={formatMoney(Math.round(avg), currency, { compact: true })} />
        <View style={styles.heroDivider} />
        <HeroStat label="Safe / day" value={formatMoney(Math.round(safePerDay), currency, { compact: true })} accent={theme.heroAccent} />
        <View style={styles.heroDivider} />
        <HeroStat
          label="Projected"
          value={formatMoney(Math.round(projected), currency, { compact: true })}
          accent={projected > salary ? '#FFB84D' : undefined}
        />
      </View>
      <Text variant="caption" style={{ color: theme.heroMuted, textAlign: 'center' }}>
        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} until payday
      </Text>
    </View>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="headline" style={{ color: accent ?? '#FFFFFF' }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function StatTile({ icon, label, value, caption }: { icon: IconName; label: string; value: string; caption?: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: theme.cardAlt }]}>
        <Icon name={icon} size={15} color={theme.text} />
      </View>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {caption && (
        <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ fontSize: 12 }}>
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
  hero: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  gaugeWrap: { alignItems: 'center', height: 138, justifyContent: 'flex-end' },
  gaugeCenter: { position: 'absolute', bottom: 2, alignItems: 'center', width: 170 },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three - 4,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    gap: 4,
    padding: Spacing.three,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  percent: {
    width: 38,
    textAlign: 'right',
    fontFamily: Fonts.semibold,
  },
  legendAmount: {
    minWidth: 84,
    textAlign: 'right',
  },
  legendInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dash: {
    width: 18,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    marginLeft: Spacing.two,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
});
