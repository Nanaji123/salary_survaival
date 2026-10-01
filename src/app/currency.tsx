import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { SearchBar } from '@/components/ui/form';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  AllCurrencies,
  flagEmoji,
  getCurrency,
  PopularCurrencyCodes,
  searchCurrencies,
  type Currency,
} from '@/constants/currencies';
import { Spacing } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { updateAccount, useAccount } from '@/lib/store';

type Row = { type: 'header'; title: string } | { type: 'currency'; currency: Currency };

/** Searchable list of every world currency; saves the choice to the account. */
export default function CurrencyScreen() {
  const theme = useTheme();
  const account = useAccount();
  const [query, setQuery] = useState('');
  const [submit] = useSubmit();
  const selected = account?.currency;

  const rows = useMemo<Row[]>(() => {
    if (query.trim()) {
      return searchCurrencies(query).map((currency) => ({ type: 'currency', currency }));
    }
    return [
      { type: 'header', title: 'Popular' },
      ...PopularCurrencyCodes.map((c) => ({ type: 'currency' as const, currency: getCurrency(c) })),
      { type: 'header', title: `All currencies · ${AllCurrencies.length}` },
      ...AllCurrencies.map((currency) => ({ type: 'currency' as const, currency })),
    ];
  }, [query]);

  async function choose(code: string) {
    if (code !== selected) await submit(() => updateAccount({ currency: code }));
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by country, name or code" />
      </View>
      <FlatList
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        keyExtractor={(r, i) => (r.type === 'header' ? `h-${r.title}` : `${r.currency.code}-${i}`)}
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={styles.empty}>
            No currency matches “{query}”.
          </Text>
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Text variant="overline" color="textSecondary" style={styles.header}>
              {item.title}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: item.currency.code === selected }}
              accessibilityLabel={`${item.currency.name}, ${item.currency.code}`}
              onPress={() => choose(item.currency.code)}
              style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Card
                style={[
                  styles.row,
                  item.currency.code === selected && { borderWidth: 1.5, borderColor: theme.primary },
                ]}>
                <Text style={styles.flag}>{flagEmoji(item.currency.country)}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>
                    {item.currency.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {item.currency.code}
                  </Text>
                </View>
                <Text variant="headline" color="textSecondary">
                  {item.currency.symbol}
                </Text>
                {item.currency.code === selected && (
                  <Icon name={Icons.checkCircle} size={20} color={theme.primary} />
                )}
              </Card>
            </Pressable>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  header: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    marginLeft: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  flag: {
    fontSize: 28,
    lineHeight: 34,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
