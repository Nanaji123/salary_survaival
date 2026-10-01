import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Spacing } from '@/constants/theme';

const INK = '#0E1116';
const MINT = '#4BE3B0';

/** Branded launch screen shown while the account loads, so the app never flashes the wrong screen. */
export function AnimatedSplash({ onShown }: { onShown: () => void }) {
  const scale = useSharedValue(0.55);
  const ring = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 120 });
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
            'radial-gradient(circle at 50% 42%, rgba(75,227,176,0.22) 0%, transparent 52%), radial-gradient(circle at 100% 100%, rgba(91,91,214,0.16) 0%, transparent 45%)',
        },
      ]}>
      <View style={styles.logoWrap}>
        <Animated.View style={[styles.pulse, pulse]} />
        <Animated.View style={[styles.logo, logo]}>
          <Icon name={Icons.wallet} size={40} color={INK} />
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
    boxShadow: '0 16px 44px rgba(75,227,176,0.45)',
  },
  texts: { alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', fontFamily: Fonts.extrabold, fontSize: 30, letterSpacing: -0.8 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.medium, fontSize: 14 },
});
