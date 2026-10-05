import { ConvexError } from 'convex/values';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, expenseSuggestions } from '@/components/empty-state';
import { LevelCard, SurvivalHero, TrophyShelf } from '@/components/game';
import { ScreenTitle, Section } from '@/components/section';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ProgressBar } from '@/components/ui/charts';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Icon, Icons } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTabTopInset } from '@/hooks/use-tab-top-inset';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatuses } from '@/lib/analytics';
import { formatMoney, greeting } from '@/lib/format';
import { gameState, todayRation, type Quest } from '@/lib/game';
import { openAddExpense } from '@/lib/limits';
import { updateReminders, useReminderSettings } from '@/lib/reminders';
import { requirePro, subscriptionsEnabled, useIsPro } from '@/lib/subscription';
import {
  claimQuest,
  currentCycle,
  initGame,
  summarize,
  useAccount,
  useBudgets,
  useCycles,
  useExpenses,
  useGameProgress,
} from '@/lib/store';

export default function HomeScreen() {
  const theme = useTheme();
  const topInset = useTabTopInset();
  const account = useAccount();
  const cycles = useCycles();
  const expenses = useExpenses();
  const budgets = useBudgets();
  const progress = useGameProgress();
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
  const ration = useMemo(() => (cycle && expenses ? todayRation(cycle, expenses) : null), [cycle, expenses]);
  const game = useMemo(
    () =>
      cycle && expenses && progress
        ? gameState({
            progress,
            account,
            cycle,
            expenses,
            budgets: budgets ?? [],
            over: statuses.filter((s) => s.state === 'over').length,
            formatMoney: (n) => formatMoney(n, currency),
          })
        : null,
    [progress, account, cycle, expenses, budgets, statuses, currency],
  );

  // Accounts from before the game existed get their XP and streak backfilled once.
  const needsSetup = progress?.ready === false;
  useEffect(() => {
    if (needsSetup) initGame().catch(() => {});
  }, [needsSetup]);
  const alerts = statuses.filter((s) => s.state !== 'ok').slice(0, 2);
  const loading = cycles === undefined || expenses === undefined;
  const isPro = useIsPro();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + Spacing.three, paddingBottom: TabBarSpace },
      ]}>
      <ScreenTitle
        eyebrow={greeting()}
        title={account?.name || 'Welcome'}
        badge={isPro && subscriptionsEnabled ? <ProBadge /> : undefined}
        right={<HeaderAction name={account?.name} />}
      />

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.six }} />
      ) : !cycle || !summary || !ration ? (
        <Reveal>
          <Card style={styles.empty}>
            <EmojiImage name="moneyBag" size={88} />
            <Text variant="title" style={{ textAlign: 'center' }}>
              Start your survival run
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 280 }}>
              Add the salary you received. Make it last until payday to level up and earn trophies.
            </Text>
            <View style={{ alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.two }}>
              <Button title="Add salary" icon={Icons.add} onPress={() => router.push('/salary')} />
              <Button title="Or say it with voice" icon={Icons.mic} variant="ghost" onPress={() => router.push('/assistant')} />
            </View>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal>
            <SurvivalHero
              cycle={cycle}
              spent={summary.spent}
              currency={currency}
              streak={progress?.streak ?? 0}
              ration={ration}
            />
          </Reveal>

          <Reveal index={1} style={styles.quick}>
            <QuickAction emoji="banknote" label="New salary" onPress={() => router.push('/salary')} />
            <QuickAction emoji="ledger" label="Budgets" onPress={() => openBudgets()} />
            <QuickAction emoji="crystalBall" label="AI plan" onPress={() => router.push('/ai-plan')} />
            <QuickAction emoji="scroll" label="History" onPress={() => router.push('/history')} />
          </Reveal>

          {alerts.map((a) => {
            const c = getCategory(a.category);
            const over = a.state === 'over';
            return (
              <Pressable
                key={a.category}
                onPress={() => openBudgets()}
                style={[styles.alert, { backgroundColor: over ? theme.dangerSoft : theme.warningSoft }]}>
                <EmojiImage name="warning" size={18} />
                <Text variant="caption" style={{ flex: 1, color: theme.text, ...Fonts.semibold }}>
                  {over
                    ? `${c.label} is ${formatMoney(a.spent - a.limit, currency)} over budget`
                    : `${c.label} has used ${Math.floor(a.ratio * 100)}% of its budget`}
                </Text>
                <Icon name={Icons.forward} size={11} color={theme.textSecondary} />
              </Pressable>
            );
          })}

          {game && (
            <Reveal index={2}>
              <LevelCard
                level={game.level}
                xpToday={game.xpToday}
                quests={game.quests}
                onQuest={startQuest}
                onClaim={claim}
              />
            </Reveal>
          )}

          <Reveal index={3}>
            <AiCard />
          </Reveal>

          {summary.items.length > 0 && <ReminderPrompt streak={progress?.streak ?? 0} />}

          <SavingsCard goal={account?.savingsGoal} remaining={summary.remaining} currency={currency} />

          {game && <TrophyShelf trophies={game.trophies} />}

          <Section title="Budgets" action={statuses.length ? 'Manage' : undefined} onAction={() => openBudgets()}>
            <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
              {statuses.length === 0 ? (
                <View style={styles.inlineEmpty}>
                  <EmojiImage name="crystalBall" size={36} />
                  <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                    Set limits per category, or let AI plan your whole salary in one tap.
                  </Text>
                  <Button title="AI plan" compact variant="secondary" onPress={() => router.push('/ai-plan')} />
                </View>
              ) : (
                statuses.slice(0, 3).map((s) => {
                  const color =
                    s.state === 'over' ? theme.danger : s.state === 'near' ? theme.warning : getCategory(s.category).color;
                  return (
                    <View key={s.category} style={styles.budgetRow}>
                      <CategoryIcon id={s.category} size={36} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.budgetTop}>
                          <Text variant="label" style={{ fontSize: 13 }}>
                            {getCategory(s.category).label}
                          </Text>
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
            <Card style={{ paddingVertical: summary.items.length === 0 ? 0 : Spacing.one, paddingHorizontal: Spacing.three }}>
              {summary.items.length === 0 ? (
                <EmptyState
                  icon={Icons.receipt}
                  title="No expenses yet"
                  body="Log your first expense to start a streak and earn XP."
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

async function claim(quest: Quest) {
  if (!quest.claim) return 0;
  try {
    const xp = await claimQuest(quest.claim);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return xp;
  } catch (error) {
    Alert.alert(
      'Not yet',
      error instanceof ConvexError ? String(error.data) : 'Check your internet connection and try again.',
    );
    return 0;
  }
}

function startQuest(quest: Quest) {
  if (quest.action === 'expense') {
    openAddExpense();
  } else if (quest.action === 'goal') router.push('/savings-goal');
  else if (quest.action === 'plan') router.push('/ai-plan');
  else openBudgets();
}

function openBudgets() {
  if (requirePro()) router.push('/budgets');
}

/** Small PRO pill shown to the left of the greeting for subscribers. */
function ProBadge() {
  return (
    <View style={styles.proPill}>
      <Icon name={Icons.sparkles} size={9} color={Accent.ink} />
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
        style={({ pressed }) => [styles.upgrade, { backgroundColor: theme.hero, opacity: pressed ? 0.85 : 1 }]}>
        <EmojiImage name="crown" size={18} />
        <Text variant="caption" style={{ color: theme.heroText, ...Fonts.bold }}>
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
function AiCard() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.ai,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${Accent.glow} 0%, transparent 55%), radial-gradient(circle at 0% 100%, ${Accent.warmGlow} 0%, transparent 50%)`,
        },
      ]}>
      <View style={styles.aiTop}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="overline" style={{ color: Accent.lime }}>
            AI sidekick
          </Text>
          <Text variant="headline" style={{ color: theme.heroText, fontSize: 17, lineHeight: 22 }}>
            Just say it. It&apos;s logged.
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            Hold the mic and say “lunch 250, cab 180”.
          </Text>
        </View>
        <EmojiImage name="microphone" size={60} />
      </View>
      <View style={styles.aiActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/assistant')}
          style={({ pressed }) => [
            styles.aiPrimary,
            { boxShadow: `0 ${pressed ? 1 : 3}px 0 #86AD2E`, transform: [{ translateY: pressed ? 2 : 0 }] },
          ]}>
          <Icon name={Icons.mic} size={14} color={Accent.ink} />
          <Text variant="label" style={{ color: Accent.ink, ...Fonts.bold, fontSize: 13 }}>
            Talk to AI
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/ai-plan')}
          style={({ pressed }) => [styles.aiSecondary, pressed && { opacity: 0.7 }]}>
          <EmojiImage name="crystalBall" size={16} />
          <Text variant="label" style={{ color: '#FFFFFF', ...Fonts.semibold, fontSize: 13 }}>
            Plan my salary
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuickAction({ emoji, label, onPress }: { emoji: EmojiName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          boxShadow: `0 ${pressed ? 1 : 3}px 0 ${theme.border}`,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}>
      <EmojiImage name={emoji} size={28} />
      <Text variant="caption" numberOfLines={1} style={{ ...Fonts.semibold, fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const PROMPT_DISMISSED = 'salary-survival/reminder-prompt-dismissed';

/** After the first expense, offers the daily reminder in one tap. Hidden once reminders are on or it's dismissed. */
function ReminderPrompt({ streak }: { streak: number }) {
  const theme = useTheme();
  const reminders = useReminderSettings();
  const [dismissed, setDismissed] = useState(() => Storage.getItemSync(PROMPT_DISMISSED) === 'yes');
  if (dismissed || reminders.daily || reminders.payday) return null;

  function dismiss() {
    Storage.setItemSync(PROMPT_DISMISSED, 'yes');
    setDismissed(true);
  }

  return (
    <Reveal>
      <Card style={[styles.prompt, { backgroundColor: theme.fireSoft }]}>
        <EmojiImage name="alarm" size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" style={Fonts.bold}>
            {streak > 0 ? `Protect your ${streak}-day streak` : 'Never break your streak'}
          </Text>
          <Text variant="caption" color="textSecondary">
            A nudge at 8 PM on days you haven’t logged, plus a heads-up before payday.
          </Text>
          <View style={styles.promptActions}>
            <Button title="Turn on" compact onPress={() => updateReminders({ daily: true, payday: true })} />
            <Pressable accessibilityRole="button" onPress={dismiss} hitSlop={8}>
              <Text variant="caption" color="textSecondary" style={Fonts.semibold}>
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </Reveal>
  );
}

function SavingsCard({ goal, remaining, currency }: { goal?: number; remaining: number; currency: string }) {
  const theme = useTheme();
  if (!goal) return null;
  const ratio = Math.max(0, remaining) / goal;
  const onTrack = remaining >= goal;
  return (
    <Card style={{ gap: Spacing.three - 4, padding: Spacing.three }}>
      <View style={styles.savingsTop}>
        <View style={[styles.savingsIcon, { backgroundColor: theme.primarySoft }]}>
          <EmojiImage name="moneyBag" size={26} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="textSecondary">
            Savings goal
          </Text>
          <Text variant="headline">{formatMoney(goal, currency)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: onTrack ? theme.primarySoft : theme.warningSoft }]}>
          <Text variant="caption" style={{ ...Fonts.bold, fontSize: 11, color: onTrack ? theme.primaryInk : theme.warning }}>
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
    gap: Spacing.gutter,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgrade: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: Radius.pill,
    boxShadow: '0 6px 16px rgba(198,244,90,0.3)',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Accent.lime,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proPillText: {
    color: Accent.ink,
    ...Fonts.extrabold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.five,
  },
  quick: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    marginTop: -Spacing.one,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Radius.md,
    marginTop: -Spacing.two,
  },
  ai: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
  },
  aiTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  aiActions: { flexDirection: 'row', gap: Spacing.two },
  aiPrimary: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Accent.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiSecondary: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  prompt: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three - 4, padding: Spacing.three },
  promptActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  savingsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  savingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
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
