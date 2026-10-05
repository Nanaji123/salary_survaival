import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { errorMessage, isLimitError } from '@/lib/limits';

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
      if (isLimitError(error)) {
        router.push('/paywall');
        return false;
      }
      Alert.alert('Could not save', errorMessage(error, 'Please check your internet connection and try again.'));
      return false;
    } finally {
      setPending(false);
    }
  }

  return [submit, pending] as const;
}
