import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, expenseSuggestions } from '@/components/empty-state';
import { ScreenTitle } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Chip, SearchBar } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory, type CategoryId } from '@/constants/categories';
import { MaxContentWidth, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupByDay } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { currentCycle, expensesFor, useAccount, useCycles, useExpenses } from '@/lib/store';

export default function TransactionsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const currency = useAccount()?.currency ?? 'USD';
  const cycles = useCycles();
  const expenses = useExpenses();
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
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: TabBarSpace + insets.bottom },
      ]}>
      <ScreenTitle eyebrow="This salary cycle" title="Activity" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search expenses" />

      {usedCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {usedCategories.map((id) => (
            <Chip
              key={id}
              label={getCategory(id).label}
              selected={filter === id}
              onPress={() => setFilter(filter === id ? 'all' : id)}
              leading={<View style={[styles.dot, { backgroundColor: getCategory(id).color }]} />}
            />
          ))}
        </ScrollView>
      )}

      {expenses === undefined ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.five }} />
      ) : groups.length === 0 ? (
        query || filter !== 'all' ? (
          <EmptyState
            icon={Icons.search}
            title="No matches"
            body="Try a different search or clear the filter to see everything."
          />
        ) : (
          <EmptyState
            icon={Icons.receipt}
            title="No expenses yet"
            body="Every expense you log shows up here, grouped by day. Start with one tap, or just say it."
            suggestions={expenseSuggestions()}
            suggestionsTitle="Quick add"
          />
        )
      ) : (
        <>
          <View style={styles.totalRow}>
            <Text variant="caption" color="textSecondary">
              {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
            </Text>
            <Text variant="money">{formatMoney(total, currency)}</Text>
          </View>
          {groups.map((g) => (
            <View key={g.date} style={{ gap: Spacing.two }}>
              <View style={styles.dayHeader}>
                <Text variant="overline" color="textSecondary">
                  {g.title}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {formatMoney(g.total, currency)}
                </Text>
              </View>
              <Card style={{ paddingVertical: Spacing.one }}>
                {g.items.map((e, i) => (
                  <View key={e._id}>
                    {i > 0 && <Divider inset={58} />}
                    <TransactionRow expense={e} currency={currency} showDate={false} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </>
      )}
    </ScrollView>
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
  chipsScroll: {
    marginHorizontal: -Spacing.gutter,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.gutter,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.two,
  },
});
