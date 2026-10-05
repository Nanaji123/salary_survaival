import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenTitle } from '@/components/section';
import { AnimatedBar } from '@/components/game';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { flagEmoji, getCurrency } from '@/constants/currencies';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/legal';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTabTopInset } from '@/hooks/use-tab-top-inset';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMoney, toDateKey } from '@/lib/format';
import { levelInfo } from '@/lib/game';
import { formatHour, useReminderSettings } from '@/lib/reminders';
import {
  currentCycle,
  eraseAll,
  signOut,
  useAccount,
  useCycles,
  useExpenses,
  useGameProgress,
  type Account,
} from '@/lib/store';
import {
  manageSubscription,
  purchasesSupported,
  requirePro,
  restore,
  subscriptionsEnabled,
  useIsPro,
} from '@/lib/subscription';

export default function SettingsScreen() {
  const theme = useTheme();
  const topInset = useTabTopInset();
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  const [submit] = useSubmit();
  const isPro = useIsPro();
  const reminders = useReminderSettings();

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
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () => submit(eraseAll),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + Spacing.three, paddingBottom: TabBarSpace }]}>
      <ScreenTitle title="Settings" />

      <PlayerCard account={account} />

      {subscriptionsEnabled && (
        <Pressable onPress={() => (isPro ? manageSubscription().catch(() => {}) : router.push('/paywall'))}>
          <View style={[styles.pro, { backgroundColor: theme.hero }]}>
            <View style={styles.proIcon}>
              <EmojiImage name="crown" size={24} />
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
      )}

      <View style={styles.tiles}>
        <PlanTile
          emoji="alarm"
          tint={theme.primarySoft}
          ink={theme.primaryInk}
          label="Payday"
          value={account.payday ? `${account.payday}${ordinal(account.payday)}` : 'Set'}
          caption="of every month"
          onPress={() => router.push('/edit-profile')}
        />
        <PlanTile
          emoji="moneyBag"
          tint={theme.warningSoft}
          ink={theme.warning}
          label="Savings goal"
          value={
            account.savingsGoal
              ? formatMoney(account.savingsGoal, account.currency, {
                  compact: true,
                })
              : 'Set'
          }
          caption="kept from each salary"
          onPress={() => router.push('/savings-goal')}
        />
      </View>

      <Group title="Money">
        <Row
          icon={Icons.globe}
          tint="#22A355"
          label="Currency"
          value={`${flagEmoji(currency.country)} ${currency.code}`}
          onPress={() => router.push('/currency')}
        />
        <Row
          icon={Icons.budget}
          tint="#EA580C"
          label="Category budgets"
          onPress={() => {
            if (requirePro()) router.push('/budgets');
          }}
        />
        <Row icon={Icons.history} tint="#9333EA" label="Salary history" onPress={() => router.push('/history')} />
        <Row icon={Icons.wand} tint="#C026D3" label="Plan my salary with AI" onPress={() => router.push('/ai-plan')} />
        <Row icon={Icons.mic} tint="#16140F" label="Voice assistant" onPress={() => router.push('/assistant')} />
        {cycle && (
          <Row
            icon={Icons.edit}
            tint="#E8A400"
            label="Edit current salary"
            value={formatMoney(cycle.amount, account.currency)}
            onPress={() => router.push({ pathname: '/salary', params: { id: cycle._id } })}
          />
        )}
      </Group>

      <Group title="Reminders">
        <Row
          icon={Icons.bell}
          tint="#F2601F"
          label="Reminders"
          value={
            reminders.daily
              ? `Daily · ${formatHour(reminders.hour)}`
              : reminders.payday
                ? 'Payday only'
                : 'Off'
          }
          onPress={() => router.push('/reminders')}
        />
      </Group>

      <Group title="Account">
        {purchasesSupported && (
          <Row icon={Icons.checkCircle} tint="#22A355" label="Restore purchases" onPress={onRestore} />
        )}
        <Row icon={Icons.person} tint="#78716C" label="Edit profile" onPress={() => router.push('/edit-profile')} />
        <Row icon={Icons.logout} tint="#78716C" label="Log out" onPress={confirmLogout} />
        <Row icon={Icons.trash} label="Erase all data" danger onPress={confirmErase} />
      </Group>

      <Group title="About">
        {!!PRIVACY_URL && (
          <Row
            icon={Icons.privacy}
            tint="#16A34A"
            label="Privacy policy"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
        )}
        <Row icon={Icons.doc} tint="#78716C" label="Terms of use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        {!!SUPPORT_EMAIL && (
          <Row
            icon={Icons.mail}
            tint="#EA580C"
            label="Contact support"
            value={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        )}
      </Group>

      <View style={styles.about}>
        <EmojiImage name="moneyBag" size={36} />
        <Text variant="label" style={Fonts.bold}>
          Salary Survival
        </Text>
        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          Version {Application.nativeApplicationVersion ?? '1.0.0'} · Member since{' '}
          {formatDateKey(toDateKey(new Date(account._creationTime)))}
        </Text>
        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          Your data syncs securely to the cloud.
        </Text>
      </View>
    </ScrollView>
  );
}

/** Profile as a game character: level, XP towards the next level and lifetime stats. */
function PlayerCard({ account }: { account: Account }) {
  const theme = useTheme();
  const game = useGameProgress();
  const expenses = useExpenses();
  const level = levelInfo(game?.xp ?? 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
      onPress={() => router.push('/edit-profile')}>
      <View
        style={[
          styles.player,
          {
            backgroundColor: theme.hero,
            experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${Accent.glow} 0%, transparent 55%), radial-gradient(circle at 0% 100%, ${Accent.warmGlow} 0%, transparent 55%)`,
          },
        ]}>
        <View style={styles.playerTop}>
          <View style={styles.avatarRing}>
            <View style={[styles.avatar, { backgroundColor: Accent.lime }]}>
              <Text variant="title" style={{ color: Accent.ink }}>
                {(account.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.levelBadge, { borderColor: theme.hero }]}>
              <EmojiImage name={level.emoji} size={18} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline" style={{ color: theme.heroText, fontSize: 18, lineHeight: 23 }}>
              {account.name || 'Your account'}
            </Text>
            <Text variant="caption" style={{ color: Accent.lime, ...Fonts.bold }}>
              Level {level.level} · {level.title}
            </Text>
          </View>
          <Icon name={Icons.edit} size={15} color={theme.heroMuted} />
        </View>

        <View style={{ gap: 6 }}>
          <AnimatedBar value={level.progress} color="#FFC93C" track="rgba(255,255,255,0.12)" height={10} />
          <Text variant="caption" style={{ color: theme.heroMuted, fontSize: 11 }}>
            {level.into} / {level.needed} XP to level {level.level + 1}
          </Text>
        </View>

        <View style={styles.playerStats}>
          <PlayerStat emoji="fire" value={String(game?.streak ?? 0)} label="Streak" />
          <PlayerStat emoji="zap" value={String(game?.bestStreak ?? 0)} label="Best" />
          <PlayerStat emoji="trophy" value={String(game?.trophies.length ?? 0)} label="Trophies" />
          <PlayerStat emoji="ledger" value={String(expenses?.length ?? 0)} label="Logged" />
        </View>
      </View>
    </Pressable>
  );
}

function PlayerStat({ emoji, value, label }: { emoji: EmojiName; value: string; label: string }) {
  return (
    <View style={styles.playerStat}>
      <EmojiImage name={emoji} size={22} />
      <Text variant="headline" style={{ color: '#FFFFFF' }}>
        {value}
      </Text>
      <Text
        variant="caption"
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 10,
          lineHeight: 13,
        }}>
        {label}
      </Text>
    </View>
  );
}

function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
}

/** Tappable stat tile; each tile has its own colour so payday and savings goal read as different things. */
function PlanTile({
  emoji,
  tint,
  ink,
  label,
  value,
  caption,
  onPress,
}: {
  emoji: EmojiName;
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
        <EmojiImage name={emoji} size={24} />
      </View>
      <Text variant="overline" color="textSecondary" style={{ marginTop: Spacing.two }}>
        {label}
      </Text>
      <Text
        variant="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontSize: 28, lineHeight: 34, color: ink }}>
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
      <Card
        style={{
          paddingVertical: Spacing.one,
          paddingHorizontal: Spacing.three,
        }}>
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
  tint,
  label,
  value,
  onPress,
  danger,
}: {
  icon: IconName;
  /** Background of the icon tile, iOS Settings style. */
  tint?: string;
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
      <View style={[styles.rowIcon, { backgroundColor: danger ? theme.danger : (tint ?? theme.cardAlt) }]}>
        <Icon name={icon} size={15} color={danger || tint ? '#FFFFFF' : color} />
      </View>
      <Text variant="label" style={{ flex: 1, color }}>
        {label}
      </Text>
      {value && (
        <Text variant="caption" color="textSecondary" style={{ ...Fonts.semibold }}>
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
  player: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
    boxShadow: '0 14px 34px rgba(22, 20, 15, 0.26)',
  },
  playerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(198,244,90,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    backgroundColor: '#2B2820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  playerStat: { flex: 1, alignItems: 'center', gap: 2 },
  about: { alignItems: 'center', gap: 4, paddingVertical: Spacing.three },
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
    experimental_backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(198,244,90,0.3) 0%, transparent 60%)',
  },
  proIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C6F45A',
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
