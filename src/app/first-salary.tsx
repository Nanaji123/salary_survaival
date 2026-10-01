import { OnboardingHeader } from '@/components/onboarding-header';
import { SalaryForm } from '@/components/salary-form';
import { FormScroll } from '@/components/ui/form';
import { Icons } from '@/components/ui/icon';
import { addCycle, updateAccount, useAccount } from '@/lib/store';

export default function FirstSalaryScreen() {
  const account = useAccount();

  return (
    <FormScroll>
      <OnboardingHeader
        step={2}
        total={2}
        title="Your salary"
        subtitle="Enter the amount you received this month. We'll track your spending against it."
        icon={Icons.salary}
      />
      <SalaryForm
        currency={account?.currency ?? 'INR'}
        submitLabel="Start planning"
        onSubmit={async (input) => {
          await addCycle(input);
          // Flipping `onboarded` swaps the protected routes and lands on the dashboard.
          await updateAccount({ onboarded: true });
        }}
      />
    </FormScroll>
  );
}
