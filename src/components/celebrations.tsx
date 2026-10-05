import { levelFor, Trophies, type TrophyId } from '@convex/gameRules';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { AnimatedBar } from '@/components/game';
import { ConfettiBurst } from '@/components/ui/confetti';
import { EmojiImage } from '@/components/ui/emoji';
import { Text } from '@/components/ui/text';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';
import { levelInfo, TROPHY_EMOJI } from '@/lib/game';
import { useGameProgress } from '@/lib/store';

const EASE = Easing.out(Easing.cubic);
const GOLD = '#FFC93C';

type Celebration =
  | { kind: 'level'; id: number; from: number; to: number; xp: number }
  | { kind: 'trophy'; id: number; trophy: TrophyId };

type Toast = { id: number; xp: number };

const haptic = (style: 'success' | 'heavy') => {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Watches the XP stored on the backend and celebrates every gain, wherever it came from.
 * Level-ups and new trophies get a full-screen moment (queued, one after another);
 * other XP gets a toast at the top.
 */
export function CelebrationHost() {
  const progress = useGameProgress();
  const seen = useRef<{ xp: number; trophies: string[]; ready: boolean } | null>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showing, setShowing] = useState<Celebration | null>(null);

  useEffect(() => {
    if (!progress) return;
    const before = seen.current;
    seen.current = { xp: progress.xp, trophies: progress.trophies.map((t) => t.id), ready: progress.ready };
    // The first value is the starting point, and the one-time backfill of an older account isn't new XP.
    if (!before || !before.ready || progress.xp <= before.xp) return;

    const id = Date.now();
    const big: Celebration[] = progress.trophies
      .filter((t) => !before.trophies.includes(t.id))
      .map((t, i) => ({ kind: 'trophy' as const, id: id + i, trophy: t.id as TrophyId }));
    const from = levelFor(before.xp).level;
    const to = levelFor(progress.xp).level;
    if (to > from) big.push({ kind: 'level', id: id + 99, from, to, xp: progress.xp });

    if (big.length) setQueue((q) => [...q, ...big]);
    else {
      setToast({ id, xp: progress.xp - before.xp });
      haptic('success');
    }
  }, [progress]);

  // Show the next queued moment after a short pause, so a closing sheet can finish its animation.
  useEffect(() => {
    if (showing || queue.length === 0) return;
    const t = setTimeout(() => {
      setShowing(queue[0]);
      setQueue((q) => q.slice(1));
    }, 450);
    return () => clearTimeout(t);
  }, [showing, queue]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      {toast && <XpToast key={toast.id} xp={toast.xp} />}
      {showing && <CelebrationModal key={showing.id} item={showing} onClose={() => setShowing(null)} />}
    </>
  );
}

/** Top toast for everyday XP: a coin that flips and a number that counts up. */
function XpToast({ xp }: { xp: number }) {
  const insets = useSafeAreaInsets();
  const flip = useSharedValue(0);
  useEffect(() => {
    flip.value = withDelay(150, withTiming(2, { duration: 900, easing: EASE }));
  }, [flip]);
  const coin = useAnimatedStyle(() => ({ transform: [{ perspective: 400 }, { rotateY: `${flip.value * 360}deg` }] }));

  return (
    <View pointerEvents="none" style={[styles.toastHost, { top: insets.top + 6 }]}>
      <Animated.View
        entering={FadeInUp.duration(320).easing(EASE)}
        exiting={FadeOutUp.duration(240)}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Plus ${xp} XP`}
        style={styles.toast}>
        <Animated.View style={coin}>
          <EmojiImage name="coin" size={30} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toastTitle}>XP earned</Text>
          <Text style={styles.toastDetail}>Keep logging to level up</Text>
        </View>
        <View style={styles.toastXp}>
          <CountText to={xp} prefix="+" suffix=" XP" style={styles.toastXpText} />
        </View>
      </Animated.View>
    </View>
  );
}

function CountText({
  to,
  prefix = '',
  suffix = '',
  style,
  delay = 200,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  style: object;
  delay?: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const begin = Date.now() + delay;
    const step = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - begin) / 700));
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, delay]);
  return (
    <Text style={style}>
      {prefix}
      {n}
      {suffix}
    </Text>
  );
}

/** Slowly turning rays of light behind the hero artwork. */
function Sunburst({ color, size = 380 }: { color: string; size?: number }) {
  const spin = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    fade.value = withTiming(1, { duration: 700, easing: EASE });
  }, [spin, fade]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.7 + 0.3 * fade.value }],
  }));
  const c = size / 2;
  const rays = 14;
  const half = (Math.PI / rays) * 0.42;
  const paths = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2;
    const x1 = c + Math.cos(a - half) * c;
    const y1 = c + Math.sin(a - half) * c;
    const x2 = c + Math.cos(a + half) * c;
    const y2 = c + Math.sin(a + half) * c;
    return `M ${c} ${c} L ${x1} ${y1} A ${c} ${c} 0 0 1 ${x2} ${y2} Z`;
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.sunburst, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.55" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {paths.map((d, i) => (
          <Path key={i} d={d} fill="url(#ray)" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The hero artwork: grows in, then floats gently with a pulsing glow behind it. */
function HeroArt({ emoji, glow }: { emoji: EmojiName; glow: string }) {
  const grow = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.exp) });
    float.value = withDelay(
      650,
      withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1, false),
    );
  }, [grow, float]);
  const art = useAnimatedStyle(() => ({
    opacity: grow.value,
    transform: [{ translateY: -8 * float.value }, { scale: 0.4 + 0.6 * grow.value }, { rotate: `${(1 - grow.value) * -25}deg` }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.35 * float.value,
    transform: [{ scale: (0.6 + 0.4 * grow.value) * (1 + 0.08 * float.value) }],
  }));
  return (
    <>
      <Animated.View style={[styles.halo, { backgroundColor: glow, boxShadow: `0 0 80px 30px ${glow}` }, halo]} />
      <Animated.View style={art}>
        <EmojiImage name={emoji} size={132} />
      </Animated.View>
    </>
  );
}

/** "2 → 3": the old level rolls up and away as the new one rolls in. */
function LevelRoll({ from, to }: { from: number; to: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(650, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }));
  }, [t]);
  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -70 * t.value }] }));
  const newStyle = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: 70 * (1 - t.value) }] }));
  return (
    <View style={styles.roll}>
      <Animated.Text style={[styles.rollText, oldStyle]}>{from}</Animated.Text>
      <Animated.Text style={[styles.rollText, styles.rollNew, newStyle]}>{to}</Animated.Text>
    </View>
  );
}

function CelebrationModal({ item, onClose }: { item: Celebration; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    haptic('success');
    const t = setTimeout(() => haptic('heavy'), 650);
    return () => clearTimeout(t);
  }, []);

  const level = item.kind === 'level' ? levelInfo(item.xp) : null;
  const trophy = item.kind === 'trophy' ? Trophies.find((t) => t.id === item.trophy) : undefined;
  const color = item.kind === 'level' ? Accent.lime : GOLD;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(260)} style={[styles.backdrop, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.stage} pointerEvents="none">
          <Sunburst color={color} />
          <ConfettiBurst count={36} spread={190} delay={250} />
          <HeroArt emoji={level ? level.emoji : trophy ? TROPHY_EMOJI[trophy.id] : 'trophy'} glow={`${color}55`} />
        </View>

        <Animated.Text entering={FadeInDown.delay(250).duration(420).easing(EASE)} style={[styles.kicker, { color }]}>
          {level ? 'LEVEL UP!' : 'TROPHY UNLOCKED'}
        </Animated.Text>

        {level && item.kind === 'level' ? (
          <>
            <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.levelLine}>
              <Text style={styles.levelWord}>Level</Text>
              <LevelRoll from={item.from} to={item.to} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(900).duration(400).easing(EASE)} style={styles.name}>
              You’re now a {level.title}
            </Animated.Text>
            <Animated.View entering={FadeIn.delay(1000).duration(300)} style={styles.barWrap}>
              <AnimatedBar
                value={level.progress}
                color={Accent.lime}
                track="rgba(255,255,255,0.12)"
                height={12}
                delay={1100}
              />
              <Text style={styles.barCaption}>
                {level.into} / {level.needed} XP to level {level.level + 1}
              </Text>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.Text entering={FadeInDown.delay(400).duration(420).easing(EASE)} style={styles.trophyName}>
              {trophy?.title}
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(600).duration(400)} style={styles.name}>
              {trophy?.hint}
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(800).duration(400).easing(EASE)} style={styles.bonus}>
              <EmojiImage name="star" size={16} />
              <Text style={styles.bonusText}>+50 XP bonus</Text>
            </Animated.View>
          </>
        )}

        <Animated.View entering={FadeInDown.delay(1200).duration(400).easing(EASE)} style={{ alignSelf: 'stretch' }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: color,
                boxShadow: `0 ${pressed ? 1 : 4}px 0 ${item.kind === 'level' ? '#86AD2E' : '#C99000'}`,
                transform: [{ translateY: pressed ? 3 : 0 }],
              },
            ]}>
            <Text style={styles.ctaText}>{level ? 'Let’s go' : 'Awesome'}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastHost: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 100 },
  toast: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    backgroundColor: Accent.ink,
    borderWidth: 1,
    borderColor: 'rgba(198,244,90,0.35)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.3), 0 0 24px rgba(198,244,90,0.18)',
  },
  toastTitle: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 14, lineHeight: 18 },
  toastDetail: { color: 'rgba(255,255,255,0.6)', ...Fonts.medium, fontSize: 12, lineHeight: 16 },
  toastXp: { backgroundColor: Accent.lime, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  toastXpText: { color: Accent.ink, ...Fonts.extrabold, fontSize: 12, lineHeight: 16 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,11,8,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  stage: { width: 300, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  sunburst: { position: 'absolute' },
  halo: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  kicker: { ...Fonts.extrabold, fontSize: 14, letterSpacing: 3 },
  levelLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelWord: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 40, lineHeight: 48, letterSpacing: -1 },
  roll: { height: 64, minWidth: 44, overflow: 'hidden', justifyContent: 'center' },
  rollText: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.5)',
    ...Fonts.extrabold,
    fontSize: 52,
    lineHeight: 64,
    letterSpacing: -1,
  },
  rollNew: { color: Accent.lime },
  name: { color: 'rgba(255,255,255,0.72)', ...Fonts.semibold, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  trophyName: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, textAlign: 'center' },
  barWrap: { alignSelf: 'stretch', gap: 6, marginTop: Spacing.three },
  barCaption: { color: 'rgba(255,255,255,0.55)', ...Fonts.semibold, fontSize: 12, textAlign: 'center' },
  bonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,201,60,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,60,0.35)',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: Spacing.two,
  },
  bonusText: { color: GOLD, ...Fonts.extrabold, fontSize: 14 },
  cta: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.five,
  },
  ctaText: { color: Accent.ink, ...Fonts.extrabold, fontSize: 16 },
});
