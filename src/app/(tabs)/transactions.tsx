import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ScreenTitle } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Chip, SearchBar, tap } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { Text } from '@/components/ui/text';
import { getCategory, type CategoryId } from '@/constants/categories';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTabTopInset } from '@/hooks/use-tab-top-inset';
import { useTheme } from '@/hooks/use-theme';
import { cycleProgress, groupByDay } from '@/lib/analytics';
import { formatMoney, fromDateKey, shiftDateKey, todayKey } from '@/lib/format';
import { openAddExpense } from '@/lib/limits';
import { currentCycle, expensesFor, useAccount, useCycles, useExpenses, useGameProgress, type Expense } from '@/lib/store';

const QUICK_ADD: { title: string; category: CategoryId; emoji: EmojiName }[] = [
  { title: 'Food', category: 'food', emoji: 'hamburger' },
  { title: 'Groceries', category: 'groceries', emoji: 'cart' },
  { title: 'Cab', category: 'transport', emoji: 'taxi' },
  { title: 'Bills', category: 'bills', emoji: 'zap' },
  { title: 'Rent', category: 'rent', emoji: 'house' },
  { title: 'Shopping', category: 'shopping', emoji: 'handbag' },
  { title: 'Fun', category: 'entertainment', emoji: 'popcorn' },
  { title: 'Health', category: 'health', emoji: 'pill' },
];

function quickAdd(title: string, category: CategoryId) {
  tap();
  openAddExpense({ title, category });
}

export default function TransactionsScreen() {
  const theme = useTheme();
  const topInset = useTabTopInset();
  const currency = useAccount()?.currency ?? 'USD';
  const cycles = useCycles();
  const expenses = useExpenses();
  const game = useGameProgress();
  const cycle = currentCycle(cycles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');

  const items = useMemo(() => (cycle && expenses ? expensesFor(expenses, cycle._id) : []), [cycle, expenses]);
  const usedCategories = useMemo(() => [...new Set(items.map((e) => e.category))], [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (e) =>
        (filter === 'all' || e.category === filter) &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          e.note?.toLowerCase().includes(q) ||
          getCategory(e.category).label.toLowerCase().includes(q)),
    );
  }, [items, query, filter]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const total = items.reduce((s, e) => s + e.amount, 0);
  const elapsed = cycle ? cycleProgress(cycle).elapsed : 1;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.content, { paddingTop: topInset + Spacing.three, paddingBottom: TabBarSpace }]}>
      <ScreenTitle eyebrow="This salary cycle" title="Activity" />

      {expenses === undefined ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.five }} />
      ) : (
        <>
          <Reveal>
            <SummaryCard
              total={total}
              count={items.length}
              perDay={total / Math.max(1, elapsed)}
              items={items}
              currency={currency}
            />
          </Reveal>

          <Reveal index={1}>
            <StreakWeek expenses={expenses} streak={game?.streak ?? 0} />
          </Reveal>

          <Reveal index={2} style={{ gap: Spacing.two }}>
            <Text variant="overline" color="textSecondary" style={{ marginLeft: Spacing.one }}>
              Quick add
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.quickRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add by voice"
                onPress={() => {
                  tap();
                  router.push('/assistant');
                }}
                style={({ pressed }) => [styles.quick, styles.quickVoice, pressed && styles.pressed]}>
                <EmojiImage name="microphone" size={30} />
                <Text variant="caption" style={{ color: Accent.ink, ...Fonts.bold }}>
                  Voice
                </Text>
              </Pressable>
              {QUICK_ADD.map((q) => (
                <Pressable
                  key={q.title}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${q.title}`}
                  onPress={() => quickAdd(q.title, q.category)}
                  style={({ pressed }) => [
                    styles.quick,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      boxShadow: `0 ${pressed ? 1 : 3}px 0 ${theme.border}`,
                      transform: [{ translateY: pressed ? 2 : 0 }],
                    },
                  ]}>
                  <EmojiImage name={q.emoji} size={30} />
                  <Text variant="caption" style={Fonts.semibold}>
                    {q.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Reveal>

          {items.length > 0 && (
            <>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search expenses" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.bleed}
                contentContainerStyle={styles.chips}>
                <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
                {usedCategories.map((id) => (
                  <Chip
                    key={id}
                    label={getCategory(id).label}
                    selected={filter === id}
                    onPress={() => setFilter(filter === id ? 'all' : id)}
                    leading={<EmojiImage name={getCategory(id).emoji} size={16} />}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {items.length === 0 ? (
            <Card style={styles.first}>
              <EmojiImage name="fire" size={56} />
              <Text variant="headline" style={{ textAlign: 'center' }}>
                Your first log starts a streak
              </Text>
              <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', maxWidth: 260 }}>
                Tap a quick add above, or hold the mic and say “coffee 120, cab 80”. Every expense earns XP.
              </Text>
            </Card>
          ) : groups.length === 0 ? (
            <EmptyState icon={Icons.search} title="No matches" body="Try a different search or clear the filter to see everything." />
          ) : (
            groups.map((g, i) => (
              <Reveal key={g.date} index={Math.min(i, 4) + 3} style={{ gap: Spacing.two }}>
                <View style={styles.dayHeader}>
                  <DateBadge date={g.date} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={Fonts.bold}>
                      {g.title}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {g.items.length} {g.items.length === 1 ? 'expense' : 'expenses'}
                    </Text>
                  </View>
                  <Text variant="money">{formatMoney(g.total, currency)}</Text>
                </View>
                <Card style={{ paddingVertical: Spacing.one, paddingHorizontal: Spacing.three }}>
                  {g.items.map((e, j) => (
                    <View key={e._id}>
                      {j > 0 && <Divider inset={58} />}
                      <TransactionRow expense={e} currency={currency} showDate={false} />
                    </View>
                  ))}
                </Card>
              </Reveal>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

/** Dark summary: total this cycle, a few numbers, and a 14-day sparkline. */
function SummaryCard({
  total,
  count,
  perDay,
  items,
  currency,
}: {
  total: number;
  count: number;
  perDay: number;
  items: Expense[];
  currency: string;
}) {
  const theme = useTheme();
  const days = useMemo(() => {
    const today = todayKey();
    const byDay = new Map<string, number>();
    for (const e of items) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount);
    return Array.from({ length: 14 }, (_, i) => byDay.get(shiftDateKey(today, i - 13)) ?? 0);
  }, [items]);
  const max = Math.max(...days, 1);

  return (
    <View
      style={[
        styles.summary,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${Accent.glow} 0%, transparent 55%), radial-gradient(circle at 0% 100%, ${Accent.warmGlow} 0%, transparent 55%)`,
        },
      ]}>
      <View style={styles.summaryTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" style={{ color: theme.heroMuted }}>
            Spent this cycle
          </Text>
          <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.heroText }}>
            {formatMoney(total, currency)}
          </Text>
        </View>
        <View style={styles.spark}>
          {days.map((v, i) => (
            <View
              key={i}
              style={[
                styles.sparkBar,
                {
                  height: 4 + (v / max) * 40,
                  backgroundColor: i === days.length - 1 ? Accent.lime : v > 0 ? 'rgba(198,244,90,0.55)' : 'rgba(255,255,255,0.14)',
                },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.summaryStats}>
        <MiniStat emoji="ledger" label="Expenses" value={String(count)} />
        <MiniStat emoji="coin" label="Per day" value={formatMoney(Math.round(perDay), currency, { compact: true })} />
        <MiniStat
          emoji="zap"
          label="Biggest"
          value={count ? formatMoney(Math.max(...items.map((e) => e.amount)), currency, { compact: true }) : '—'}
        />
      </View>
    </View>
  );
}

function MiniStat({ emoji, label, value }: { emoji: EmojiName; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.miniStat}>
      <EmojiImage name={emoji} size={18} />
      <View>
        <Text variant="caption" style={{ color: theme.heroMuted, fontSize: 10, lineHeight: 13 }}>
          {label}
        </Text>
        <Text variant="label" numberOfLines={1} style={{ color: theme.heroText, ...Fonts.bold }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/** The last seven days; days with something logged light up with a flame. */
function StreakWeek({ expenses, streak }: { expenses: Expense[]; streak: number }) {
  const theme = useTheme();
  const today = todayKey();
  const logged = useMemo(() => new Set(expenses.map((e) => e.date)), [expenses]);
  const days = Array.from({ length: 7 }, (_, i) => shiftDateKey(today, i - 6));

  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={styles.streakHead}>
        <View style={{ flex: 1 }}>
          <Text variant="label" style={Fonts.bold}>
            This week
          </Text>
          <Text variant="caption" color="textSecondary">
            {logged.has(today) ? 'Logged today. Streak is safe.' : 'Log today to keep your streak going.'}
          </Text>
        </View>
        <View style={[styles.streakPill, { backgroundColor: streak > 0 ? theme.fireSoft : theme.cardAlt }]}>
          <EmojiImage name="fire" size={16} />
          <Text variant="caption" style={{ ...Fonts.extrabold, color: streak > 0 ? theme.fire : theme.textSecondary }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>
      <View style={styles.week}>
        {days.map((d) => {
          const on = logged.has(d);
          const isToday = d === today;
          return (
            <View key={d} style={styles.weekDay}>
              <Text variant="caption" style={{ fontSize: 10, color: isToday ? theme.text : theme.textTertiary, ...Fonts.bold }}>
                {fromDateKey(d).toLocaleDateString('en-US', { weekday: 'narrow' })}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: on ? theme.fireSoft : theme.cardAlt,
                    borderColor: isToday ? theme.fire : 'transparent',
                  },
                ]}>
                {on ? (
                  <EmojiImage name="fire" size={20} />
                ) : (
                  <Text variant="caption" style={{ color: theme.textTertiary, ...Fonts.bold }}>
                    {fromDateKey(d).getDate()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function DateBadge({ date }: { date: string }) {
  const theme = useTheme();
  const d = fromDateKey(date);
  return (
    <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.badgeMonth, { color: theme.fire }]}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
      <Text style={[styles.badgeDay, { color: theme.text }]}>{d.getDate()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.three,
  },
  bleed: { marginHorizontal: -Spacing.gutter },
  pressed: { opacity: 0.7 },
  summary: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
    boxShadow: '0 14px 34px rgba(22, 20, 15, 0.26)',
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44 },
  sparkBar: { width: 5, borderRadius: 2.5 },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: { gap: Spacing.two + 2, paddingHorizontal: Spacing.gutter, paddingBottom: 4 },
  quick: {
    width: 76,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickVoice: { backgroundColor: Accent.lime, borderColor: Accent.lime, boxShadow: '0 3px 0 #86AD2E' },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.gutter },
  first: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.two,
  },
  badge: {
    width: 42,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMonth: { ...Fonts.extrabold, fontSize: 9, lineHeight: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeDay: { ...Fonts.extrabold, fontSize: 18, lineHeight: 22 },
});
