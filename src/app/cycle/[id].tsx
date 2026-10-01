import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { BalanceHero } from '@/components/balance-hero';
import { HeaderTextButton } from '@/components/header-button';
import { Section } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { Donut, LegendDot } from '@/components/ui/charts';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMoney } from '@/lib/format';
import { currentCycle, summarize, useAccount, useCycles, useExpenses } from '@/lib/store';

export default function CycleScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cycles = useCycles();
  const expenses = useExpenses();
  const currency = useAccount()?.currency ?? 'USD';
  const cycle = cycles?.find((c) => c._id === id);
  const summary = useMemo(
    () => (cycle && expenses ? summarize(cycle, expenses) : null),
    [cycle, expenses],
  );

  if (!cycles || !expenses) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />;
  }

  if (!cycle || !summary) {
    return (
      <Text variant="body" color="textSecondary" style={{ padding: Spacing.four }}>
        This salary cycle no longer exists.
      </Text>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Salary · ${formatDateKey(cycle.receivedOn)}`,
          headerRight: () => (
            <HeaderTextButton
              title="Edit"
              onPress={() => router.push({ pathname: '/salary', params: { id: cycle._id } })}
            />
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <BalanceHero
          cycle={cycle}
          spent={summary.spent}
          currency={currency}
          live={cycle._id === currentCycle(cycles)?._id}
        />

        {summary.spent > 0 && (
          <Section title="By category">
            <Card style={styles.breakdown}>
              <Donut
                size={120}
                stroke={14}
                segments={summary.categories.map((c) => ({
                  key: c.id,
                  value: c.amount,
                  color: getCategory(c.id).color,
                }))}
              />
              <View style={styles.legend}>
                {summary.categories.slice(0, 5).map((c) => (
                  <View key={c.id} style={styles.legendRow}>
                    <LegendDot color={getCategory(c.id).color} />
                    <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                      {getCategory(c.id).label}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {Math.round((c.amount / summary.spent) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Section>
        )}

        <Section title={`Expenses · ${summary.items.length}`}>
          <Card style={{ paddingVertical: Spacing.one }}>
            {summary.items.length === 0 ? (
              <Text variant="body" color="textSecondary" style={{ paddingVertical: Spacing.three }}>
                No expenses in this cycle.
              </Text>
            ) : (
              summary.items.map((e, i) => (
                <View key={e._id}>
                  {i > 0 && <Divider inset={58} />}
                  <TransactionRow expense={e} currency={currency} />
                </View>
              ))
            )}
          </Card>
        </Section>

        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          Total {formatMoney(summary.spent, currency)} across {summary.items.length} expenses
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.gutter,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
