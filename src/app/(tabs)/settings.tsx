import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/section';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { flagEmoji, getCurrency } from '@/constants/currencies';
import { Fonts, MaxContentWidth, Spacing, TabBarSpace } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMoney, toDateKey } from '@/lib/format';
import { currentCycle, eraseAll, useAccount, useCycles } from '@/lib/store';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  const [submit] = useSubmit();

  if (!account) return null;
  const currency = getCurrency(account.currency);

  function confirmErase() {
    Alert.alert(
      'Erase all data?',
      'This permanently deletes your account, salaries, budgets and expenses. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: () => submit(eraseAll) },
      ],
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: TabBarSpace + insets.bottom },
      ]}>
      <ScreenTitle title="Settings" />

      <Pressable onPress={() => router.push('/edit-profile')}>
        <Card style={styles.account}>
          <View style={[styles.avatar, { backgroundColor: theme.text }]}>
            <Text variant="title" style={{ color: theme.background }}>
              {(account.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">{account.name || 'Your account'}</Text>
            <View style={styles.inline}>
              <Icon name={Icons.device} size={11} color={theme.textSecondary} />
              <Text variant="caption" color="textSecondary">
                Device {account.deviceId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <Text variant="caption" color="textTertiary">
              Member since {formatDateKey(toDateKey(new Date(account._creationTime)))}
            </Text>
          </View>
          <Icon name={Icons.forward} size={13} color={theme.textTertiary} />
        </Card>
      </Pressable>

      <Group title="Preferences">
        <Row
          icon={Icons.globe}
          label="Currency"
          value={`${flagEmoji(currency.country)} ${currency.code}`}
          onPress={() => router.push('/currency')}
        />
        <Row
          icon={Icons.calendar}
          label="Usual payday"
          value={account.payday ? `Day ${account.payday}` : 'Not set'}
          onPress={() => router.push('/edit-profile')}
        />
        <Row
          icon={Icons.target}
          label="Savings goal"
          value={account.savingsGoal ? formatMoney(account.savingsGoal, account.currency) : 'Not set'}
          onPress={() => router.push('/edit-profile')}
        />
      </Group>

      <Group title="Money">
        <Row icon={Icons.budget} label="Category budgets" onPress={() => router.push('/budgets')} />
        <Row icon={Icons.history} label="Salary history" onPress={() => router.push('/history')} />
        <Row icon={Icons.salary} label="Start a new salary cycle" onPress={() => router.push('/salary')} />
        {cycle && (
          <Row
            icon={Icons.edit}
            label="Edit current salary"
            value={formatMoney(cycle.amount, account.currency)}
            onPress={() => router.push({ pathname: '/salary', params: { id: cycle._id } })}
          />
        )}
      </Group>

      <Group title="Data">
        <Row icon={Icons.trash} label="Erase all data" danger onPress={confirmErase} />
      </Group>

      <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
        Salary Survival · Your data syncs securely to the cloud.
      </Text>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: Spacing.two }}>
      <Text variant="overline" color="textSecondary" style={{ marginLeft: Spacing.one }}>
        {title}
      </Text>
      <Card style={{ paddingVertical: Spacing.one, paddingHorizontal: Spacing.three }}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && <Divider inset={48} />}
            {child}
          </View>
        ))}
      </Card>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? theme.dangerSoft : theme.cardAlt }]}>
        <Icon name={icon} size={15} color={color} />
      </View>
      <Text variant="label" style={{ flex: 1, color }}>
        {label}
      </Text>
      {value && (
        <Text variant="caption" color="textSecondary" style={{ fontFamily: Fonts.semibold }}>
          {value}
        </Text>
      )}
      {!danger && <Icon name={Icons.forward} size={12} color={theme.textTertiary} />}
    </Pressable>
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
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
