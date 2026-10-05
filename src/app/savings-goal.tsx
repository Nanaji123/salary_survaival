import { XpReward } from '@convex/gameRules';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderTextButton } from '@/components/header-button';
import { Button } from '@/components/ui/button';
import { EmojiImage } from '@/components/ui/emoji';
import { AmountField, Chip, FormScroll } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { cycleProgress } from '@/lib/analytics';
import { formatMoney, parseAmount } from '@/lib/format';
import { currentCycle, updateAccount, useAccount, useCycles, type Account, type SalaryCycle } from '@/lib/store';

const SHARES = [0.1, 0.2, 0.3];

/** Sets how much to keep aside from each salary. Only the goal; the profile has the rest. */
export default function SavingsGoalScreen() {
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  if (!account) return null;
  return <GoalForm account={account} cycle={cycle} />;
}

function GoalForm({ account, cycle }: { account: Account; cycle: SalaryCycle | null }) {
  const theme = useTheme();
  const [goal, setGoal] = useState(account.savingsGoal ? String(account.savingsGoal) : '');
  const [submit, saving] = useSubmit();
  const value = goal ? parseAmount(goal) : 0;
  const valid = Number.isFinite(value) && value > 0 && (!cycle || value < cycle.amount);
  const firstGoal = !account.savingsGoal;
  const currency = account.currency;

  // What the goal leaves for spending this cycle, spread over its days.
  const days = cycle ? cycleProgress(cycle).total : 30;
  const spendable = cycle ? cycle.amount - (Number.isFinite(value) ? value : 0) : 0;

  async function save(amount: number) {
    if (await submit(() => updateAccount({ savingsGoal: amount }))) router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Savings goal',
          headerLeft: () => <HeaderTextButton title="Cancel" onPress={() => router.back()} />,
        }}
      />
      <FormScroll>
        <View style={styles.hero}>
          <EmojiImage name="moneyBag" size={72} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Pay yourself first
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            How much do you want left over when the next salary arrives?
          </Text>
        </View>

        <AmountField
          label="Keep from each salary"
          value={goal}
          onChangeText={setGoal}
          currency={currency}
          autoFocus={!account.savingsGoal}
        />

        {cycle && (
          <View style={{ gap: Spacing.two }}>
            <Text variant="overline" color="textSecondary">
              Quick picks · from {formatMoney(cycle.amount, currency)}
            </Text>
            <View style={styles.chips}>
              {SHARES.map((share) => {
                const amount = Math.round((cycle.amount * share) / 10) * 10;
                return (
                  <Chip
                    key={share}
                    label={`${share * 100}% · ${formatMoney(amount, currency, { compact: true })}`}
                    selected={value === amount}
                    onPress={() => setGoal(String(amount))}
                  />
                );
              })}
            </View>
          </View>
        )}

        {cycle && Number.isFinite(value) && value > 0 && (
          <View style={[styles.preview, { backgroundColor: value < cycle.amount ? theme.primarySoft : theme.dangerSoft }]}>
            <EmojiImage name={value < cycle.amount ? 'coin' : 'warning'} size={24} />
            <Text variant="caption" style={{ flex: 1, ...Fonts.semibold, color: value < cycle.amount ? theme.primaryInk : theme.danger }}>
              {value < cycle.amount
                ? `That leaves ${formatMoney(spendable, currency)} to spend, about ${formatMoney(Math.floor(spendable / days), currency)} a day.`
                : 'The goal has to be less than your salary.'}
            </Text>
          </View>
        )}

        <View style={{ gap: Spacing.two }}>
          <Button title={firstGoal ? `Save goal · +${XpReward.goal} XP` : 'Save goal'} icon={Icons.check} disabled={!valid} loading={saving} onPress={() => save(value)} />
          {!firstGoal && <Button title="Remove goal" variant="ghost" onPress={() => save(0)} />}
        </View>
      </FormScroll>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 12,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
});
