import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHero } from '@/components/balance-hero';
import { EmptyState, expenseSuggestions } from '@/components/empty-state';
import { ScreenTitle, Section } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ProgressBar } from '@/components/ui/charts';
import { Divider } from '@/components/ui/divider';
import { Reveal } from '@/components/ui/reveal';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatuses } from '@/lib/analytics';
import { formatMoney, greeting } from '@/lib/format';
import { requirePro, useIsPro } from '@/lib/subscription';
import {
  currentCycle,
  summarize,
  useAccount,
  useBudgets,
  useCycles,
  useExpenses,
} from '@/lib/store';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycles = useCycles();
  const expenses = useExpenses();
  const budgets = useBudgets();
  const cycle = currentCycle(cycles);
  const currency = account?.currency ?? 'USD';

  const summary = useMemo(
    () => (cycle && expenses ? summarize(cycle, expenses) : null),
    [cycle, expenses],
  );
  const statuses = useMemo(
    () => (budgets && expenses ? budgetStatuses(budgets, cycle, expenses) : []),
    [budgets, cycle, expenses],
  );
  const alerts = statuses.filter((s) => s.state !== 'ok').slice(0, 2);
  const loading = cycles === undefined || expenses === undefined;
  const isPro = useIsPro();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: TabBarSpace + insets.bottom },
      ]}>
      <ScreenTitle
        eyebrow={greeting()}
        title={account?.name || 'Welcome'}
        badge={isPro ? <ProBadge /> : undefined}
        right={<HeaderAction name={account?.name} />}
      />

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />
      ) : !cycle || !summary ? (
        <Card style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={Icons.salary} size={26} color={theme.primaryInk} />
          </View>
          <Text variant="headline">Add your salary to begin</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Log the amount you received and we&apos;ll plan the month around it.
          </Text>
          <Button title="Add salary" icon={Icons.add} onPress={() => router.push('/salary')} />
          <Button title="Or say it with voice" icon={Icons.mic} variant="ghost" onPress={() => router.push('/assistant')} />
        </Card>
      ) : (
        <>
          <BalanceHero cycle={cycle} spent={summary.spent} currency={currency} live />

          <View style={styles.quick}>
            <QuickAction icon={Icons.salary} label="New salary" onPress={() => router.push('/salary')} />
            <QuickAction icon={Icons.budget} label="Budgets" onPress={() => openBudgets()} />
            <QuickAction icon={Icons.history} label="History" onPress={() => router.push('/history')} />
          </View>

          <Reveal index={1}>
            <AiCard hasExpenses={summary.items.length > 0} />
          </Reveal>

          {alerts.map((a) => {
            const c = getCategory(a.category);
            const over = a.state === 'over';
            return (
              <Pressable
                key={a.category}
                onPress={() => openBudgets()}
                style={[styles.alert, { backgroundColor: over ? theme.dangerSoft : theme.warningSoft }]}>
                <Icon name={Icons.alert} size={16} color={over ? theme.danger : theme.warning} />
                <Text variant="caption" style={{ flex: 1, color: theme.text, fontFamily: Fonts.semibold }}>
                  {over
                    ? `${c.label} is ${formatMoney(a.spent - a.limit, currency)} over budget`
                    : `${c.label} has used ${Math.floor(a.ratio * 100)}% of its budget`}
                </Text>
                <Icon name={Icons.forward} size={12} color={theme.textSecondary} />
              </Pressable>
            );
          })}

          <SavingsCard goal={account?.savingsGoal} remaining={summary.remaining} currency={currency} />

          <Section title="Budgets" action={statuses.length ? 'Manage' : undefined} onAction={() => openBudgets()}>
            <Card style={{ gap: Spacing.three }}>
              {statuses.length === 0 ? (
                <View style={styles.inlineEmpty}>
                  <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                    Set limits per category, or let AI plan your whole salary in one tap.
                  </Text>
                  <Button title="AI plan" icon={Icons.wand} compact variant="secondary" onPress={() => router.push('/ai-plan')} />
                </View>
              ) : (
                statuses.slice(0, 3).map((s) => {
                  const color = s.state === 'over' ? theme.danger : s.state === 'near' ? theme.warning : getCategory(s.category).color;
                  return (
                    <View key={s.category} style={styles.budgetRow}>
                      <CategoryIcon id={s.category} size={36} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.budgetTop}>
                          <Text variant="label">{getCategory(s.category).label}</Text>
                          <Text variant="caption" color="textSecondary">
                            {formatMoney(s.spent, currency)} / {formatMoney(s.limit, currency)}
                          </Text>
                        </View>
                        <ProgressBar value={s.ratio} color={color} height={6} />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </Section>

          <Section
            title="Recent activity"
            action={summary.items.length ? 'See all' : undefined}
            onAction={() => router.push('/transactions')}>
            <Card style={{ paddingVertical: summary.items.length === 0 ? 0 : Spacing.two }}>
              {summary.items.length === 0 ? (
                <EmptyState
                  icon={Icons.receipt}
                  title="No expenses yet"
                  body="Log your first expense and watch your daily limit update live."
                  suggestions={expenseSuggestions().slice(0, 4)}
                  suggestionsTitle="Quick add"
                />
              ) : (
                summary.items.slice(0, 5).map((e, i) => (
                  <View key={e._id}>
                    {i > 0 && <Divider inset={58} />}
                    <TransactionRow expense={e} currency={currency} />
                  </View>
                ))
              )}
            </Card>
          </Section>
        </>
      )}
    </ScrollView>
  );
}

/** Small PRO pill shown to the left of the greeting for subscribers. */
function ProBadge() {
  return (
    <View style={styles.proPill}>
      <Icon name={Icons.sparkles} size={9} color="#0E1116" />
      <Text style={styles.proPillText}>PRO</Text>
    </View>
  );
}

/** Upgrade pill for free users; plain profile avatar for subscribers. */
function HeaderAction({ name }: { name?: string }) {
  const theme = useTheme();
  const isPro = useIsPro();

  if (isPro === false) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Pro"
        onPress={() => router.push('/paywall')}
        style={({ pressed }) => [
          styles.upgrade,
          { backgroundColor: theme.hero, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}>
        <View style={styles.upgradeIcon}>
          <Icon name={Icons.sparkles} size={11} color={theme.hero} />
        </View>
        <Text variant="caption" style={{ color: theme.heroText, fontFamily: Fonts.bold }}>
          Upgrade
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile"
      onPress={() => router.push('/edit-profile')}
      style={[styles.avatar, { backgroundColor: theme.text }]}>
      <Text variant="headline" style={{ color: theme.background }}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </Pressable>
  );
}

/** Dark call-to-action card that opens the voice assistant or the AI salary plan. */
function AiCard({ hasExpenses }: { hasExpenses: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.ai,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(75,227,176,0.3) 0%, transparent 55%), radial-gradient(circle at 0% 100%, rgba(91,91,214,0.22) 0%, transparent 50%)',
        },
      ]}>
      <View style={styles.aiHead}>
        <View style={styles.aiBadge}>
          <Icon name={Icons.sparkles} size={13} color="#0E1116" />
        </View>
        <Text variant="overline" style={{ color: theme.heroAccent }}>
          AI assistant
        </Text>
      </View>
      <Text variant="headline" style={{ color: theme.heroText, fontSize: 20, lineHeight: 26 }}>
        {hasExpenses ? 'Log expenses just by talking.' : 'Say it, and it is logged.'}
      </Text>
      <Text variant="caption" style={{ color: theme.heroMuted }}>
        Hold the mic and say “spent 250 on lunch”. I will add it for you.
      </Text>
      <View style={styles.aiActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/assistant')}
          style={({ pressed }) => [styles.aiPrimary, pressed && { opacity: 0.85 }]}>
          <Icon name={Icons.mic} size={16} color="#0E1116" />
          <Text variant="label" style={{ color: '#0E1116', fontFamily: Fonts.bold }}>
            Talk to AI
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/ai-plan')}
          style={({ pressed }) => [styles.aiSecondary, pressed && { opacity: 0.7 }]}>
          <Icon name={Icons.wand} size={15} color="#FFFFFF" />
          <Text variant="label" style={{ color: '#FFFFFF', fontFamily: Fonts.semibold }}>
            Plan my salary
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function openBudgets() {
  if (requirePro()) router.push('/budgets');
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickItem, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={17} color={theme.primaryInk} />
      </View>
      <Text variant="caption" style={{ fontFamily: Fonts.semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SavingsCard({ goal, remaining, currency }: { goal?: number; remaining: number; currency: string }) {
  const theme = useTheme();
  if (!goal) {
    return (
      <Pressable onPress={() => router.push('/edit-profile')}>
        <Card style={styles.savings}>
          <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={Icons.target} size={17} color={theme.primaryInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">Set a savings goal</Text>
            <Text variant="caption" color="textSecondary">
              Decide how much to keep aside from every salary.
            </Text>
          </View>
          <Icon name={Icons.forward} size={13} color={theme.textTertiary} />
        </Card>
      </Pressable>
    );
  }
  const ratio = Math.max(0, remaining) / goal;
  const onTrack = remaining >= goal;
  return (
    <Card style={{ gap: Spacing.three - 4 }}>
      <View style={styles.savingsTop}>
        <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name={Icons.target} size={17} color={theme.primaryInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="textSecondary">
            Savings goal
          </Text>
          <Text variant="headline">{formatMoney(goal, currency)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: onTrack ? theme.primarySoft : theme.warningSoft }]}>
          <Text variant="caption" style={{ fontFamily: Fonts.bold, color: onTrack ? theme.primaryInk : theme.warning }}>
            {onTrack ? 'On track' : 'At risk'}
          </Text>
        </View>
      </View>
      <ProgressBar value={ratio} color={onTrack ? theme.primary : theme.warning} height={8} />
      <Text variant="caption" color="textSecondary">
        {onTrack
          ? `Keep ${formatMoney(Math.max(0, remaining) - goal, currency)} more flexible and you'll still hit your goal.`
          : `Spend ${formatMoney(goal - Math.max(0, remaining), currency)} less to reach your goal this cycle.`}
      </Text>
    </Card>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgrade: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: Radius.pill,
    boxShadow: '0 6px 18px rgba(75,227,176,0.35)',
    experimental_backgroundImage: 'linear-gradient(120deg, rgba(75,227,176,0.35), transparent 70%)',
  },
  upgradeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4BE3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4BE3B0',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proPillText: {
    color: '#0E1116',
    fontFamily: Fonts.extrabold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.five,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
    marginTop: -Spacing.two,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    marginTop: -Spacing.two,
  },
  ai: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.two,
  },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#4BE3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  aiPrimary: {
    flex: 1,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: '#4BE3B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  aiSecondary: {
    flex: 1,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  savingsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
