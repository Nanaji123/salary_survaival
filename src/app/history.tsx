import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMoney } from '@/lib/format';
import { summarize, useAccount, useCycles, useExpenses } from '@/lib/store';

export default function HistoryScreen() {
  const theme = useTheme();
  const cycles = useCycles();
  const expenses = useExpenses();
  const currency = useAccount()?.currency ?? 'INR';
  const rows = useMemo(
    () =>
      cycles && expenses ? cycles.map((c) => ({ cycle: c, ...summarize(c, expenses) })) : [],
    [cycles, expenses],
  );
  const totalSaved = rows.slice(1).reduce((sum, r) => sum + Math.max(0, r.remaining), 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      {rows.length > 1 && (
        <Card style={styles.total}>
          <Text variant="overline" color="textSecondary">
            Saved from past salaries
          </Text>
          <Text variant="display" color="primary">
            {formatMoney(totalSaved, currency)}
          </Text>
        </Card>
      )}

      {cycles !== undefined && rows.length === 0 && (
        <EmptyState
          icon={Icons.history}
          title="No salaries yet"
          body="Each salary you log starts a cycle. Past cycles and how much you saved appear here."
          suggestions={[
            { label: 'Add salary', icon: Icons.salary, onPress: () => router.push('/salary') },
            { label: 'Say it with voice', icon: Icons.mic, onPress: () => router.push('/assistant') },
          ]}
          suggestionsTitle="Get started"
        />
      )}

      {rows.map((r, i) => (
        <Pressable
          key={r.cycle._id}
          onPress={() => router.push({ pathname: '/cycle/[id]', params: { id: r.cycle._id } })}
          style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Card style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowTitle}>
                <Text variant="headline">{formatDateKey(r.cycle.receivedOn)}</Text>
                {i === 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
                    <Text variant="overline" color="primaryInk">
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Icon name={Icons.forward} size={14} color={theme.textTertiary} />
            </View>
            {r.cycle.note && (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {r.cycle.note}
              </Text>
            )}
            <View style={[styles.track, { backgroundColor: theme.cardAlt }]}>
              <View
                style={{
                  width: `${Math.min(r.ratio, 1) * 100}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor: r.remaining < 0 ? theme.danger : theme.primary,
                }}
              />
            </View>
            <View style={styles.figures}>
              <Figure label="Salary" value={formatMoney(r.cycle.amount, currency)} />
              <Figure label="Spent" value={formatMoney(r.spent, currency)} />
              <Figure
                label={r.remaining < 0 ? 'Over' : 'Left'}
                value={formatMoney(Math.abs(r.remaining), currency)}
                color={r.remaining < 0 ? theme.danger : theme.primaryInk}
              />
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.figure}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text
        variant="label"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.figureValue, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  total: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  row: {
    gap: Spacing.two,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: Spacing.one,
  },
  figures: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  figure: {
    flex: 1,
    gap: 2,
  },
  figureValue: {
    ...Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
});
