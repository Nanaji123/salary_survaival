import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderTextButton } from '@/components/header-button';
import { Button } from '@/components/ui/button';
import { CurrencySelect, Field, FormScroll, PaydayPicker } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { useSubmit } from '@/hooks/use-submit';
import { updateAccount, useAccount, type Account } from '@/lib/store';

export default function EditProfileScreen() {
  const account = useAccount();
  if (!account) return null;
  return <ProfileForm account={account} />;
}

function ProfileForm({ account }: { account: Account }) {
  const [name, setName] = useState(account.name);
  const [payday, setPayday] = useState(account.payday ?? 1);
  const [submit, saving] = useSubmit();
  const valid = name.trim().length > 0;

  async function save() {
    const ok = await submit(() => updateAccount({ name: name.trim(), payday }));
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
        <Button title="Save changes" icon={Icons.check} disabled={!valid} loading={saving} onPress={save} />
      </FormScroll>
    </>
  );
}
