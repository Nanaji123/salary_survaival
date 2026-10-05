import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Categories, PaymentMethods, type CategoryId, type PaymentMethod } from '@/constants/categories';
import { flagEmoji, getCurrency } from '@/constants/currencies';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  currencySymbol,
  formatDateKey,
  sanitizeAmountInput,
  shiftDateKey,
  todayKey,
} from '@/lib/format';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" color="textSecondary" style={styles.label}>
      {children}
    </Text>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

export function Field({ label, style, ...rest }: FieldProps) {
  const theme = useTheme();
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        placeholderTextColor={theme.textTertiary}
        selectionColor={theme.primary}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }, style]}
        {...rest}
      />
    </View>
  );
}

/** Large, centered money input used for salary and expense amounts. */
export function AmountField({
  value,
  onChangeText,
  currency,
  autoFocus,
  label,
  footer,
}: {
  value: string;
  onChangeText: (text: string) => void;
  currency: string;
  autoFocus?: boolean;
  label: string;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.amountBox}>
      <Text variant="overline" color="textSecondary">
        {label}
      </Text>
      <View style={styles.amountRow}>
        <Text style={[styles.amountSymbol, { color: theme.textTertiary }]}>
          {currencySymbol(currency)}
        </Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          selectionColor={theme.primary}
          autoFocus={autoFocus}
          maxLength={12}
          accessibilityLabel={label}
          style={[styles.amountInput, { color: theme.text }]}
        />
      </View>
      {footer}
    </View>
  );
}

export function DateStepper({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (key: string) => void;
  label: string;
}) {
  const theme = useTheme();
  const isToday = value >= todayKey();
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View style={[styles.stepper, { backgroundColor: theme.card }]}>
        <RoundButton
          icon={Icons.back}
          label="Previous day"
          onPress={() => {
            tap();
            onChange(shiftDateKey(value, -1));
          }}
        />
        <View style={styles.stepperCenter}>
          <Icon name={Icons.calendar} size={15} color={theme.primaryInk} />
          <Text variant="label">{formatDateKey(value, 'long')}</Text>
        </View>
        <RoundButton
          icon={Icons.forward}
          label="Next day"
          disabled={isToday}
          onPress={() => {
            tap();
            onChange(shiftDateKey(value, 1));
          }}
        />
      </View>
    </View>
  );
}

export function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  size = 36,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.cardAlt,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} size={size * 0.42} color={theme.text} />
    </Pressable>
  );
}

/** Four-column grid of category tiles. */
export function CategoryGrid({
  value,
  onChange,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
}) {
  const theme = useTheme();
  return (
    <View>
      <FieldLabel>Category</FieldLabel>
      <View style={[styles.categoryGrid, { backgroundColor: theme.card }]}>
        {Categories.map((c) => {
          const selected = c.id === value;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={c.label}
              onPress={() => {
                tap();
                onChange(c.id);
              }}
              style={({ pressed }) => [
                styles.categoryTile,
                selected && { backgroundColor: theme.cardAlt },
                pressed && { opacity: 0.6 },
              ]}>
              <View style={[styles.categoryRing, { borderColor: selected ? c.color : 'transparent' }]}>
                <CategoryIcon id={c.id} size={44} />
              </View>
              <Text
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.categoryLabel,
                  { color: selected ? theme.text : theme.textSecondary },
                  selected && { ...Fonts.bold },
                ]}>
                {c.label.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const theme = useTheme();
  return (
    <View>
      <FieldLabel>Paid with</FieldLabel>
      <View style={styles.methods}>
        {PaymentMethods.map((m) => {
          const selected = m.id === value;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={m.label}
              onPress={() => {
                tap();
                onChange(m.id);
              }}
              style={[styles.method, { backgroundColor: selected ? theme.text : theme.card }]}>
              <Icon name={m.icon} size={14} color={selected ? theme.background : theme.textSecondary} />
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ ...Fonts.semibold, color: selected ? theme.background : theme.text }}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Tappable row that opens the currency picker. */
export function CurrencySelect({
  code,
  onPress,
  label = 'Currency',
}: {
  code: string;
  onPress: () => void;
  label?: string;
}) {
  const c = getCurrency(code);
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <SelectRow
        onPress={onPress}
        leading={<Text style={styles.flag}>{flagEmoji(c.country)}</Text>}
        title={c.name}
        subtitle={`${c.code} · ${c.symbol}`}
      />
    </View>
  );
}

export function SelectRow({
  leading,
  title,
  subtitle,
  onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.select, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text variant="label">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        )}
      </View>
      <Icon name={Icons.down} size={14} color={theme.textTertiary} />
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.card }]}>
      <Icon name={Icons.search} size={16} color={theme.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        selectionColor={theme.primary}
        autoFocus={autoFocus}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={[styles.searchInput, { color: theme.text }]}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: selected ? theme.text : theme.card }]}>
      {leading}
      <Text variant="caption" style={{ ...Fonts.semibold, color: selected ? theme.background : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Calendar-style grid (7 columns) for picking the usual payday. */
export function PaydayPicker({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const theme = useTheme();
  const suffix = value % 10 === 1 && value !== 11 ? 'st' : value % 10 === 2 && value !== 12 ? 'nd' : value % 10 === 3 && value !== 13 ? 'rd' : 'th';
  return (
    <View>
      <FieldLabel>Usual payday</FieldLabel>
      <View style={[styles.paydayHero, { backgroundColor: theme.hero }]}>
        <View style={[styles.paydayIcon, { backgroundColor: theme.heroAccent }]}>
          <Icon name={Icons.calendar} size={20} color="#0E1116" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.paydayBig, { color: theme.heroText }]}>
            {value}
            <Text style={[styles.paydaySuffix, { color: theme.heroAccent }]}>{suffix}</Text>
            <Text style={[styles.paydayOf, { color: theme.heroMuted }]}> of every month</Text>
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            We count down to this day and plan your daily limit around it.
          </Text>
        </View>
      </View>
      <View style={[styles.calendar, { backgroundColor: theme.card }]}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
          const selected = d === value;
          return (
            <View key={d} style={styles.dayCell}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Day ${d}`}
                onPress={() => {
                  tap();
                  onChange(d);
                }}
                style={({ pressed }) => [
                  styles.day,
                  { backgroundColor: selected ? theme.primary : 'transparent', opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text
                  variant="label"
                  style={{ color: selected ? theme.onPrimary : theme.text, ...(selected ? Fonts.bold : Fonts.medium) }}>
                  {d}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {value >= 29 && (
        <Text variant="caption" color="textSecondary" style={{ marginTop: Spacing.two, marginLeft: Spacing.one }}>
          In shorter months this falls on the last day.
        </Text>
      )}
    </View>
  );
}

/** Scrollable form body that stays clear of the keyboard. */
export function FormScroll({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.formScroll}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },
  input: {
    height: 54,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    ...Fonts.medium,
  },
  amountBox: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  amountSymbol: {
    ...Fonts.bold,
    fontSize: 30,
    lineHeight: 40,
  },
  amountInput: {
    ...Fonts.extrabold,
    fontSize: 54,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    padding: 0,
    textAlign: 'center',
  },
  stepper: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 11,
  },
  stepperCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.two,
  },
  categoryTile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: Radius.md,
  },
  categoryRing: {
    borderWidth: 2,
    borderRadius: 18,
    padding: 2,
  },
  categoryLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  methods: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  method: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  select: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  flag: {
    fontSize: 28,
    lineHeight: 34,
  },
  search: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    ...Fonts.medium,
    padding: 0,
  },
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.two,
    marginTop: Spacing.two,
  },
  paydayHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  paydayIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paydayBig: {
    ...Fonts.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  paydaySuffix: {
    ...Fonts.extrabold,
    fontSize: 18,
  },
  paydayOf: {
    ...Fonts.semibold,
    fontSize: 15,
    letterSpacing: 0,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
  },
  day: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
});
