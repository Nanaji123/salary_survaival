import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { Fonts } from '@/constants/theme';

/** Plain text button for modal headers (Cancel, Done). */
export function HeaderTextButton({
  title,
  onPress,
  bold,
}: {
  title: string;
  onPress: () => void;
  bold?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6 })}>
      <Text variant="label" color="primaryInk" style={bold && { ...Fonts.bold }}>
        {title}
      </Text>
    </Pressable>
  );
}
