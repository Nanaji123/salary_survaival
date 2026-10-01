import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/ui/category-icon';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import {
  aiErrorMessage,
  applyInterpretation,
  interpretText,
  transcribeAudio,
  type Interpretation,
} from '@/lib/ai';
import { formatDateKey, formatMoney } from '@/lib/format';
import { currentCycle, useAccount, useCycles } from '@/lib/store';

const INK = '#0E1116';
const CARD = 'rgba(255,255,255,0.06)';
const LINE = 'rgba(255,255,255,0.1)';
const MINT = '#4BE3B0';
const MUTED = 'rgba(255,255,255,0.62)';

const EXAMPLES = [
  'Spent 250 on lunch and 80 on a cab',
  'Groceries 1,200 yesterday',
  'Got my salary of 50,000 today',
  'Save 5,000 every month',
  'Set a food budget of 6,000',
];

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'thinking'; label: string }
  | { kind: 'review'; heard: string; result: Interpretation }
  | { kind: 'saving'; heard: string; result: Interpretation }
  | { kind: 'done'; message: string };

function isEmpty(r: Interpretation) {
  return !r.expenses.length && !r.salary && !r.savingsGoal && !r.budgets.length;
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  const currency = account?.currency ?? 'USD';
  const voice = useVoiceRecorder();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [hint, setHint] = useState<string | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (phase.kind !== 'done') return;
    const t = setTimeout(() => router.back(), 1300);
    return () => clearTimeout(t);
  }, [phase.kind]);

  async function understand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;
    setHint(null);
    setPhase({ kind: 'thinking', label: 'Understanding…' });
    try {
      const result = await interpretText(trimmed);
      if (isEmpty(result)) {
        setHint(result.reply || "I couldn't find an expense or salary in that. Try again.");
        setPhase({ kind: 'idle' });
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setText('');
      setPhase({ kind: 'review', heard: trimmed, result });
    } catch (error) {
      setHint(aiErrorMessage(error));
      setPhase({ kind: 'idle' });
    }
  }

  async function onPressIn() {
    if (phase.kind !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHint(null);
    setPhase({ kind: 'listening' });
    try {
      const status = await voice.start();
      if (status !== 'ok') {
        setPhase({ kind: 'idle' });
        if (status === 'blocked') {
          Alert.alert('Microphone is off', 'Allow microphone access in your phone Settings to add expenses by voice.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          setHint('I need the microphone to hear you. Hold the mic again and tap Allow.');
        }
      }
    } catch {
      setPhase({ kind: 'idle' });
      setHint('Could not start the microphone.');
    }
  }

  async function onPressOut() {
    if (phase.kind !== 'listening') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase({ kind: 'thinking', label: 'Listening back…' });
    try {
      const clip = await voice.stop();
      if (!clip) {
        setHint('Hold the mic while you speak, then let go.');
        setPhase({ kind: 'idle' });
        return;
      }
      const heard = await transcribeAudio(clip.audio, clip.mimeType);
      if (!heard) {
        setHint("I didn't catch that. Try again a little closer to the mic.");
        setPhase({ kind: 'idle' });
        return;
      }
      await understand(heard);
    } catch (error) {
      setHint(aiErrorMessage(error));
      setPhase({ kind: 'idle' });
    }
  }

  async function confirm() {
    if (phase.kind !== 'review') return;
    const { heard, result } = phase;
    setPhase({ kind: 'saving', heard, result });
    try {
      const { added, needsSalary } = await applyInterpretation(result, cycle?._id ?? null);
      if (needsSalary) {
        setHint('Add your salary first so I know where to log these expenses.');
        setPhase({ kind: 'review', heard, result });
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const parts = [
        added ? `${added} ${added === 1 ? 'expense' : 'expenses'} added` : null,
        result.salary ? 'salary logged' : null,
        result.savingsGoal ? 'goal saved' : null,
        result.budgets.length ? 'budgets set' : null,
      ].filter(Boolean);
      setPhase({ kind: 'done', message: parts.join(' · ') || 'All done' });
    } catch (error) {
      setHint(aiErrorMessage(error));
      setPhase({ kind: 'review', heard, result });
    }
  }

  function update(next: Interpretation) {
    if (phase.kind !== 'review') return;
    if (isEmpty(next)) setPhase({ kind: 'idle' });
    else setPhase({ ...phase, result: next });
  }

  const listening = phase.kind === 'listening';
  const busy = phase.kind === 'thinking' || phase.kind === 'saving';

  return (
    <View
      style={[
        styles.container,
        {
          experimental_backgroundImage:
            'radial-gradient(circle at 50% 100%, rgba(75,227,176,0.22) 0%, transparent 55%), radial-gradient(circle at 100% 0%, rgba(91,91,214,0.2) 0%, transparent 45%)',
        },
      ]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]}>
          <View style={styles.pill}>
            <Icon name={Icons.sparkles} size={12} color={INK} />
            <Text style={styles.pillText}>AI ASSISTANT</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.close}>
            <Icon name={Icons.close} size={14} color={MUTED} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {phase.kind === 'review' || phase.kind === 'saving' ? (
            <Review
              heard={phase.heard}
              result={phase.result}
              currency={currency}
              saving={phase.kind === 'saving'}
              hint={hint}
              noSalary={!cycle}
              onChange={update}
              onConfirm={confirm}
              onRetry={() => {
                setHint(null);
                setPhase({ kind: 'idle' });
              }}
            />
          ) : phase.kind === 'done' ? (
            <Done message={phase.message} />
          ) : (
            <Animated.View entering={FadeIn.duration(300)} style={styles.intro}>
              <Text style={styles.title}>
                {listening ? 'Listening…' : phase.kind === 'thinking' ? phase.label : 'Just say it.'}
              </Text>
              <Text style={styles.subtitle}>
                {listening
                  ? 'Keep holding while you speak. Let go when you are done.'
                  : busy
                    ? 'One moment'
                    : 'Hold the mic and tell me what you spent, earned or want to save.'}
              </Text>

              {listening && <Waveform level={voice.level} phase={voice.durationMs} />}
              {busy && <ActivityIndicator color={MINT} style={{ marginTop: Spacing.four }} />}

              {!!hint && !listening && !busy && (
                <View style={styles.hint}>
                  <Icon name={Icons.bulb} size={14} color="#FFB84D" />
                  <Text style={styles.hintText}>{hint}</Text>
                </View>
              )}

              {phase.kind === 'idle' && (
                <View style={styles.examples}>
                  <Text style={styles.examplesTitle}>TRY SAYING</Text>
                  {EXAMPLES.map((e, i) => (
                    <Animated.View key={e} entering={FadeInDown.delay(120 + i * 60).duration(380)}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => understand(e)}
                        style={({ pressed }) => [styles.example, pressed && { opacity: 0.6 }]}>
                        <Text style={styles.exampleText}>“{e}”</Text>
                        <Icon name={Icons.arrow} size={12} color={MUTED} />
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {phase.kind !== 'review' && phase.kind !== 'saving' && phase.kind !== 'done' && (
          <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.three }]}>
            <MicButton listening={listening} busy={busy} level={voice.level} onPressIn={onPressIn} onPressOut={onPressOut} />
            <Text style={styles.holdLabel}>{listening ? 'Release to send' : 'Hold to talk'}</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                editable={phase.kind === 'idle'}
                placeholder="Or type: coffee 120, rent 9000…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                selectionColor={MINT}
                returnKeyType="send"
                onSubmitEditing={() => understand(text)}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={!text.trim() || phase.kind !== 'idle'}
                onPress={() => understand(text)}
                style={[styles.send, { opacity: text.trim() ? 1 : 0.35 }]}>
                <Icon name={Icons.arrow} size={16} color={INK} />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Scrolling bars that follow the microphone volume while recording. */
function Waveform({ level, phase }: { level: number; phase: number }) {
  const count = 32;
  return (
    <View style={styles.wave}>
      {Array.from({ length: count }, (_, i) => {
        // Each bar rides its own sine so the row ripples; the voice level sets the overall height.
        const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.55 + phase / 140));
        const edge = Math.sin((i / (count - 1)) * Math.PI);
        const h = 6 + Math.max(0.05, level) * 70 * wobble * (0.4 + 0.6 * edge);
        return <View key={i} style={[styles.waveBar, { height: h, opacity: 0.4 + 0.6 * edge }]} />;
      })}
    </View>
  );
}

/** Big hold-to-talk button with pulsing rings that swell with your voice. */
function MicButton({
  listening,
  busy,
  level,
  onPressIn,
  onPressOut,
}: {
  listening: boolean;
  busy: boolean;
  level: number;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const pulse = useSharedValue(0);
  const press = useSharedValue(1);
  const swell = useSharedValue(0);

  useEffect(() => {
    pulse.value = listening
      ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false)
      : withTiming(0, { duration: 200 });
    press.value = withSpring(listening ? 1.12 : 1, { damping: 12, stiffness: 160 });
  }, [listening, pulse, press]);

  useEffect(() => {
    swell.value = withTiming(listening ? level : 0, { duration: 90 });
  }, [level, listening, swell]);

  const ringA = useAnimatedStyle(() => ({
    opacity: listening ? 0.5 * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + pulse.value * 0.9 + swell.value * 0.3 }],
  }));
  const ringB = useAnimatedStyle(() => {
    const t = (pulse.value + 0.5) % 1;
    return { opacity: listening ? 0.5 * (1 - t) : 0, transform: [{ scale: 1 + t * 0.9 + swell.value * 0.3 }] };
  });
  const core = useAnimatedStyle(() => ({ transform: [{ scale: press.value + swell.value * 0.12 }] }));

  return (
    <View style={styles.micWrap}>
      <Animated.View style={[styles.ring, ringA]} />
      <Animated.View style={[styles.ring, ringB]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to talk"
        disabled={busy}
        onPressIn={onPressIn}
        onPressOut={onPressOut}>
        <Animated.View style={[styles.mic, core, busy && { opacity: 0.5 }]}>
          <Icon name={Icons.mic} size={30} color={INK} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Review({
  heard,
  result,
  currency,
  saving,
  hint,
  noSalary,
  onChange,
  onConfirm,
  onRetry,
}: {
  heard: string;
  result: Interpretation;
  currency: string;
  saving: boolean;
  hint: string | null;
  noSalary: boolean;
  onChange: (r: Interpretation) => void;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const total = useMemo(() => result.expenses.reduce((s, e) => s + e.amount, 0), [result]);
  const blocked = noSalary && !result.salary && result.expenses.length > 0;

  return (
    <Animated.View entering={FadeInDown.duration(380)} style={{ gap: Spacing.three }}>
      <View style={styles.heardBox}>
        <Icon name={Icons.sparkles} size={13} color={MINT} />
        <Text style={styles.heardText}>“{heard}”</Text>
      </View>

      <Text style={styles.reviewTitle}>Here is what I will add</Text>
      {!!result.reply && <Text style={styles.subtitle}>{result.reply}</Text>}

      {result.salary && (
        <ReviewRow
          leading={
            <View style={[styles.glyph, { backgroundColor: MINT }]}>
              <Icon name={Icons.salary} size={17} color={INK} />
            </View>
          }
          title="Salary received"
          subtitle={formatDateKey(result.salary.date)}
          amount={formatMoney(result.salary.amount, currency)}
          positive
          onRemove={() => onChange({ ...result, salary: null })}
        />
      )}

      {result.expenses.map((e, i) => (
        <ReviewRow
          key={`${e.title}-${i}`}
          leading={<CategoryIcon id={e.category} size={40} />}
          title={e.title}
          subtitle={`${getCategory(e.category).label} · ${formatDateKey(e.date)}`}
          amount={`-${formatMoney(e.amount, currency)}`}
          onRemove={() => onChange({ ...result, expenses: result.expenses.filter((_, j) => j !== i) })}
        />
      ))}

      {!!result.savingsGoal && (
        <ReviewRow
          leading={
            <View style={[styles.glyph, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Icon name={Icons.target} size={17} color="#FFFFFF" />
            </View>
          }
          title="Savings goal"
          subtitle="Kept aside from each salary"
          amount={formatMoney(result.savingsGoal, currency)}
          onRemove={() => onChange({ ...result, savingsGoal: null })}
        />
      )}

      {result.budgets.map((b, i) => (
        <ReviewRow
          key={`${b.category}-${i}`}
          leading={<CategoryIcon id={b.category} size={40} />}
          title={`${getCategory(b.category).label} budget`}
          subtitle="Monthly limit"
          amount={formatMoney(b.limit, currency)}
          onRemove={() => onChange({ ...result, budgets: result.budgets.filter((_, j) => j !== i) })}
        />
      ))}

      {result.expenses.length > 1 && (
        <View style={styles.totalRow}>
          <Text style={styles.subtitle}>Total spent</Text>
          <Text style={styles.totalValue}>{formatMoney(total, currency)}</Text>
        </View>
      )}

      {!!hint && (
        <View style={styles.hint}>
          <Icon name={Icons.bulb} size={14} color="#FFB84D" />
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={saving || blocked}
        onPress={onConfirm}
        style={({ pressed }) => [styles.cta, (saving || blocked) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
        {saving ? (
          <ActivityIndicator color={INK} />
        ) : (
          <>
            <Text style={styles.ctaText}>Add to my logs</Text>
            <Icon name={Icons.check} size={16} color={INK} />
          </>
        )}
      </Pressable>
      {blocked && <Text style={styles.hintText}>Add your salary first, then I can log these expenses.</Text>}
      <Pressable accessibilityRole="button" disabled={saving} onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </Animated.View>
  );
}

function ReviewRow({
  leading,
  title,
  subtitle,
  amount,
  positive,
  onRemove,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  amount: string;
  positive?: boolean;
  onRemove: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.row}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.rowAmount, positive && { color: MINT }]}>{amount}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${title}`} hitSlop={10} onPress={onRemove}>
        <Icon name={Icons.close} size={12} color={MUTED} />
      </Pressable>
    </Animated.View>
  );
}

function Done({ message }: { message: string }) {
  const scale = useSharedValue(0.4);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 140 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.done}>
      <Animated.View style={[styles.doneBadge, style]}>
        <Icon name={Icons.check} size={34} color={INK} />
      </Animated.View>
      <Text style={styles.title}>Done</Text>
      <Text style={styles.subtitle}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MINT,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: INK, fontFamily: Fonts.extrabold, fontSize: 11, letterSpacing: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  intro: { gap: Spacing.two },
  title: {
    color: '#FFFFFF',
    fontFamily: Fonts.extrabold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
  },
  subtitle: { color: MUTED, fontFamily: Fonts.medium, fontSize: 15, lineHeight: 22 },
  hint: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,184,77,0.12)',
    borderRadius: Radius.md,
    padding: 12,
    marginTop: Spacing.two,
  },
  hintText: { flex: 1, color: '#FFD9A0', fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  examples: { marginTop: Spacing.five, gap: Spacing.two },
  examplesTitle: { color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  exampleText: { flex: 1, color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 14 },
  wave: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.five,
  },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: MINT },
  bottom: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.gutter,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  micWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MINT,
  },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 34px rgba(75,227,176,0.45)',
  },
  holdLabel: { color: MUTED, fontFamily: Fonts.semibold, fontSize: 13, marginBottom: Spacing.one },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.three,
    paddingRight: 6,
    height: 52,
    alignSelf: 'stretch',
  },
  input: { flex: 1, color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 15, padding: 0 },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heardBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(75,227,176,0.1)',
    borderRadius: Radius.md,
    padding: 12,
  },
  heardText: { flex: 1, color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  reviewTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.extrabold,
    fontSize: 26,
    letterSpacing: -0.6,
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: 12,
  },
  glyph: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 15 },
  rowSub: { color: MUTED, fontFamily: Fonts.medium, fontSize: 12.5 },
  rowAmount: { color: '#FFFFFF', fontFamily: Fonts.extrabold, fontSize: 15, fontVariant: ['tabular-nums'] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  totalValue: { color: '#FFFFFF', fontFamily: Fonts.extrabold, fontSize: 17 },
  cta: {
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    boxShadow: '0 12px 30px rgba(75,227,176,0.35)',
    marginTop: Spacing.two,
  },
  ctaText: { color: INK, fontFamily: Fonts.bold, fontSize: 17 },
  retry: { alignItems: 'center', paddingVertical: Spacing.two },
  retryText: { color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.semibold, fontSize: 14 },
  done: { alignItems: 'center', gap: Spacing.two, paddingTop: 80 },
  doneBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    boxShadow: '0 14px 40px rgba(75,227,176,0.45)',
  },
});
