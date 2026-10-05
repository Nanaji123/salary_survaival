import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Accent } from '@/constants/theme';

const COLORS = [Accent.lime, '#FFC93C', '#FF8A50', '#FF6FA8', '#FFFFFF'];

type Piece = { angle: number; distance: number; size: number; spin: number; color: string; round: boolean };

/** A one-shot burst of confetti from the centre of its parent. Purely decorative. */
export function ConfettiBurst({
  count = 28,
  spread = 150,
  delay = 0,
  colors = COLORS,
}: {
  count?: number;
  spread?: number;
  delay?: number;
  colors?: string[];
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [t, delay]);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2 + (i % 3) * 0.21,
        distance: spread * (0.55 + ((i * 37) % 45) / 100),
        size: 6 + (i % 3) * 2,
        spin: ((i % 5) - 2) * 180,
        color: colors[i % colors.length],
        round: i % 4 === 0,
      })),
    [count, spread, colors],
  );

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} t={t} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, t }: { piece: Piece; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: p === 0 ? 0 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      transform: [
        { translateX: Math.cos(piece.angle) * piece.distance * p },
        // A little gravity pulls the pieces down as they spread.
        { translateY: Math.sin(piece.angle) * piece.distance * p + 90 * p * p },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 1.6,
          borderRadius: piece.round ? piece.size / 2 : 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
});
