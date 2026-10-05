import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Text } from '@/components/ui/text';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cycleProgress } from '@/lib/analytics';
import { formatDateKey, formatMoney } from '@/lib/format';
import { survivalHealth, type levelInfo, type Quest, type todayRation, type Trophy } from '@/lib/game';
import type { SalaryCycle } from '@/lib/store';

const HP_COLORS = { strong: Accent.lime, hurt: '#FFC93C', critical: '#FF7A70', ko: '#FF7A70' } as const;

/** Progress bar that fills smoothly on mount and on change, with an optional segmented "health bar" look. */
export function AnimatedBar({
  value,
  color,
  track,
  height = 10,
  segments,
  gapColor,
  delay = 150,
}: {
  value: number;
  color: string;
  track: string;
  height?: number;
  segments?: number;
  /** Colour of the notches between segments; match the surface behind the bar. */
  gapColor?: string;
  delay?: number;
}) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      delay,
      withTiming(Math.min(Math.max(value, 0), 1), { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [value, delay, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, fillStyle]}>
        {/* Glossy highlight along the top of the fill. */}
        <View
          style={{
            position: 'absolute',
            top: height * 0.18,
            left: height * 0.4,
            right: height * 0.4,
            height: Math.max(2, height * 0.22),
            borderRadius: height,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />
      </Animated.View>
      {!!segments && (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]} pointerEvents="none">
          {Array.from({ length: segments }, (_, i) => (
            <View
              key={i}
              style={{ flex: 1, borderRightWidth: i < segments - 1 ? 3 : 0, borderColor: gapColor ?? track }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function HeroPill({ emoji, text, color }: { emoji: EmojiName; text: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.pill}>
      <EmojiImage name={emoji} size={15} />
      <Text variant="caption" style={{ color: color ?? theme.heroText, ...Fonts.bold }}>
        {text}
      </Text>
    </View>
  );
}

function HeroStat({ emoji, label, value, color }: { emoji: EmojiName; label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        <EmojiImage name={emoji} size={14} />
        <Text variant="caption" numberOfLines={1} style={{ color: theme.heroMuted, fontSize: 11 }}>
          {label}
        </Text>
      </View>
      <Text
        variant="headline"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: color ?? theme.heroText, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/** The live cycle as a survival run: money left, an HP bar against the calendar, and today's ration. */
export function SurvivalHero({
  cycle,
  spent,
  currency,
  streak,
  ration,
}: {
  cycle: SalaryCycle;
  spent: number;
  currency: string;
  streak: number;
  ration: ReturnType<typeof todayRation>;
}) {
  const theme = useTheme();
  const progress = cycleProgress(cycle);
  const health = survivalHealth(cycle, spent);
  const remaining = cycle.amount - spent;
  const hpColor = HP_COLORS[health.state];

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${
            health.state === 'ko' ? 'rgba(255,110,100,0.26)' : Accent.glow
          } 0%, transparent 55%), radial-gradient(circle at 0% 100%, ${Accent.warmGlow} 0%, transparent 55%)`,
        },
      ]}>
      <View style={styles.heroTop}>
        <HeroPill emoji="sun" text={`Day ${progress.elapsed} of ${progress.total}`} />
        <HeroPill
          emoji="fire"
          text={streak > 0 ? `${streak}-day streak` : 'No streak yet'}
          color={streak > 0 ? '#FFB37A' : theme.heroMuted}
        />
      </View>

      <View style={styles.heroMain}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" style={{ color: theme.heroMuted }}>
            {remaining < 0 ? 'Overspent by' : 'Money left'}
          </Text>
          <Text
            variant="hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: remaining < 0 ? HP_COLORS.ko : theme.heroText }}>
            {formatMoney(Math.abs(remaining), currency)}
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            of {formatMoney(cycle.amount, currency)} · paid {formatDateKey(cycle.receivedOn)}
          </Text>
        </View>
        <EmojiImage name={health.state === 'ko' ? 'warning' : 'moneyBag'} size={68} />
      </View>

      <View style={{ gap: Spacing.two }}>
        <View style={styles.hpHead}>
          <View style={styles.hpLabel}>
            <EmojiImage name="heart" size={15} />
            <Text variant="overline" style={{ color: theme.heroText }}>
              Salary HP
            </Text>
          </View>
          <Text variant="caption" style={{ color: hpColor, ...Fonts.bold }}>
            {health.label} · {Math.round(health.hp * 100)}%
          </Text>
        </View>
        <AnimatedBar
          value={health.hp}
          color={hpColor}
          track="rgba(255,255,255,0.1)"
          height={14}
          segments={10}
          gapColor={theme.hero}
        />
      </View>

      <View style={styles.stats}>
        <HeroStat
          emoji="coin"
          label="Left today"
          value={formatMoney(Math.max(0, Math.floor(ration.left)), currency)}
          color={ration.under ? Accent.lime : HP_COLORS.ko}
        />
        <View style={styles.statDivider} />
        <HeroStat emoji="banknote" label="Spent" value={formatMoney(spent, currency)} />
        <View style={styles.statDivider} />
        <HeroStat emoji="alarm" label="Payday in" value={`${progress.daysLeft}d`} />
      </View>
    </View>
  );
}

/** Level, XP progress and today's quests in one card. Completed daily quests are claimed for XP. */
export function LevelCard({
  level,
  xpToday,
  quests,
  onQuest,
  onClaim,
}: {
  level: ReturnType<typeof levelInfo>;
  xpToday: number;
  quests: Quest[];
  /** Opens the screen that completes a quest. */
  onQuest: (quest: Quest) => void;
  /** Claims a completed quest; resolves to the XP awarded. */
  onClaim: (quest: Quest) => Promise<number>;
}) {
  const theme = useTheme();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; xp: number; n: number } | null>(null);
  const done = quests.filter((q) => q.status === 'claimed').length;

  async function claim(q: Quest) {
    if (claiming) return;
    setClaiming(q.id);
    try {
      const xp = await onClaim(q);
      if (xp > 0) setBurst((b) => ({ id: q.id, xp, n: (b?.n ?? 0) + 1 }));
    } finally {
      setClaiming(null);
    }
  }

  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={styles.levelRow}>
        <View style={[styles.levelTile, { backgroundColor: theme.goldSoft }]}>
          <EmojiImage name={level.emoji} size={34} />
          <View style={[styles.levelBadge, { backgroundColor: theme.text, borderColor: theme.card }]}>
            <Text style={[styles.levelBadgeText, { color: theme.card }]}>{level.level}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.between}>
            <Text variant="label" numberOfLines={1} style={{ flex: 1, ...Fonts.bold }}>
              {level.title}
            </Text>
            <View style={[styles.xpPill, { backgroundColor: theme.goldSoft }]}>
              <EmojiImage name="star" size={12} />
              <Text variant="caption" style={{ color: theme.gold, ...Fonts.extrabold, fontSize: 11 }}>
                {level.xp} XP
              </Text>
            </View>
          </View>
          <AnimatedBar value={level.progress} color={theme.gold} track={theme.cardAlt} height={10} delay={250} />
          <Text variant="caption" color="textSecondary" style={{ fontSize: 11 }}>
            {level.needed - level.into} XP to level {level.level + 1}
            {xpToday > 0 ? ` · +${xpToday} today` : ''}
          </Text>
        </View>
      </View>

      <Divider />

      <View style={styles.between}>
        <Text variant="overline" color="textSecondary">
          Daily quests
        </Text>
        <Text variant="caption" style={{ ...Fonts.bold, color: done === quests.length ? theme.primaryInk : theme.textSecondary }}>
          {done}/{quests.length} done
        </Text>
      </View>

      <View style={{ gap: Spacing.two }}>
        {quests.map((q) => {
          const ready = q.status === 'ready';
          const claimed = q.status === 'claimed';
          return (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={`${q.title}. ${q.detail}. ${
                claimed ? 'Claimed' : ready ? `Claim ${q.xp} XP` : `${q.xp} XP`
              }`}
              disabled={claimed || claiming === q.id}
              onPress={() => (ready ? claim(q) : onQuest(q))}
              style={({ pressed }) => [
                styles.quest,
                {
                  backgroundColor: claimed ? theme.primarySoft : ready ? theme.goldSoft : theme.cardAlt,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <View style={[styles.questIcon, { backgroundColor: theme.card }]}>
                <EmojiImage name={q.emoji} size={22} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="label" numberOfLines={1} style={{ fontSize: 13 }}>
                  {q.title}
                </Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ fontSize: 11 }}>
                  {q.detail}
                </Text>
              </View>
              {claimed ? (
                <EmojiImage name="check" size={22} />
              ) : ready ? (
                <View style={[styles.claim, { backgroundColor: theme.gold, boxShadow: `0 2px 0 ${theme.fire}` }]}>
                  {claiming === q.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.claimText}>Claim +{q.xp}</Text>
                  )}
                </View>
              ) : (
                <View style={[styles.reward, { backgroundColor: theme.card }]}>
                  <Text variant="caption" style={{ color: theme.textSecondary, ...Fonts.extrabold, fontSize: 11 }}>
                    +{q.xp} XP
                  </Text>
                </View>
              )}
              {burst?.id === q.id && <XpBurst key={burst.n} xp={burst.xp} />}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/** "+15 XP" that rises and fades out over a claimed quest. */
function XpBurst({ xp }: { xp: number }) {
  const theme = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateY: -28 * t.value }],
  }));
  return (
    <Animated.Text pointerEvents="none" style={[styles.burst, { color: theme.gold }, style]}>
      +{xp} XP
    </Animated.Text>
  );
}

/** Horizontal shelf of trophies; locked ones are faded with a padlock and show how to earn them. */
export function TrophyShelf({ trophies }: { trophies: Trophy[] }) {
  const theme = useTheme();
  const unlocked = trophies.filter((t) => t.unlocked).length;
  // Earned trophies first so progress is visible without scrolling.
  const ordered = [...trophies].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  return (
    <View style={{ gap: Spacing.three - 4 }}>
      <View style={[styles.between, { paddingHorizontal: Spacing.one }]}>
        <Text variant="headline">Trophies</Text>
        <Text variant="caption" color="textSecondary" style={{ ...Fonts.bold }}>
          {unlocked}/{trophies.length} unlocked
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -Spacing.gutter }}
        contentContainerStyle={{ gap: Spacing.two + 2, paddingHorizontal: Spacing.gutter, paddingVertical: 4 }}>
        {ordered.map((t) => (
          <Card
            key={t.id}
            accessible
            accessibilityLabel={`${t.title}, ${t.unlocked ? 'unlocked' : `locked. ${t.hint}`}`}
            style={[styles.trophy, !t.unlocked && { backgroundColor: theme.cardAlt, boxShadow: undefined }]}>
            <View style={{ opacity: t.unlocked ? 1 : 0.3 }}>
              <EmojiImage name={t.emoji} size={40} />
            </View>
            {!t.unlocked && <EmojiImage name="lock" size={15} style={styles.lock} />}
            <Text variant="caption" numberOfLines={1} style={{ ...Fonts.bold }}>
              {t.title}
            </Text>
            <Text
              variant="caption"
              numberOfLines={2}
              style={{ fontSize: 10, lineHeight: 13, textAlign: 'center', color: t.unlocked ? theme.primaryInk : theme.textTertiary }}>
              {t.unlocked ? 'Unlocked' : t.hint}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
    boxShadow: '0 18px 40px rgba(22, 20, 15, 0.3)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hpHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hpLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stat: { flex: 1, gap: 3 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 10,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { ...Fonts.extrabold, fontSize: 11, lineHeight: 14 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 10,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  questIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reward: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  claim: {
    minWidth: 76,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimText: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 12 },
  burst: {
    position: 'absolute',
    right: 14,
    top: 4,
    ...Fonts.extrabold,
    fontSize: 14,
  },
  trophy: {
    width: 104,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
  },
  lock: { position: 'absolute', top: 8, right: 8 },
});
