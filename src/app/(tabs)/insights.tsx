import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTitle, Section } from '@/components/section';
import { Card } from '@/components/ui/card';
import { BarChart, Donut, GroupedBars, LegendDot } from '@/components/ui/charts';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { biggestExpense, cycleHistory, cycleProgress, dailySpending, insights } from '@/lib/analytics';
import { formatMoney, fromDateKey } from '@/lib/format';
import { currentCycle, summarize, useAccount, useCycles, useExpenses } from '@/lib/store';

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const currency = useAccount()?.currency ?? 'USD';
  const cycles = useCycles();
  const expenses = useExpenses();
  const cycle = currentCycle(cycles);

  const data = useMemo(() => {
    if (!cycle || !cycles || !expenses) return null;
    const summary = summarize(cycle, expenses);
    const progress = cycleProgress(cycle);
    return {
      summary,
      daily: dailySpending(cycle, expenses),
      history: cycleHistory(cycles, expenses),
      biggest: biggestExpense(cycle, expenses),
      avg: summary.spent / Math.max(1, progress.elapsed),
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

      {!data ? (
        cycles === undefined || expenses === undefined ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />
        ) : (
          <Text variant="body" color="textSecondary">
            Add a salary to see your insights.
          </Text>
        )
      ) : (
        <>
          <View style={styles.tiles}>
            <StatTile icon={Icons.calendar} label="Average / day" value={formatMoney(Math.round(data.avg), currency)} />
            <StatTile
              icon={Icons.trendUp}
              label="Biggest expense"
              value={data.biggest ? formatMoney(data.biggest.amount, currency) : '—'}
              caption={data.biggest?.title}
            />
            <StatTile
              icon={Icons.pie}
              label="Top category"
              value={data.summary.categories[0] ? getCategory(data.summary.categories[0].id).label : '—'}
            />
            <StatTile icon={Icons.receipt} label="Transactions" value={String(data.summary.items.length)} />
          </View>

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

          <Section title="By category">
            <Card style={{ alignItems: 'center', gap: Spacing.four }}>
              {data.summary.spent > 0 ? (
                <>
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
                  <View style={styles.legend}>
                    {data.summary.categories.map((c) => (
                      <View key={c.id} style={styles.legendRow}>
                        <LegendDot color={getCategory(c.id).color} />
                        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                          {getCategory(c.id).label}
                        </Text>
                        <Text variant="caption" color="textSecondary" style={styles.percent}>
                          {Math.round((c.amount / data.summary.spent) * 100)}%
                        </Text>
                        <Text variant="money" style={styles.legendAmount}>
                          {formatMoney(c.amount, currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text variant="body" color="textSecondary">
                  No spending yet this cycle.
                </Text>
              )}
            </Card>
          </Section>

          {data.history.length > 0 && (
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
          )}

          {data.notes.length > 0 && (
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
          )}
        </>
      )}
    </ScrollView>
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
  legend: {
    alignSelf: 'stretch',
    gap: 12,
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
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
