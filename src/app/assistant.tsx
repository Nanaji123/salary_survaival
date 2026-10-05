import { XpReward } from '@convex/gameRules';
import { FREE_LIMITS } from '@convex/plans';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfettiBurst } from '@/components/ui/confetti';
import { EmojiImage } from '@/components/ui/emoji';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getCategory } from '@/constants/categories';
import { Accent, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLiveSpeech } from '@/hooks/use-live-speech';
import { useVoiceRecorder, type MicStatus } from '@/hooks/use-voice-recorder';
import {
  aiErrorMessage,
  applyInterpretation,
  interpretText,
  transcribeAudio,
  type Interpretation,
} from '@/lib/ai';
import { formatDateKey, formatMoney } from '@/lib/format';
import { freeLeft, useUsage } from '@/lib/limits';
import { useIsPro } from '@/lib/subscription';
import { currentCycle, useAccount, useCycles, useGameProgress } from '@/lib/store';

const INK = Accent.ink;
const MINT = Accent.lime;
const CARD = 'rgba(255,255,255,0.06)';
const LINE = 'rgba(255,255,255,0.1)';
const MUTED = 'rgba(255,255,255,0.62)';
const EASE = Easing.out(Easing.cubic);

const EXAMPLES = [
  'Spent 250 on lunch and 80 on a cab',
  'Groceries 1,200 yesterday',
  'Got my salary of 50,000 today',
  'Save 5,000 every month',
  'Set a food budget of 6,000',
];

const THINKING = ['Reading the amounts…', 'Picking categories…', 'Checking the dates…', 'Almost there…'];

type Phase =
  | { kind: 'idle'; heard?: string }
  | { kind: 'listening' }
  | { kind: 'transcribing' }
  | { kind: 'thinking'; heard: string }
  | { kind: 'review'; heard: string; result: Interpretation }
  | { kind: 'saving'; heard: string; result: Interpretation }
  | { kind: 'done'; message: string };

function isEmpty(r: Interpretation) {
  return !r.expenses.length && !r.salary && !r.savingsGoal && !r.budgets.length;
}

/** XP this result should earn; the backend has the final say (e.g. the daily logging cap). */
function xpPreview(r: Interpretation) {
  return r.expenses.length * XpReward.expense + (r.salary ? XpReward.salary : 0);
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const cycle = currentCycle(useCycles());
  const progress = useGameProgress();
  const isPro = useIsPro();
  const usage = useUsage();
  const currency = account?.currency ?? 'USD';
  const live = useLiveSpeech();
  const recorder = useVoiceRecorder();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [hint, setHint] = useState<string | null>(null);
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);
  // XP before saving, to show what the backend actually awarded on the celebration screen.
  const [xpBefore, setXpBefore] = useState<number | null>(null);

  useEffect(() => {
    if (phase.kind !== 'done') return;
    // After the celebration, free users see the plans; Pro users go back to the app.
    const t = setTimeout(() => (isPro === true ? router.back() : router.replace('/paywall')), 2400);
    return () => clearTimeout(t);
  }, [phase.kind, isPro]);

  async function understand(input: string) {
    const heard = input.trim();
    if (!heard) return;
    setHint(null);
    setText('');
    setPhase({ kind: 'thinking', heard });
    try {
      const result = await interpretText(heard);
      if (isEmpty(result)) {
        setHint(result.reply || "I couldn't find an expense or salary in that. Try again.");
        setPhase({ kind: 'idle', heard });
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase({ kind: 'review', heard, result });
    } catch (error) {
      setHint(aiErrorMessage(error));
      setPhase({ kind: 'idle', heard });
    }
  }

  function micProblem(status: MicStatus) {
    if (status === 'blocked') {
      Alert.alert(
        'Microphone is off',
        'Allow microphone and speech access in your phone Settings to add expenses by voice.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      setHint('I need the microphone to hear you. Hold the mic again and tap Allow.');
    }
  }

  async function onPressIn() {
    if (phase.kind !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHint(null);
    setPhase({ kind: 'listening' });
    try {
      const status = live.supported ? await live.start() : await recorder.start();
      if (status !== 'ok') {
        setPhase({ kind: 'idle' });
        micProblem(status);
      }
    } catch {
      setPhase({ kind: 'idle' });
      setHint('Could not start the microphone.');
    }
  }

  async function onPressOut() {
    if (phase.kind !== 'listening') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (live.supported) {
        // Live transcription already has the words; no upload needed.
        const { text: heard, error } = await live.stop();
        if (!heard) {
          setHint(
            error
              ? "Speech recognition isn't working right now. Type it below instead."
              : "I didn't catch that. Hold the mic and speak a little closer.",
          );
          setPhase({ kind: 'idle' });
          return;
        }
        await understand(heard);
        return;
      }

      setPhase({ kind: 'transcribing' });
      const clip = await recorder.stop();
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
    const left = freeLeft('expense', usage);
    if (result.expenses.length > left) {
      setHint(
        left === 0
          ? `You’ve used your ${FREE_LIMITS.expense} free adds. Go Pro for unlimited.`
          : `The free plan has ${left} more ${left === 1 ? 'add' : 'adds'} left. Remove some items, or go Pro for unlimited.`,
      );
      router.push('/paywall');
      return;
    }
    setXpBefore(progress?.xp ?? null);
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
    if (isEmpty(next)) setPhase({ kind: 'idle', heard: phase.heard });
    else setPhase({ ...phase, result: next });
  }

  function restart() {
    setHint(null);
    setPhase({ kind: 'idle' });
  }

  const listening = phase.kind === 'listening';
  const busy = phase.kind === 'transcribing' || phase.kind === 'thinking' || phase.kind === 'saving';
  const heard = 'heard' in phase ? phase.heard : undefined;
  const chatting = phase.kind !== 'idle' || !!heard || !!hint;
  const showComposer = phase.kind === 'idle' || phase.kind === 'listening' || phase.kind === 'transcribing' || phase.kind === 'thinking';
  const earned = progress && xpBefore !== null ? progress.xp - xpBefore : 0;

  return (
    <View
      style={[
        styles.container,
        {
          experimental_backgroundImage:
            'radial-gradient(circle at 50% 100%, rgba(198,244,90,0.22) 0%, transparent 55%), radial-gradient(circle at 100% 0%, rgba(255,150,60,0.2) 0%, transparent 45%)',
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
            onPress={() => {
              live.cancel();
              router.back();
            }}
            style={styles.close}>
            <Icon name={Icons.close} size={14} color={MUTED} />
          </Pressable>
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatting && scroll.current?.scrollToEnd({ animated: true })}>
          {phase.kind === 'done' ? (
            <Celebration message={phase.message} xp={earned} streak={progress?.streak ?? 0} />
          ) : !chatting ? (
            <Intro onExample={understand} aiLeft={freeLeft('assistant', usage)} />
          ) : (
            <View style={styles.chat}>
              {/* What you said: live while talking, then the final words. */}
              {listening ? (
                <YouBubble>
                  {live.supported && live.transcript ? (
                    <LiveWords text={live.transcript} />
                  ) : (
                    <View style={styles.listenRow}>
                      <Text style={styles.youText}>Listening</Text>
                      <TypingDots color={INK} />
                    </View>
                  )}
                  <Waveform level={live.supported ? live.level : recorder.level} />
                </YouBubble>
              ) : phase.kind === 'transcribing' ? (
                <YouBubble>
                  <TypingDots color={INK} />
                </YouBubble>
              ) : heard ? (
                <YouBubble>
                  <Text style={styles.youText}>{heard}</Text>
                </YouBubble>
              ) : null}

              {/* The assistant's side. */}
              {phase.kind === 'thinking' && (
                <AiBubble>
                  <ThinkingStatus />
                </AiBubble>
              )}
              {!!hint && phase.kind === 'idle' && (
                <AiBubble tone="warn">
                  <Text style={styles.aiText}>{hint}</Text>
                </AiBubble>
              )}
              {(phase.kind === 'review' || phase.kind === 'saving') && (
                <Review
                  result={phase.result}
                  currency={currency}
                  saving={phase.kind === 'saving'}
                  hint={hint}
                  noSalary={!cycle}
                  onChange={update}
                  onConfirm={confirm}
                  onRetry={restart}
                />
              )}
            </View>
          )}
        </ScrollView>

        {showComposer && (
          <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.three }]}>
            <MicButton
              listening={listening}
              busy={busy}
              level={live.supported ? live.level : recorder.level}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            />
            <Text style={styles.holdLabel}>
              {listening ? 'Release when you’re done' : busy ? 'Working on it…' : 'Hold to talk'}
            </Text>
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

function Intro({ onExample, aiLeft }: { onExample: (text: string) => void; aiLeft: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.intro}>
      <EmojiImage name="microphone" size={64} style={{ marginBottom: Spacing.two }} />
      <Text style={styles.title}>Just say it.</Text>
      <Text style={styles.subtitle}>Hold the mic and tell me what you spent, earned or want to save. I’ll write it down as you talk.</Text>
      {Number.isFinite(aiLeft) && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={styles.freePill}>
          <EmojiImage name="crown" size={16} />
          <Text style={styles.freeText}>
            Free plan · {aiLeft} of {FREE_LIMITS.assistant} free AI messages left
          </Text>
        </Pressable>
      )}
      <View style={styles.examples}>
        <Text style={styles.examplesTitle}>TRY SAYING</Text>
        {EXAMPLES.map((e, i) => (
          <Animated.View key={e} entering={FadeInDown.delay(120 + i * 60).duration(360).easing(EASE)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onExample(e)}
              style={({ pressed }) => [styles.example, pressed && { opacity: 0.6 }]}>
              <Text style={styles.exampleText}>“{e}”</Text>
              <Icon name={Icons.arrow} size={12} color={MUTED} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

function YouBubble({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(260).easing(EASE)} style={styles.youWrap}>
      <View style={styles.you}>{children}</View>
    </Animated.View>
  );
}

function AiBubble({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).easing(EASE)} style={styles.aiWrap}>
      <View style={[styles.aiAvatar, tone === 'warn' && { backgroundColor: 'rgba(255,184,77,0.18)' }]}>
        <EmojiImage name={tone === 'warn' ? 'bulb' : 'sparkles'} size={18} />
      </View>
      <View style={[styles.ai, tone === 'warn' && { backgroundColor: 'rgba(255,184,77,0.12)' }]}>{children}</View>
    </Animated.View>
  );
}

/** The live transcript; each new word fades in, and the newest one is highlighted. */
function LiveWords({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <View style={styles.words}>
      {words.map((w, i) => (
        <Animated.Text
          key={i}
          entering={FadeIn.duration(220)}
          style={[styles.youText, styles.word, i === words.length - 1 && { opacity: 0.6 }]}>
          {w}
        </Animated.Text>
      ))}
    </View>
  );
}

/** Three dots that pulse in turn. */
function TypingDots({ color }: { color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [t]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} t={t} index={i} color={color} />
      ))}
    </View>
  );
}

function Dot({ t, index, color }: { t: SharedValue<number>; index: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const phase = (t.value - index * 0.18 + 1) % 1;
    const glow = phase < 0.5 ? Math.sin(phase * 2 * Math.PI) : 0;
    return { opacity: 0.3 + 0.7 * Math.max(0, glow), transform: [{ translateY: -3 * Math.max(0, glow) }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Typing dots plus a status line that changes while the AI works. */
function ThinkingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, THINKING.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.thinking}>
      <TypingDots color={MINT} />
      <Animated.Text key={i} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.thinkingText}>
        {THINKING[i]}
      </Animated.Text>
    </View>
  );
}

/** Bars that follow the microphone volume. */
function Waveform({ level }: { level: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 90);
    return () => clearInterval(id);
  }, []);
  const count = 24;
  return (
    <View style={styles.wave}>
      {Array.from({ length: count }, (_, i) => {
        // Each bar rides its own sine so the row ripples; the voice level sets the overall height.
        const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.55 + tick * 0.6));
        const edge = Math.sin((i / (count - 1)) * Math.PI);
        const h = 4 + Math.max(0.06, level) * 26 * wobble * (0.4 + 0.6 * edge);
        return <View key={i} style={[styles.waveBar, { height: h, opacity: 0.35 + 0.65 * edge }]} />;
      })}
    </View>
  );
}

/** Big hold-to-talk button with rings that pulse and swell with your voice. */
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
  const spin = useSharedValue(0);

  useEffect(() => {
    pulse.value = listening
      ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false)
      : withTiming(0, { duration: 200 });
    press.value = withTiming(listening ? 1.08 : 1, { duration: 220, easing: EASE });
  }, [listening, pulse, press]);

  useEffect(() => {
    spin.value = busy ? withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false) : 0;
  }, [busy, spin]);

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
  const arc = useAnimatedStyle(() => ({ opacity: busy ? 1 : 0, transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <View style={styles.micWrap}>
      <Animated.View style={[styles.ring, ringA]} />
      <Animated.View style={[styles.ring, ringB]} />
      {/* A rotating arc around the button while the AI is working, instead of a spinner. */}
      <Animated.View pointerEvents="none" style={[styles.arc, arc]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to talk"
        disabled={busy}
        onPressIn={onPressIn}
        onPressOut={onPressOut}>
        <Animated.View style={[styles.mic, core, busy && { opacity: 0.55 }]}>
          <Icon name={Icons.mic} size={30} color={INK} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Counts up to `value` once, for totals that land with a little motion. */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / 700);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <Text style={styles.totalValue}>{format(Math.round(shown))}</Text>;
}

function Review({
  result,
  currency,
  saving,
  hint,
  noSalary,
  onChange,
  onConfirm,
  onRetry,
}: {
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
  const xp = xpPreview(result);
  let index = 0;
  const next = () => index++;

  return (
    <View style={{ gap: Spacing.three }}>
      <AiBubble>
        <Text style={styles.aiText}>{result.reply || 'Here is what I understood.'}</Text>
      </AiBubble>

      <View style={{ gap: Spacing.two }}>
        {result.salary && (
          <ReviewRow
            index={next()}
            leading={
              <View style={[styles.glyph, { backgroundColor: 'rgba(198,244,90,0.16)' }]}>
                <EmojiImage name="banknote" size={24} />
              </View>
            }
            title="Salary received"
            subtitle={formatDateKey(result.salary.date)}
            amount={`+${formatMoney(result.salary.amount, currency)}`}
            positive
            onRemove={() => onChange({ ...result, salary: null })}
          />
        )}

        {result.expenses.map((e, i) => (
          <ReviewRow
            key={`${e.title}-${i}`}
            index={next()}
            leading={<CategoryIcon id={e.category} size={42} />}
            title={e.title}
            subtitle={`${getCategory(e.category).label} · ${formatDateKey(e.date)}`}
            amount={`-${formatMoney(e.amount, currency)}`}
            onRemove={() => onChange({ ...result, expenses: result.expenses.filter((_, j) => j !== i) })}
          />
        ))}

        {!!result.savingsGoal && (
          <ReviewRow
            index={next()}
            leading={
              <View style={[styles.glyph, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <EmojiImage name="moneyBag" size={24} />
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
            index={next()}
            leading={<CategoryIcon id={b.category} size={42} />}
            title={`${getCategory(b.category).label} budget`}
            subtitle="Monthly limit"
            amount={formatMoney(b.limit, currency)}
            onRemove={() => onChange({ ...result, budgets: result.budgets.filter((_, j) => j !== i) })}
          />
        ))}
      </View>

      {result.expenses.length > 1 && (
        <Animated.View entering={FadeIn.delay(index * 90 + 150).duration(300)} style={styles.totalRow}>
          <Text style={styles.subtitle}>Total spent</Text>
          <CountUp value={total} format={(n) => formatMoney(n, currency)} />
        </Animated.View>
      )}

      {!!hint && (
        <View style={styles.hint}>
          <EmojiImage name="bulb" size={16} />
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}

      <Animated.View entering={FadeIn.delay(index * 90 + 200).duration(300)} style={{ gap: Spacing.two }}>
        <Pressable
          accessibilityRole="button"
          disabled={saving || blocked}
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.cta,
            {
              boxShadow: `0 ${pressed ? 1 : 4}px 0 #86AD2E`,
              transform: [{ translateY: pressed ? 3 : 0 }],
            },
            (saving || blocked) && { opacity: 0.5 },
          ]}>
          {saving ? (
            <ActivityIndicator color={INK} />
          ) : (
            <>
              <Text style={styles.ctaText}>Add to my logs</Text>
              {xp > 0 && (
                <View style={styles.ctaXp}>
                  <EmojiImage name="star" size={13} />
                  <Text style={styles.ctaXpText}>+{xp} XP</Text>
                </View>
              )}
            </>
          )}
        </Pressable>
        {blocked && <Text style={styles.hintText}>Add your salary first, then I can log these expenses.</Text>}
        <Pressable accessibilityRole="button" disabled={saving} onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ReviewRow({
  index,
  leading,
  title,
  subtitle,
  amount,
  positive,
  onRemove,
}: {
  index: number;
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  amount: string;
  positive?: boolean;
  onRemove: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 90).duration(340).easing(EASE)} style={styles.row}>
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
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${title}`} hitSlop={10} onPress={onRemove} style={styles.remove}>
        <Icon name={Icons.close} size={10} color={MUTED} />
      </Pressable>
    </Animated.View>
  );
}

/** Success screen: a check that settles in, a burst of confetti and the XP that was earned. */
function Celebration({ message, xp, streak }: { message: string; xp: number; streak: number }) {
  const scale = useSharedValue(0.85);
  useEffect(() => {
    scale.value = withTiming(1, { duration: 360, easing: EASE });
  }, [scale]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.done}>
      <View style={styles.burstArea}>
        <ConfettiBurst count={26} spread={130} />
        <Animated.View style={[styles.doneBadge, badge]}>
          <Icon name={Icons.check} size={36} color={INK} />
        </Animated.View>
      </View>
      <Animated.Text entering={FadeInDown.delay(150).duration(360).easing(EASE)} style={styles.title}>
        Logged!
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(250).duration(360)} style={styles.subtitle}>
        {message}
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(400).duration(360).easing(EASE)} style={styles.rewards}>
        {xp > 0 && (
          <View style={styles.reward}>
            <EmojiImage name="star" size={20} />
            <Text style={styles.rewardText}>+{xp} XP</Text>
          </View>
        )}
        {streak > 0 && (
          <View style={styles.reward}>
            <EmojiImage name="fire" size={20} />
            <Text style={styles.rewardText}>{streak}-day streak</Text>
          </View>
        )}
      </Animated.View>
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
  pillText: { color: INK, ...Fonts.extrabold, fontSize: 11, letterSpacing: 1 },
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  intro: { gap: Spacing.two },
  title: {
    color: '#FFFFFF',
    ...Fonts.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  subtitle: { color: MUTED, ...Fonts.medium, fontSize: 14, lineHeight: 20 },
  examples: { marginTop: Spacing.four, gap: Spacing.two },
  freePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.two,
    backgroundColor: 'rgba(255,201,60,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,60,0.3)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  freeText: { color: '#FFD978', ...Fonts.bold, fontSize: 12 },
  examplesTitle: { color: 'rgba(255,255,255,0.4)', ...Fonts.bold, fontSize: 10, letterSpacing: 1.2 },
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
    paddingVertical: 13,
    paddingHorizontal: Spacing.three,
  },
  exampleText: { flex: 1, color: '#FFFFFF', ...Fonts.medium, fontSize: 13 },

  chat: { gap: Spacing.three },
  youWrap: { alignItems: 'flex-end' },
  you: {
    maxWidth: '86%',
    backgroundColor: MINT,
    borderRadius: 22,
    borderBottomRightRadius: 6,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    boxShadow: '0 10px 28px rgba(198,244,90,0.25)',
  },
  youText: { color: INK, ...Fonts.bold, fontSize: 17, lineHeight: 23 },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { marginRight: 5 },
  listenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(198,244,90,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ai: {
    flexShrink: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiText: { color: '#FFFFFF', ...Fonts.medium, fontSize: 14, lineHeight: 20 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingText: { color: MUTED, ...Fonts.semibold, fontSize: 13 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 16 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  wave: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  waveBar: { width: 3, borderRadius: 1.5, backgroundColor: INK },

  hint: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,184,77,0.12)',
    borderRadius: Radius.md,
    padding: 12,
  },
  hintText: { flex: 1, color: '#FFD9A0', ...Fonts.medium, fontSize: 13, lineHeight: 18 },

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
  arc: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: MINT,
    borderRightColor: 'rgba(198,244,90,0.4)',
  },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 34px rgba(198,244,90,0.45)',
  },
  holdLabel: { color: MUTED, ...Fonts.semibold, fontSize: 12, marginBottom: Spacing.one },
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
    height: 50,
    alignSelf: 'stretch',
  },
  input: { flex: 1, color: '#FFFFFF', ...Fonts.medium, fontSize: 14, padding: 0 },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
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
  glyph: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: '#FFFFFF', ...Fonts.bold, fontSize: 14 },
  rowSub: { color: MUTED, ...Fonts.medium, fontSize: 12 },
  rowAmount: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 14, fontVariant: ['tabular-nums'] },
  remove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  totalValue: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 18, fontVariant: ['tabular-nums'] },
  cta: {
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  ctaText: { color: INK, ...Fonts.extrabold, fontSize: 16 },
  ctaXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22,20,15,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ctaXpText: { color: INK, ...Fonts.extrabold, fontSize: 12 },
  retry: { alignItems: 'center', paddingVertical: Spacing.two },
  retryText: { color: 'rgba(255,255,255,0.8)', ...Fonts.semibold, fontSize: 13 },

  done: { alignItems: 'center', gap: Spacing.two, paddingTop: 60 },
  burstArea: { width: 220, height: 200, alignItems: 'center', justifyContent: 'center' },
  doneBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 40px rgba(198,244,90,0.45)',
  },
  rewards: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardText: { color: '#FFFFFF', ...Fonts.extrabold, fontSize: 14 },
});
