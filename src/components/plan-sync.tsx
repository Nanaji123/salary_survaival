import { useEffect } from 'react';

import { setUsage } from '@/lib/limits';
import { syncProStatus, useDeviceId, useUsageQuery } from '@/lib/store';
import { useIsPro } from '@/lib/subscription';

/**
 * Keeps the free plan in step with the backend: shares today's usage with the rest of the app and
 * tells the backend whenever RevenueCat reports a change in Pro. Renders nothing.
 */
export function PlanSync() {
  const deviceId = useDeviceId();
  const isPro = useIsPro();
  const usage = useUsageQuery();

  useEffect(() => {
    setUsage(usage ?? null);
  }, [usage]);

  useEffect(() => {
    if (deviceId && isPro !== undefined) syncProStatus(isPro).catch(() => {});
  }, [deviceId, isPro]);

  return null;
}
