import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top padding for the scroll view of a tab screen. On iOS the native tabs already inset the first
 * scroll view below the status bar, so adding the safe area again would double the gap.
 */
export function useTabTopInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? 0 : insets.top;
}
