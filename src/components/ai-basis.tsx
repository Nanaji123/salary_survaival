import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { EmojiImage } from '@/components/ui/emoji';
import { Text } from '@/components/ui/text';
import type { EmojiName } from '@/constants/emoji';
import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';

export type BasisRow = { emoji: EmojiName; label: string; value: string };

/**
 * Confirmation shown before an AI request on a dark surface: what the AI will read, what comes
 * back, what is shared, and the free plan cost. Nothing is sent until the user taps the button.
 */
export function AiBasis({
  title,
  rows,
  result,
  privacy,
  freeNote,
  confirmLabel,
  cancelLabel = 'Not now',
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  rows: BasisRow[];
  /** What the user gets back. */
  result: string;
  /** What leaves the device. */
  privacy: string;
  /** e.g. "Uses 1 of 1 free summaries today"; omitted for Pro. */
  freeNote?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))} style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rows}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i > 0 && styles.rowLine]}>
            <EmojiImage name={r.emoji} size={22} />
            <Text style={styles.label} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.value} numberOfLines={1}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.note}>
        <EmojiImage name="sparkles" size={16} />
        <Text style={styles.noteText}>{result}</Text>
      </View>
      <View style={styles.note}>
        <EmojiImage name="lock" size={16} />
        <Text style={styles.noteText}>{privacy}</Text>
      </View>
      {!!freeNote && (
        <View style={[styles.note, styles.free]}>
          <EmojiImage name="crown" size={16} />
          <Text style={[styles.noteText, { color: '#FFD978' }]}>{freeNote}</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.cta,
          { boxShadow: `0 ${pressed ? 1 : 4}px 0 #86AD2E`, transform: [{ translateY: pressed ? 3 : 0 }] },
        ]}>
        {busy ? <ActivityIndicator color={Accent.ink} /> : <Text style={styles.ctaText}>{confirmLabel}</Text>}
      </Pressable>
      {onCancel && (
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three - 4 },
  title: { color: '#FFFFFF', ...Fonts.bold, fontSize: 15 },
  rows: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  label: { flex: 1, color: 'rgba(255,255,255,0.7)', ...Fonts.medium, fontSize: 13 },
  value: { color: '#FFFFFF', ...Fonts.bold, fontSize: 13, maxWidth: '55%', textAlign: 'right' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, color: 'rgba(255,255,255,0.62)', ...Fonts.medium, fontSize: 12, lineHeight: 17 },
  free: {
    backgroundColor: 'rgba(255,201,60,0.1)',
    borderRadius: Radius.sm,
    padding: 8,
  },
  cta: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  ctaText: { color: Accent.ink, ...Fonts.extrabold, fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { color: 'rgba(255,255,255,0.7)', ...Fonts.semibold, fontSize: 13 },
});
