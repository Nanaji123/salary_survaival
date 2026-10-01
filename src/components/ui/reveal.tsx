import Animated, { FadeInDown } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

/** Fades and lifts its children in; stagger a list by passing an increasing `index`. */
export function Reveal({
  index = 0,
  style,
  children,
}: {
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(420).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}
