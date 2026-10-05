import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Divider } from '@/components/ui/divider';
import { EmojiImage } from '@/components/ui/emoji';
import { Text } from '@/components/ui/text';
import { getCategory, type CategoryId } from '@/constants/categories';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatMoney, fromDateKey, shiftDateKey, todayKey } from '@/lib/format';
import type { Expense } from '@/lib/store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.out(Easing.cubic);

/** Circular progress that sweeps in on mount. */
function Ring({ value, size, stroke, color, track }: { value: number; size: number; stroke: number; color: string; track: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.min(Math.max(value, 0), 1), { duration: 1000, easing: EASE });
  }, [value, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {value > 0 && (
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

/** Dark hero: how much of the salary is used, and whether it will last until payday. */
export function InsightsHero({
  salary,
  spent,
  elapsed,
  total,
  daysLeft,
  receivedOn,
  currency,
}: {
  salary: number;
  spent: number;
  elapsed: number;
  total: number;
  daysLeft: number;
  receivedOn: string;
  currency: string;
}) {
  const theme = useTheme();
  const ratio = salary > 0 ? spent / salary : 0;
  const perDay = spent / Math.max(1, elapsed);
  const leftAtPayday = salary - perDay * total;
  const lastsDays = perDay > 0 ? salary / perDay : total;
  const over = spent > salary;
  const survives = spent === 0 || leftAtPayday >= 0;
  const status = over
    ? { label: 'Over salary', color: '#FF7A70' }
    : survives
      ? { label: spent === 0 ? 'Fresh start' : 'On track', color: Accent.lime }
      : { label: 'Spending fast', color: '#FFB84D' };
  const safePerDay = Math.max(0, salary - spent) / Math.max(1, daysLeft);
  const runsOut = shiftDateKey(receivedOn, Math.floor(lastsDays));

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: theme.hero,
          experimental_backgroundImage: `radial-gradient(circle at 100% 0%, ${Accent.glow} 0%, transparent 55%), radial-gradient(circle at 0% 100%, ${Accent.warmGlow} 0%, transparent 55%)`,
        },
      ]}>
      <View style={styles.between}>
        <Text variant="overline" style={{ color: theme.heroMuted }}>
          Salary used
        </Text>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text variant="caption" style={{ color: '#FFFFFF', ...Fonts.bold }}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.heroMain}>
        <View style={styles.ring}>
          <Ring value={ratio} size={124} stroke={12} color={status.color} track="rgba(255,255,255,0.1)" />
          <View style={styles.ringCenter}>
            <Text style={styles.ringValue}>{Math.round(Math.min(ratio, 9.99) * 100)}%</Text>
            <Text style={styles.ringCaption}>used</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.heroText }}>
            {formatMoney(spent, currency)}
          </Text>
          <Text variant="caption" style={{ color: theme.heroMuted }}>
            spent of {formatMoney(salary, currency)}
          </Text>
          <View style={styles.forecast}>
            <EmojiImage name={survives ? 'trophy' : 'warning'} size={18} />
            <Text variant="caption" style={{ flex: 1, color: '#FFFFFF', ...Fonts.semibold }}>
              {spent === 0
                ? 'Nothing spent yet. Strong start!'
                : survives
                  ? `Payday with ~${formatMoney(Math.round(leftAtPayday), currency, { compact: true })} left`
                  : `Runs out ${fromDateKey(runsOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.heroStats}>
        <HeroStat label="Avg / day" value={formatMoney(Math.round(perDay), currency, { compact: true })} />
        <View style={styles.heroDivider} />
        <HeroStat label="Safe / day" value={formatMoney(Math.floor(safePerDay), currency, { compact: true })} color={Accent.lime} />
        <View style={styles.heroDivider} />
        <HeroStat label="Days left" value={String(daysLeft)} />
      </View>
    </View>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit style={{ color: color ?? '#FFFFFF' }}>
        {value}
      </Text>
    </View>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DayState = 'outside' | 'payday' | 'future' | 'today' | 'zero' | 'under' | 'over';

/**
 * The salary cycle as a real calendar (Monday first). Each day is judged against the daily budget
 * (salary ÷ days in the cycle): green within it, red over it, sparkles for a no-spend day.
 * Tapping a day shows what was spent.
 */
export function SpendCalendar({
  receivedOn,
  payday,
  salary,
  totalDays,
  items,
  currency,
}: {
  receivedOn: string;
  /** First day of the next cycle. */
  payday: string;
  salary: number;
  totalDays: number;
  /** This cycle's expenses. */
  items: Expense[];
  currency: string;
}) {
  const theme = useTheme();
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const allowance = salary / Math.max(1, totalDays);

  const { weeks, byDay, score } = useMemo(() => {
    const byDay = new Map<string, Expense[]>();
    for (const e of items) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
    const lead = (fromDateKey(receivedOn).getDay() + 6) % 7;
    const trail = 6 - ((fromDateKey(payday).getDay() + 6) % 7);
    const start = shiftDateKey(receivedOn, -lead);
    const count = daysBetween(start, payday) + 1 + trail;
    const days = Array.from({ length: count }, (_, i) => shiftDateKey(start, i));
    const weeks: string[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const score = { under: 0, over: 0, zero: 0 };
    for (let d = receivedOn; d < payday && d <= today; d = shiftDateKey(d, 1)) {
      const spent = (byDay.get(d) ?? []).reduce((s, e) => s + e.amount, 0);
      if (spent === 0) {
        if (d < today) score.zero++;
      } else if (spent <= allowance) score.under++;
      else score.over++;
    }
    return { weeks, byDay, score };
  }, [items, receivedOn, payday, today, allowance]);

  function stateOf(d: string): DayState {
    if (d === payday) return 'payday';
    if (d < receivedOn || d > payday) return 'outside';
    if (d > today) return 'future';
    const spent = (byDay.get(d) ?? []).reduce((s, e) => s + e.amount, 0);
    if (spent === 0) return d === today ? 'today' : 'zero';
    return spent <= allowance ? 'under' : 'over';
  }

  const palette: Record<DayState, { bg: string; fg: string }> = {
    outside: { bg: 'transparent', fg: theme.border },
    payday: { bg: Accent.lime, fg: Accent.ink },
    future: { bg: theme.cardAlt, fg: theme.textTertiary },
    today: { bg: theme.card, fg: theme.text },
    zero: { bg: theme.goldSoft, fg: theme.gold },
    under: { bg: theme.primarySoft, fg: theme.primaryInk },
    over: { bg: theme.dangerSoft, fg: theme.danger },
  };

  const selectedItems = byDay.get(selected) ?? [];
  const selectedTotal = selectedItems.reduce((s, e) => s + e.amount, 0);
  const selectedState = stateOf(selected);
  const range = `${fromDateKey(receivedOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fromDateKey(payday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={styles.between}>
        <View>
          <Text variant="label" style={Fonts.bold}>
            {range}
          </Text>
          <Text variant="caption" color="textSecondary">
            Daily budget {formatMoney(Math.floor(allowance), currency)}
          </Text>
        </View>
        <EmojiImage name="banknote" size={26} />
      </View>

      <View style={styles.score}>
        <ScorePill color={theme.primary} bg={theme.primarySoft} value={score.under} label="on budget" />
        <ScorePill color={theme.danger} bg={theme.dangerSoft} value={score.over} label="over" />
        <ScorePill emoji="sparkles" bg={theme.goldSoft} value={score.zero} label="no-spend" />
      </View>

      <View>
        <View style={styles.week}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[styles.weekday, { color: i >= 5 ? theme.fire : theme.textTertiary }]}>
              {w}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]} style={styles.week}>
            {week.map((d) => {
              const state = stateOf(d);
              const colors = palette[state];
              const spent = (byDay.get(d) ?? []).reduce((s, e) => s + e.amount, 0);
              const isSelected = d === selected && state !== 'outside';
              return (
                <Pressable
                  key={d}
                  disabled={state === 'outside'}
                  accessibilityRole="button"
                  accessibilityLabel={`${fromDateKey(d).toDateString()}, ${formatMoney(spent, currency)}`}
                  onPress={() => setSelected(d)}
                  style={styles.cellWrap}>
                  <View
                    style={[
                      styles.cell,
                      {
                        backgroundColor: colors.bg,
                        borderColor: isSelected ? theme.text : d === today ? theme.fire : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.cellDay, { color: colors.fg }]}>{fromDateKey(d).getDate()}</Text>
                    {state === 'payday' ? (
                      <EmojiImage name="banknote" size={14} />
                    ) : state === 'zero' ? (
                      <EmojiImage name="sparkles" size={12} />
                    ) : spent > 0 ? (
                      <Text style={[styles.cellAmount, { color: colors.fg }]} numberOfLines={1}>
                        {formatMoney(Math.round(spent), currency, { compact: true })}
                      </Text>
                    ) : (
                      <View style={{ height: 12 }} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Divider />

      <Animated.View key={selected} entering={FadeIn.duration(220)} style={{ gap: Spacing.two }}>
        <View style={styles.between}>
          <Text variant="label" style={Fonts.bold}>
            {selected === today
              ? 'Today'
              : fromDateKey(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {selectedTotal > 0 && (
            <Text variant="money" style={{ color: selectedTotal > allowance ? theme.danger : theme.primaryInk }}>
              {formatMoney(selectedTotal, currency)}
            </Text>
          )}
        </View>
        {selectedItems.length > 0 ? (
          selectedItems.slice(0, 4).map((e) => (
            <View key={e._id} style={styles.dayItem}>
              <CategoryIcon id={e.category} size={30} />
              <Text variant="caption" numberOfLines={1} style={{ flex: 1, ...Fonts.semibold }}>
                {e.title}
              </Text>
              <Text variant="caption" style={Fonts.bold}>
                {formatMoney(e.amount, currency)}
              </Text>
            </View>
          ))
        ) : (
          <Text variant="caption" color="textSecondary">
            {selectedState === 'payday'
              ? 'Payday! A new salary cycle starts here.'
              : selectedState === 'future'
                ? `Coming up. Keep it under ${formatMoney(Math.floor(allowance), currency)} to stay green.`
                : selectedState === 'today'
                  ? 'Nothing logged yet today.'
                  : 'No spending this day. Nice!'}
          </Text>
        )}
      </Animated.View>
    </Card>
  );
}

function ScorePill({
  color,
  emoji,
  bg,
  value,
  label,
}: {
  color?: string;
  emoji?: EmojiName;
  bg: string;
  value: number;
  label: string;
}) {
  return (
    <View style={[styles.scorePill, { backgroundColor: bg }]}>
      {emoji ? <EmojiImage name={emoji} size={13} /> : <View style={[styles.scoreDot, { backgroundColor: color }]} />}
      <Text variant="caption" style={Fonts.bold}>
        {value} {label}
      </Text>
    </View>
  );
}

/** One stacked bar for the whole split, then each category ranked with its share. */
export function CategoryBreakdown({
  categories,
  spent,
  currency,
}: {
  categories: { id: CategoryId; amount: number }[];
  spent: number;
  currency: string;
}) {
  const theme = useTheme();
  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={[styles.stack, { backgroundColor: theme.cardAlt }]}>
        {categories.map((c) => (
          <View key={c.id} style={{ flex: c.amount, backgroundColor: getCategory(c.id).color }} />
        ))}
      </View>
      {categories.map((c, i) => {
        const cat = getCategory(c.id);
        const share = spent > 0 ? c.amount / spent : 0;
        return (
          <View key={c.id} style={styles.catRow}>
            <CategoryIcon id={c.id} size={40} />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={styles.between}>
                <View style={styles.catName}>
                  <Text variant="label" numberOfLines={1} style={{ flexShrink: 1, ...Fonts.bold }}>
                    {cat.label}
                  </Text>
                  {i === 0 && categories.length > 1 && <EmojiImage name="crown" size={14} />}
                </View>
                <Text variant="money">{formatMoney(c.amount, currency)}</Text>
              </View>
              <View style={styles.between}>
                <View style={[styles.catTrack, { backgroundColor: theme.cardAlt }]}>
                  <View style={{ width: `${share * 100}%`, height: '100%', borderRadius: 3, backgroundColor: cat.color }} />
                </View>
                <Text variant="caption" color="textSecondary" style={styles.catPct}>
                  {Math.round(share * 100)}%
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export type Unlockable = { title: string; requirement: string; have: number; need: number; emoji: EmojiName };

/** Every chart still waiting for data, as one checklist instead of a pile of empty cards. */
export function UnlockCard({ items }: { items: Unlockable[] }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <Text variant="label" style={Fonts.bold}>
            Unlock more insights
          </Text>
          <Text variant="caption" color="textSecondary">
            Keep logging and these charts appear here.
          </Text>
        </View>
        <EmojiImage name="lock" size={28} />
      </View>
      {items.map((u, i) => (
        <View key={u.title} style={{ gap: Spacing.three - 4 }}>
          {i > 0 && <Divider inset={46} />}
          <View style={styles.unlockRow}>
            <View style={[styles.unlockIcon, { backgroundColor: theme.goldSoft }]}>
              <EmojiImage name={u.emoji} size={22} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.between}>
                <Text variant="label" style={{ fontSize: 13, ...Fonts.bold }}>
                  {u.title}
                </Text>
                <Text variant="caption" style={{ color: theme.gold, ...Fonts.extrabold }}>
                  {Math.min(u.have, u.need)}/{u.need}
                </Text>
              </View>
              <View style={[styles.unlockTrack, { backgroundColor: theme.cardAlt }]}>
                <View
                  style={{
                    width: `${(Math.min(u.have, u.need) / u.need) * 100}%`,
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: theme.gold,
                  }}
                />
              </View>
              <Text variant="caption" color="textSecondary" style={{ fontSize: 11 }}>
                {u.requirement}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  hero: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.gutter,
    gap: Spacing.three,
    boxShadow: '0 14px 34px rgba(22, 20, 15, 0.26)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.gutter },
  ring: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 26, lineHeight: 30 },
  ringCaption: { color: 'rgba(255,255,255,0.55)', ...Fonts.semibold, fontSize: 11, lineHeight: 14 },
  forecast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },

  score: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  week: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', ...Fonts.bold, fontSize: 11, marginBottom: 6 },
  cellWrap: { width: `${100 / 7}%`, padding: 2.5 },
  cell: {
    aspectRatio: 0.86,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellDay: { ...Fonts.bold, fontSize: 13, lineHeight: 16 },
  cellAmount: { ...Fonts.bold, fontSize: 9, lineHeight: 12 },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },

  stack: { height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  catName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catPct: { width: 36, textAlign: 'right', ...Fonts.bold },

  unlockRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three - 4 },
  unlockIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
});
  