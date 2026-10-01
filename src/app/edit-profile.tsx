import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderTextButton } from '@/components/header-button';
import { Button } from '@/components/ui/button';
import { AmountField, CurrencySelect, Field, FormScroll, PaydayPicker } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSubmit } from '@/hooks/use-submit';
import { parseAmount } from '@/lib/format';
import { updateAccount, useAccount, type Account } from '@/lib/store';

export default function EditProfileScreen() {
  const account = useAccount();
  if (!account) return null;
  return <ProfileForm account={account} />;
}

function ProfileForm({ account }: { account: Account }) {
  const [name, setName] = useState(account.name);
  const [payday, setPayday] = useState(account.payday ?? 1);
  const [goal, setGoal] = useState(account.savingsGoal ? String(account.savingsGoal) : '');
  const [submit, saving] = useSubmit();
  const goalValue = goal ? parseAmount(goal) : 0;
  const valid = name.trim().length > 0 && Number.isFinite(goalValue);

  async function save() {
    const ok = await submit(() =>
      updateAccount({ name: name.trim(), payday, savingsGoal: goalValue || 0 }),
    );
    if (ok) router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderTextButton title="Cancel" onPress={() => router.back()} />,
        }}
      />
      <FormScroll>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="done" />
        <CurrencySelect code={account.currency} onPress={() => router.push('/currency')} />
        <PaydayPicker value={payday} onChange={setPayday} />
        <AmountField
          label="Savings goal per salary"
          value={goal}
          onChangeText={setGoal}
          currency={account.currency}
          footer={
            <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              How much you want left over when the next salary arrives. Leave empty to turn off.
            </Text>
          }
        />
        <Button title="Save changes" icon={Icons.check} disabled={!valid} loading={saving} onPress={save} />
      </FormScroll>
    </>
  );
}
