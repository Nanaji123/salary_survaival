import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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
