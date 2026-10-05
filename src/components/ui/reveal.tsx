import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

/** Fades its children in with a smooth ease (no spring); stagger a list by passing an increasing `index`. */
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
    <Animated.View
      entering={FadeIn.delay(index * 60)
        .duration(360)
        .easing(Easing.out(Easing.cubic))}
      style={style}>
      {children}
    </Animated.View>
  );
}
