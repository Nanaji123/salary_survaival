import { Image } from 'expo-image';
import type { StyleProp } from 'react-native';
import type { ImageStyle } from 'expo-image';

import { Emoji, type EmojiName } from '@/constants/emoji';

/** 3D emoji artwork. Decorative, so it is hidden from screen readers. */
export function EmojiImage({
  name,
  size = 28,
  style,
}: {
  name: EmojiName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={Emoji[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessible={false}
      transition={0}
    />
  );
}
