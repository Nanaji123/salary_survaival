import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CategoryId } from '@/constants/categories';
import { requirePro } from '@/lib/subscription';

import { tap } from '@/components/ui/form';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Suggestion = { label: string; icon?: IconName; onPress: () => void };

function addExpense(title: string, category: CategoryId) {
  if (requirePro()) router.push({ pathname: '/expense', params: { title, category } });
}

/** Quick-start suggestions for screens that have no expenses yet. */
export function expenseSuggestions(): Suggestion[] {
  return [
    { label: 'Say it with voice', icon: Icons.mic, onPress: () => router.push('/assistant') },
    { label: 'Coffee', icon: Icons.add, onPress: () => addExpense('Coffee', 'food') },
    { label: 'Groceries', icon: Icons.add, onPress: () => addExpense('Groceries', 'groceries') },
    { label: 'Fuel / Cab', icon: Icons.add, onPress: () => addExpense('Fuel', 'transport') },
    { label: 'Rent', icon: Icons.add, onPress: () => addExpense('Rent', 'rent') },
    { label: 'Electricity bill', icon: Icons.add, onPress: () => addExpense('Electricity bill', 'bills') },
  ];
}

/**
 * Friendly empty state: a soft icon, a short explanation and tappable suggestions
 * so a blank screen always shows the next step.
 */
export function EmptyState({
  icon,
  title,
  body,
  suggestions = [],
  suggestionsTitle = 'Try one of these',
}: {
  icon: IconName;
  title: string;
  body: string;
  suggestions?: Suggestion[];
  suggestionsTitle?: string;
}) {
  const theme = useTheme();
  return (
    <Reveal style={styles.wrap}>
      <View style={[styles.halo, { backgroundColor: theme.primarySoft }]}>
        <View style={[styles.iconTile, { backgroundColor: theme.primary }]}>
          <Icon name={icon} size={26} color={theme.onPrimary} />
        </View>
      </View>
      <Text variant="headline" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.body}>
        {body}
      </Text>
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <Text variant="overline" color="textTertiary">
            {suggestionsTitle}
          </Text>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable
                key={s.label}
                accessibilityRole="button"
                onPress={() => {
                  tap();
                  s.onPress();
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Icon name={s.icon ?? Icons.add} size={13} color={theme.primaryInk} />
                <Text variant="caption" style={{ fontFamily: Fonts.semibold }}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Reveal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  halo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  suggestions: {
    alignItems: 'center',
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
