import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { fromDateKey } from '@/lib/format';

/**
 * Local reminders, scheduled on the phone (no push server): a daily nudge to log spending and
 * payday reminders. Settings live on the device; ReminderSync reschedules whenever the data changes.
 */

export type ReminderSettings = { daily: boolean; hour: number; payday: boolean };

export const REMINDER_HOURS = [8, 13, 18, 20, 22];

const KEY = 'salary-survival/reminders';
const CHANNEL = 'reminders';
const DEFAULTS: ReminderSettings = { daily: false, hour: 20, payday: false };

function load(): ReminderSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(Storage.getItemSync(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

let settings = load();
const listeners = new Set<() => void>();

function save(next: ReminderSettings) {
  settings = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useReminderSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
    () => settings,
  );
}

export function formatHour(hour: number) {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Shows reminders as banners even while the app is open. Call once at startup. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

/** Asks for notification permission at the moment the user turns a reminder on. */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    Alert.alert('Notifications are off', 'Turn on notifications for Salary Survival in your phone Settings to get reminders.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return false;
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Changes reminder settings. Turning a reminder on asks for permission first; resolves whether it was saved. */
export async function updateReminders(patch: Partial<ReminderSettings>): Promise<boolean> {
  const turningOn = (patch.daily && !settings.daily) || (patch.payday && !settings.payday);
  if (turningOn && !(await ensurePermission())) return false;
  save({ ...settings, ...patch });
  return true;
}

export type ReminderState = {
  /** Something was logged today, so today's nudge isn't needed. */
  loggedToday: boolean;
  streak: number;
  /** Next payday (YYYY-MM-DD), when there is a live salary cycle. */
  payday: string | null;
};

function at(base: Date, days: number, hour: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Replaces every scheduled reminder with ones that match the current settings and data. */
export async function scheduleReminders(state: ReminderState) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(settings.daily || settings.payday)) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  const now = new Date();
  const jobs: Notifications.NotificationRequestInput[] = [];

  if (settings.daily) {
    // A week ahead, refreshed whenever the app opens or something is logged.
    for (let day = 0; day < 7; day++) {
      const when = at(now, day, settings.hour);
      if (when <= now || (day === 0 && state.loggedToday)) continue;
      const content =
        day === 0 && state.streak > 0
          ? { title: `🔥 Your ${state.streak}-day streak is waiting`, body: 'Log today’s spending to keep it alive.' }
          : { title: '📒 Log today’s spending', body: 'It takes a few seconds and keeps your streak going.' };
      jobs.push({
        content: { ...content, data: { url: '/' } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }

  if (settings.payday && state.payday) {
    const payday = fromDateKey(state.payday);
    const eve = at(payday, -1, 10);
    const morning = at(payday, 0, 9);
    if (eve > now) {
      jobs.push({
        content: { title: '🎉 Payday tomorrow', body: 'One more day and you’ve survived this salary. Hold the line!', data: { url: '/' } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: eve, channelId: CHANNEL },
      });
    }
    if (morning > now) {
      jobs.push({
        content: { title: '💰 It’s payday!', body: 'Add your new salary to start a fresh survival run.', data: { url: '/salary' } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: morning, channelId: CHANNEL },
      });
    }
  }

  await Promise.all(jobs.map((job) => Notifications.scheduleNotificationAsync(job)));
}
