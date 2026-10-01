import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Thin semicircular gauge; `value` is 0–1. */
export function Gauge({
  value,
  size = 120,
  stroke = 8,
  color,
  track,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const length = Math.PI * r;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <Svg width={size} height={size / 2 + stroke / 2}>
      <Path d={arc} stroke={track} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      {v > 0 && (
        <Path
          d={arc}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length * v} ${length}`}
        />
      )}
    </Svg>
  );
}

export function ProgressBar({
  value,
  color,
  track,
  height = 8,
}: {
  value: number;
  color: string;
  track?: string;
  height?: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? theme.cardAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

type Segment = { key: string; value: number; color: string };

/** Donut chart with rounded segment caps and a centered label. */
export function Donut({
  segments,
  size = 168,
  stroke = 20,
  children,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = segments.length > 1 ? stroke * 0.9 : 0;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.cardAlt} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * c;
            const visible = Math.max(len - gap, 0.01);
            const el = (
              <Circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${visible} ${c}`}
                strokeDashoffset={-offset - gap / 2}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      </Svg>
      {children}
    </View>
  );
}

/** Vertical bar chart with rounded caps, gentle gridlines and optional highlight. */
export function BarChart({
  data,
  height = 150,
  color,
  highlightIndex,
  highlightColor,
  formatValue,
  maxLabels = 6,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color: string;
  highlightIndex?: number;
  highlightColor?: string;
  formatValue: (v: number) => string;
  maxLabels?: number;
}) {
  const theme = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelEvery = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <View>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height }]}>
          <Text variant="caption" color="textTertiary" style={styles.axisText}>
            {formatValue(max)}
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.axisText}>
            {formatValue(max / 2)}
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.axisText}>
            0
          </Text>
        </View>
        <View style={{ flex: 1, height }}>
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            {[0, 0.5, 1].map((f) => (
              <Line
                key={f}
                x1="0"
                x2="100%"
                y1={f * (height - 1) + 0.5}
                y2={f * (height - 1) + 0.5}
                stroke={theme.border}
                strokeDasharray={f === 1 ? undefined : '3 4'}
                strokeWidth={1}
              />
            ))}
          </Svg>
          <View style={[styles.bars, { height }]}>
            {data.map((d, i) => {
              const h = d.value > 0 ? Math.max((d.value / max) * height, 4) : 0;
              const highlighted = highlightIndex === i;
              return (
                <View key={i} style={styles.barSlot}>
                  <View
                    style={{
                      width: '64%',
                      maxWidth: 22,
                      height: h,
                      borderRadius: 6,
                      backgroundColor: highlighted && highlightColor ? highlightColor : color,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.xAxis}>
        <View style={styles.yAxisSpacer} />
        {/* One label per `labelEvery` bars, each spanning that many slots so it never truncates. */}
        {data
          .map((d, i) => ({ d, i }))
          .filter(({ i }) => i % labelEvery === 0)
          .map(({ d, i }) => (
            <View key={i} style={{ flex: Math.min(labelEvery, data.length - i) }}>
              <Text
                variant="caption"
                color="textTertiary"
                numberOfLines={1}
                style={styles.xLabel}>
                {d.label}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}

/** Paired bars per group (e.g. spent vs saved per salary cycle). */
export function GroupedBars({
  groups,
  height = 150,
  colors,
}: {
  groups: { label: string; values: [number, number] }[];
  height?: number;
  colors: [string, string];
}) {
  const max = Math.max(...groups.flatMap((g) => g.values), 1);
  return (
    <View>
      <View style={[styles.groups, { height }]}>
        {groups.map((g, i) => (
          <View key={i} style={styles.group}>
            {g.values.map((v, j) => (
              <View
                key={j}
                style={{
                  width: 14,
                  height: v > 0 ? Math.max((v / max) * height, 4) : 0,
                  borderRadius: 5,
                  backgroundColor: colors[j],
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.groupLabels}>
        {groups.map((g, i) => (
          <Text key={i} variant="caption" color="textSecondary" style={styles.groupLabel}>
            {g.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function LegendDot({ color }: { color: string }) {
  return (
    <Svg width={10} height={10}>
      <Rect width={10} height={10} rx={3} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  yAxis: {
    width: 44,
    justifyContent: 'space-between',
  },
  yAxisSpacer: {
    width: 44 + Spacing.two,
  },
  axisText: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'right',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 6,
  },
  xLabel: {
    fontSize: 10,
    lineHeight: 12,
    paddingLeft: 2,
  },
  groups: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  groupLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.two,
  },
  groupLabel: {
    width: 40,
    textAlign: 'center',
  },
});

/**
 * Cumulative spending as a smooth area against a dashed "even pace" line from zero to the salary.
 * Staying under the dashed line means the money will last to payday.
 */
export function TrendChart({
  points,
  totalDays,
  limit,
  height = 170,
  color,
  paceColor,
  gridColor,
  labelColor,
  formatValue,
}: {
  points: number[];
  totalDays: number;
  limit: number;
  height?: number;
  color: string;
  paceColor: string;
  gridColor: string;
  labelColor: string;
  formatValue: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const pad = { top: 14, bottom: 6, left: 4, right: 10 };
  const max = Math.max(limit, ...points, 1);
  const w = Math.max(width - pad.left - pad.right, 1);
  const h = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (totalDays <= 1 ? 0 : (i / (totalDays - 1)) * w);
  const y = (v: number) => pad.top + h - (v / max) * h;

  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = points.length - 1;
  const area =
    points.length > 0 ? `${line} L ${x(last).toFixed(1)} ${pad.top + h} L ${x(0).toFixed(1)} ${pad.top + h} Z` : '';

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((f) => (
            <Line
              key={f}
              x1={pad.left}
              x2={pad.left + w}
              y1={pad.top + h * f}
              y2={pad.top + h * f}
              stroke={gridColor}
              strokeDasharray={f === 1 ? undefined : '3 4'}
              strokeWidth={1}
            />
          ))}
          {/* Even pace: spending the whole salary evenly across the cycle. */}
          <Line x1={x(0)} y1={y(0)} x2={x(totalDays - 1)} y2={y(limit)} stroke={paceColor} strokeWidth={1.5} strokeDasharray="5 5" />
          {points.length > 1 && <Path d={area} fill="url(#trendFill)" />}
          {points.length > 0 && <Path d={line} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {points.length > 0 && (
            <>
              <Circle cx={x(last)} cy={y(points[last])} r={7} fill={color} opacity={0.25} />
              <Circle cx={x(last)} cy={y(points[last])} r={4} fill={color} />
            </>
          )}
        </Svg>
      )}
      <Text variant="caption" style={{ position: 'absolute', top: 0, right: 12, color: labelColor, fontSize: 10 }}>
        Salary {formatValue(limit)}
      </Text>
    </View>
  );
}

/** One horizontal bar split into proportional, rounded segments. */
export function StackedBar({ segments, height = 12 }: { segments: { key: string; value: number; color: string }[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', flexDirection: 'row', gap: 2 }}>
      {segments.map((s) => (
        <View key={s.key} style={{ flex: s.value / total, backgroundColor: s.color, borderRadius: height / 2 }} />
      ))}
    </View>
  );
}
