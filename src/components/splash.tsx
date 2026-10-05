import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EmojiImage } from '@/components/ui/emoji';
import { Text } from '@/components/ui/text';
import { Accent, Fonts, Spacing } from '@/constants/theme';

// Matches the native splash (app.json) so the hand-over is seamless.
const INK = Accent.ink;
const MINT = Accent.lime;

/** Branded launch screen shown while the account loads, so the app never flashes the wrong screen. */
export function AnimatedSplash({ onShown }: { onShown: () => void }) {
  const scale = useSharedValue(0.8);
  const ring = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    ring.value = withDelay(350, withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), -1));
  }, [scale, ring]);

  const logo = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulse = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.9 }],
  }));

  return (
    <View
      onLayout={onShown}
      style={[
        styles.container,
        {
          experimental_backgroundImage:
            'radial-gradient(circle at 50% 42%, rgba(198,244,90,0.22) 0%, transparent 52%), radial-gradient(circle at 100% 100%, rgba(255,150,60,0.16) 0%, transparent 45%)',
        },
      ]}>
      <View style={styles.logoWrap}>
        <Animated.View style={[styles.pulse, pulse]} />
        <Animated.View style={[styles.logo, logo]}>
          <EmojiImage name="moneyBag" size={60} />
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.texts}>
        <Text style={styles.name}>Salary Survival</Text>
        <Text style={styles.tagline}>Make every salary last the month.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  logoWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 96, height: 96, borderRadius: 32, backgroundColor: MINT },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 44px rgba(198,244,90,0.45)',
  },
  texts: { alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 30, letterSpacing: -0.8 },
  tagline: { color: 'rgba(255,255,255,0.6)', ...Fonts.medium, fontSize: 14 },
});
