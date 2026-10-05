import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signInWithDevice } from '@/lib/store';

const INK = '#0E1116';
const MINT = '#C6F45A';
const MUTED = 'rgba(255,255,255,0.62)';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: Icons.salary, title: 'Plan around payday', body: 'Log each salary the day it lands.' },
  { icon: Icons.insights, title: 'See where it goes', body: 'Charts and budgets for every category.' },
  { icon: Icons.target, title: 'Know what is safe', body: 'A daily spend limit until next payday.' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  async function getStarted() {
    setLoading(true);
    try {
      const onboarded = await signInWithDevice();
      // A returning user is taken straight to Home when the account flips to onboarded.
      if (!onboarded) router.push('/setup');
    } catch {
      Alert.alert('Could not connect', 'Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + Spacing.three,
          experimental_backgroundImage:
            'radial-gradient(circle at 85% 12%, rgba(198,244,90,0.22) 0%, transparent 45%), radial-gradient(circle at 0% 70%, rgba(255,150,60,0.16) 0%, transparent 40%)',
        },
      ]}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name={Icons.wallet} size={18} color={INK} />
          </View>
          <Text style={styles.brandText}>Salary Survival</Text>
        </View>

        <Illustration />

        <View style={{ gap: Spacing.three }}>
          <Text style={styles.headline}>
            Make every salary{'\n'}
            <Text style={[styles.headline, { color: MINT }]}>last the month.</Text>
          </Text>
          <Text style={styles.sub}>
            A calm, private planner for your pay. Works with every currency in the world.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={16} color={MINT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: Spacing.three }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            disabled={loading}
            onPress={getStarted}
            style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
            {loading ? (
              <ActivityIndicator color={INK} />
            ) : (
              <>
                <Text style={styles.ctaText}>Get Started</Text>
                <Icon name={Icons.arrow} size={16} color={INK} />
              </>
            )}
          </Pressable>
          <View style={styles.note}>
            <Icon name={Icons.shield} size={12} color={MUTED} />
            <Text style={styles.noteText}>No password needed. Linked to this device.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Abstract gauge and bar motif echoing the app's dashboard. */
function Illustration() {
  const r = 70;
  const arc = `M ${90 - r} 90 A ${r} ${r} 0 0 1 ${90 + r} 90`;
  const len = Math.PI * r;
  return (
    <View style={styles.illustration}>
      <Svg width={180} height={100}>
        <Path d={arc} stroke="rgba(255,255,255,0.1)" strokeWidth={12} strokeLinecap="round" fill="none" />
        <Path
          d={arc}
          stroke={MINT}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${len * 0.62} ${len}`}
        />
        <Circle cx={90} cy={90} r={5} fill="#FFFFFF" />
      </Svg>
      <View style={styles.bars}>
        {[0.35, 0.6, 0.45, 0.85, 0.5, 0.7, 0.4].map((h, i) => (
          <View
            key={i}
            style={{
              width: 12,
              height: 56 * h,
              borderRadius: 4,
              backgroundColor: i === 3 ? MINT : 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INK,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    ...Fonts.bold,
    fontSize: 16,
  },
  illustration: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 56,
  },
  headline: {
    color: '#FFFFFF',
    ...Fonts.extrabold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
  },
  sub: {
    color: MUTED,
    ...Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  features: {
    gap: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(198,244,90,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: '#FFFFFF',
    ...Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  featureBody: {
    color: MUTED,
    ...Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  ctaText: {
    color: INK,
    ...Fonts.bold,
    fontSize: 17,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noteText: {
    color: MUTED,
    ...Fonts.medium,
    fontSize: 12,
  },
});
