import { ConvexError } from 'convex/values';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

/**
 * Runs an async save with a pending flag, success haptics, and a friendly alert on failure.
 * Resolves to true when the action succeeded.
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);

  async function submit(action: () => Promise<unknown>) {
    if (pending) return false;
    setPending(true);
    try {
      await action();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return true;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data)
          : 'Please check your internet connection and try again.';
      Alert.alert('Could not save', message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return [submit, pending] as const;
}
