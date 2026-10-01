import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let askedThisLaunch = false;

/**
 * Asks for the permissions the app uses, one system prompt after the other:
 * notifications (payday and budget reminders) and the microphone (voice entry).
 * Anything already granted, or blocked by the user, is skipped. Refusing is fine; the
 * voice assistant explains how to enable the microphone when it is needed.
 */
export async function requestOnboardingPermissions() {
  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the notification prompt once a channel exists.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
  } catch {
    // Not available on this platform (e.g. web); skip.
  }
  try {
    const current = await getRecordingPermissionsAsync();
    if (!current.granted && current.canAskAgain) await requestRecordingPermissionsAsync();
  } catch {
    // Not available on this platform; skip.
  }
}

/** Once per app launch, asks for any permission that has not been granted yet. */
export async function ensurePermissionsOnLaunch() {
  if (askedThisLaunch) return;
  askedThisLaunch = true;
  await requestOnboardingPermissions();
}
