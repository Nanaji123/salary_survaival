import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { AmountField, DateStepper, Field } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { parseAmount, todayKey } from '@/lib/format';
import { useSubmit } from '@/hooks/use-submit';

export type SalaryInput = { amount: number; receivedOn: string; note?: string };

export function SalaryForm({
  initial,
  currency,
  submitLabel,
  onSubmit,
}: {
  initial?: SalaryInput;
  currency: string;
  submitLabel: string;
  onSubmit: (input: SalaryInput) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [receivedOn, setReceivedOn] = useState(initial?.receivedOn ?? todayKey());
  const [note, setNote] = useState(initial?.note ?? '');
  const [submit, saving] = useSubmit();
  const value = parseAmount(amount);
  const valid = Number.isFinite(value) && value > 0;

  return (
    <>
      <AmountField
        label="Salary received"
        value={amount}
        onChangeText={setAmount}
        currency={currency}
        autoFocus={!initial}
      />
      <DateStepper label="Received on" value={receivedOn} onChange={setReceivedOn} />
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. September salary + bonus"
        returnKeyType="done"
      />
      <Button
        title={submitLabel}
        icon={Icons.check}
        disabled={!valid}
        loading={saving}
        onPress={() =>
          submit(() => onSubmit({ amount: value, receivedOn, note: note.trim() || undefined }))
        }
      />
    </>
  );
}
