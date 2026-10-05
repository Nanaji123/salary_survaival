import { StyleSheet, View } from 'react-native';

import { Gauge } from '@/components/ui/charts';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cycleProgress } from '@/lib/analytics';
import { formatDateKey, formatMoney } from '@/lib/format';
import type { SalaryCycle } from '@/lib/store';

/** Ink hero card: remaining balance, cycle gauge and daily safe-to-spend. */
export function BalanceHero({
  cycle,
  spent,
  currency,
  live,
}: {
  cycle: SalaryCycle;
  spent: number;
  currency: string;
  live: boolean;
}) {
  const theme = useTheme();
  const remaining = cycle.amount - spent;
  const overspent = remaining < 0;
  const progress = cycleProgress(cycle);
  const spentRatio = cycle.amount > 0 ? spent / cycle.amount : 0;
  const perDay = Math.max(0, remaining) / progress.daysLeft;
  const accent = overspent ? '#FF8A80' : theme.heroAccent;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${overspent ? 'rgba(255,110,100,0.28)' : 'rgba(198,244,90,0.22)'} 0%, transparent 55%), linear-gradient(160deg, ${theme.heroAlt}, ${theme.hero})`,
        },
      ]}>
      <View style={styles.top}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="overline" style={{ color: theme.heroMuted }}>
            {overspent ? 'Overspent by' : live ? 'Remaining balance' : 'Saved this cycle'}
          </Text>
          <Text
            variant="hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: overspent ? accent : theme.heroText }}>
            {formatMoney(Math.abs(remaining), currency)}
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            of {formatMoney(cycle.amount, currency)} · paid {formatDateKey(cycle.receivedOn)}
          </Text>
        </View>
        <View style={styles.gauge}>
          <Gauge value={spentRatio} size={92} stroke={7} color={accent} track="rgba(255,255,255,0.12)" />
          <View style={styles.gaugeLabel}>
            <Text style={[styles.gaugeValue, { color: theme.heroText }]}>
              {Math.min(999, Math.round(spentRatio * 100))}%
            </Text>
            <Text style={[styles.gaugeCaption, { color: theme.heroMuted }]}>spent</Text>
          </View>
        </View>
      </View>

      {live && (
        <View style={styles.timeline}>
          <View style={[styles.timelineTrack]}>
            <View style={[styles.timelineFill, { width: `${progress.ratio * 100}%`, backgroundColor: theme.heroMuted }]} />
          </View>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            Day {progress.elapsed} of {progress.total}
          </Text>
        </View>
      )}

      <View style={[styles.stats, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
        <Stat label="Spent" value={formatMoney(spent, currency)} />
        <View style={styles.divider} />
        {live ? (
          <>
            <Stat label="Safe / day" value={formatMoney(Math.floor(perDay), currency)} accent={accent} />
            <View style={styles.divider} />
            <Stat label="Payday in" value={`${progress.daysLeft}d`} />
          </>
        ) : (
          <Stat label="Used" value={`${Math.round(spentRatio * 100)}%`} />
        )}
      </View>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="caption" style={{ color: theme.heroMuted, fontSize: 12 }}>
        {label}
      </Text>
      <Text
        variant="headline"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: accent ?? theme.heroText, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
    boxShadow: '0 18px 40px rgba(18, 22, 28, 0.28)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  gauge: {
    width: 92,
    alignItems: 'center',
    marginTop: 4,
  },
  gaugeLabel: {
    position: 'absolute',
    top: 20,
    alignItems: 'center',
  },
  gaugeValue: {
    ...Fonts.extrabold,
    fontSize: 17,
    lineHeight: 20,
  },
  gaugeCaption: {
    ...Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  timelineTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 12,
  },
});
