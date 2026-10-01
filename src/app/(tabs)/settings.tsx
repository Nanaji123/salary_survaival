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
import { currentCycle, eraseAll, signOut, useAccount, useCycles } from '@/lib/store';
import { manageSubscription, purchasesSupported, requirePro, restore, useIsPro } from '@/lib/subscription';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  const [submit] = useSubmit();
  const isPro = useIsPro();

  if (!account) return null;

  async function onRestore() {
    try {
      const ok = await restore();
      Alert.alert(
        ok ? 'Purchases restored' : 'Nothing to restore',
        ok ? 'Salary Survival Pro is active.' : 'We could not find an active subscription for this account.',
      );
    } catch {
      Alert.alert('Restore failed', 'Please check your connection and try again.');
    }
  }
  const currency = getCurrency(account.currency);

  function confirmLogout() {
    Alert.alert('Log out?', 'Your data stays safe in the cloud. Tap Get Started on this device to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

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
            <Text variant="caption" color="textSecondary">
              Member since {formatDateKey(toDateKey(new Date(account._creationTime)))}
            </Text>
          </View>
          <Icon name={Icons.forward} size={13} color={theme.textTertiary} />
        </Card>
      </Pressable>

      <Pressable onPress={() => (isPro ? manageSubscription().catch(() => {}) : router.push('/paywall'))}>
        <View style={[styles.pro, { backgroundColor: theme.hero }]}>
          <View style={styles.proIcon}>
            <Icon name={Icons.sparkles} size={18} color={theme.hero} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline" style={{ color: theme.heroText }}>
              {isPro ? 'Salary Survival Pro' : 'Upgrade to Pro'}
            </Text>
            <Text variant="caption" style={{ color: theme.heroMuted }}>
              {isPro ? 'Active · Manage subscription' : 'Unlock expenses, budgets and insights.'}
            </Text>
          </View>
          <Icon name={Icons.forward} size={13} color={theme.heroMuted} />
        </View>
      </Pressable>

      <View style={styles.tiles}>
        <PlanTile
          icon={Icons.calendar}
          tint={theme.primarySoft}
          ink={theme.primaryInk}
          label="Payday"
          value={account.payday ? `${account.payday}${ordinal(account.payday)}` : 'Set'}
          caption="of every month"
          onPress={() => router.push('/edit-profile')}
        />
        <PlanTile
          icon={Icons.target}
          tint={theme.warningSoft}
          ink={theme.warning}
          label="Savings goal"
          value={account.savingsGoal ? formatMoney(account.savingsGoal, account.currency, { compact: true }) : 'Set'}
          caption="kept from each salary"
          onPress={() => router.push('/edit-profile')}
        />
      </View>

      <Group title="Money">
        <Row
          icon={Icons.globe}
          label="Currency"
          value={`${flagEmoji(currency.country)} ${currency.code}`}
          onPress={() => router.push('/currency')}
        />
        <Row
          icon={Icons.budget}
          label="Category budgets"
          onPress={() => {
            if (requirePro()) router.push('/budgets');
          }}
        />
        <Row icon={Icons.history} label="Salary history" onPress={() => router.push('/history')} />
        {cycle && (
          <Row
            icon={Icons.edit}
            label="Edit current salary"
            value={formatMoney(cycle.amount, account.currency)}
            onPress={() => router.push({ pathname: '/salary', params: { id: cycle._id } })}
          />
        )}
      </Group>

      <Group title="Account">
        {purchasesSupported && <Row icon={Icons.checkCircle} label="Restore purchases" onPress={onRestore} />}
        <Row icon={Icons.back} label="Log out" onPress={confirmLogout} />
        <Row icon={Icons.trash} label="Erase all data" danger onPress={confirmErase} />
      </Group>

      <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
        Salary Survival · Your data syncs securely to the cloud.
      </Text>
    </ScrollView>
  );
}

function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
}

/** Tappable stat tile; each tile has its own colour so payday and savings goal read as different things. */
function PlanTile({
  icon,
  tint,
  ink,
  label,
  value,
  caption,
  onPress,
}: {
  icon: IconName;
  tint: string;
  ink: string;
  label: string;
  value: string;
  caption: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={17} color={ink} />
      </View>
      <Text variant="overline" color="textSecondary" style={{ marginTop: Spacing.two }}>
        {label}
      </Text>
      <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 28, lineHeight: 34, color: ink }}>
        {value}
      </Text>
      <Text variant="caption" color="textTertiary">
        {caption}
      </Text>
    </Pressable>
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
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  tile: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 24,
    borderCurve: 'continuous',
    gap: 2,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  pro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: 24,
    borderCurve: 'continuous',
    experimental_backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(75,227,176,0.3) 0%, transparent 60%)',
  },
  proIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#4BE3B0',
    alignItems: 'center',
    justifyContent: 'center',
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
