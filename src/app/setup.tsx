import { router } from 'expo-router';
import { useState } from 'react';

import { OnboardingHeader } from '@/components/onboarding-header';
import { Button } from '@/components/ui/button';
import { CurrencySelect, Field, FormScroll, PaydayPicker } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { useSubmit } from '@/hooks/use-submit';
import { updateAccount, useAccount } from '@/lib/store';

export default function SetupScreen() {
  const account = useAccount();
  const [name, setName] = useState('');
  const [payday, setPayday] = useState(1);
  const [submit, saving] = useSubmit();

  async function next() {
    const ok = await submit(() => updateAccount({ name: name.trim(), payday }));
    if (ok) router.push('/first-salary');
  }

  return (
    <FormScroll>
      <OnboardingHeader
        step={1}
        total={2}
        title="Let's set you up"
        subtitle="A few details so the plan fits the way you get paid."
      />
      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="What should we call you?"
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
      />
      <CurrencySelect code={account?.currency ?? 'USD'} onPress={() => router.push('/currency')} />
      <PaydayPicker value={payday} onChange={setPayday} />
      <Button
        title="Continue"
        icon={Icons.arrow}
        onPress={next}
        loading={saving}
        disabled={name.trim().length === 0 || !account}
      />
    </FormScroll>
  );
}
