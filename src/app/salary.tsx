import { router, Stack, useLocalSearchParams } from 'expo-router';

import { HeaderTextButton } from '@/components/header-button';
import { SalaryForm } from '@/components/salary-form';
import { FormScroll } from '@/components/ui/form';
import { Text } from '@/components/ui/text';
import { addCycle, updateCycle, useAccount, useCycles } from '@/lib/store';

/** Adds a new salary cycle, or edits an existing one when `id` is passed. */
export default function SalaryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const account = useAccount();
  const cycles = useCycles();
  const existing = id ? cycles?.find((c) => c._id === id) : undefined;

  // Wait for the cycle to load before mounting the form so it starts with its values.
  if (id && !existing) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Edit salary' : 'New salary',
          headerLeft: () => <HeaderTextButton title="Cancel" onPress={() => router.back()} />,
        }}
      />
      <FormScroll>
        {!existing && (
          <Text variant="body" color="textSecondary">
            Got paid? Starting a new salary begins a fresh cycle. Your previous cycle is saved in
            history.
          </Text>
        )}
        <SalaryForm
          initial={existing}
          currency={account?.currency ?? 'INR'}
          submitLabel={existing ? 'Save changes' : 'Start new cycle'}
          onSubmit={async (input) => {
            if (existing) await updateCycle(existing._id, input);
            else await addCycle(input);
            router.back();
          }}
        />
      </FormScroll>
    </>
  );
}
