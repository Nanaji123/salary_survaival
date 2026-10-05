import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { cycleEnd } from '@/lib/analytics';
import { scheduleReminders, useReminderSettings } from '@/lib/reminders';
import { currentCycle, useCycles, useGameProgress } from '@/lib/store';

/**
 * Keeps scheduled reminders in step with the data (logging today drops today's nudge, a new salary
 * moves the payday reminders) and opens the right screen when a reminder is tapped. Renders nothing.
 */
export function ReminderSync() {
  const settings = useReminderSettings();
  const cycle = currentCycle(useCycles());
  const progress = useGameProgress();
  const [foregrounded, setForegrounded] = useState(0);
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  // Reschedule when the app comes back, so the week of reminders always starts from today.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounded((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  const loggedToday = progress?.loggedToday ?? false;
  const streak = progress?.streak ?? 0;
  const payday = cycle ? cycleEnd(cycle) : null;
  const ready = progress !== undefined;

  useEffect(() => {
    // Wait for game progress so today's reminder isn't scheduled before we know it was logged.
    if (!ready) return;
    const t = setTimeout(() => {
      scheduleReminders({ loggedToday, streak, payday }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [settings, loggedToday, streak, payday, foregrounded, ready]);

  useEffect(() => {
    if (!response || handled.current === response.notification.request.identifier) return;
    handled.current = response.notification.request.identifier;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url !== '/') router.push(url as Href);
  }, [response]);

  return null;
}
