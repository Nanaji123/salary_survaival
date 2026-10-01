import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/ui/form';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getCurrentOffering, purchase, restore, useIsPro } from '@/lib/subscription';

const INK = '#0E1116';
const CARD = 'rgba(255,255,255,0.06)';
const MINT = '#4BE3B0';
const MUTED = 'rgba(255,255,255,0.62)';

/** Apple's standard EULA; replace if you publish your own terms. */
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** Required by App Store and Play review. Set this to your hosted privacy policy. */
const PRIVACY_URL = '';

const FEATURES: { icon: IconName; title: string }[] = [
  { icon: Icons.receipt, title: 'Unlimited expense tracking' },
  { icon: Icons.budget, title: 'Category budgets with smart alerts' },
  { icon: Icons.insights, title: 'Advanced insights and charts' },
  { icon: Icons.target, title: 'Savings goals and full history' },
];

/**
 * Free trial advertised on the yearly plan. The store product must carry a matching
 * introductory offer (RevenueCat / App Store Connect / Play Console) or users will be
 * charged immediately. When the product has its own intro offer, that wins.
 */
const YEARLY_TRIAL_DAYS = 3;

type PlanId = 'annual' | 'monthly' | 'weekly';

type Plan = {
  id: PlanId;
  title: string;
  pkg: PurchasesPackage | null;
  price: string;
  period: string;
  /** Secondary line, e.g. the weekly equivalent. */
  detail?: string;
  trial?: string;
  savings?: number;
  /** Full price before the discount, shown struck through. */
  compareAt?: string;
};

// Shown when the store returns no products (e.g. Expo Go preview mode or before
// products are attached to the current offering in RevenueCat).
const PREVIEW: Record<PlanId, { price: string; detail?: string }> = {
  annual: { price: '$52.99', detail: '$1.02 / week' },
  monthly: { price: '$9.99' },
  weekly: { price: '$2.99' },
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function trialLabel(pkg: PurchasesPackage | null) {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return undefined;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

function buildPlans(offering: PurchasesOffering | null): { plans: Plan[]; preview: boolean } {
  const annual = offering?.annual ?? null;
  const monthly = offering?.monthly ?? null;
  const weekly = offering?.weekly ?? null;
  const preview = !annual && !monthly && !weekly;

  // Savings of the yearly plan versus paying weekly (or monthly) for a year.
  let savings = 66;
  if (annual && weekly) savings = Math.round((1 - annual.product.price / (weekly.product.price * 52)) * 100);
  else if (annual && monthly) savings = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);

  const plans: Plan[] = [
    {
      id: 'annual',
      title: 'Yearly',
      pkg: annual,
      price: annual?.product.priceString ?? PREVIEW.annual.price,
      period: '/ year',
      detail: annual?.product.pricePerWeekString
        ? `${annual.product.pricePerWeekString} / week`
        : PREVIEW.annual.detail,
      trial: trialLabel(annual) ?? `${YEARLY_TRIAL_DAYS}-day free trial`,
      savings: savings > 0 ? savings : undefined,
      compareAt:
        annual && weekly
          ? formatPrice(weekly.product.price * 52, weekly.product.currencyCode)
          : annual
            ? undefined
            : '$155.48',
    },
    {
      id: 'monthly',
      title: 'Monthly',
      pkg: monthly,
      price: monthly?.product.priceString ?? PREVIEW.monthly.price,
      period: '/ month',
      trial: monthly ? trialLabel(monthly) : undefined,
    },
    {
      id: 'weekly',
      title: 'Weekly',
      pkg: weekly,
      price: weekly?.product.priceString ?? PREVIEW.weekly.price,
      period: '/ week',
      trial: weekly ? trialLabel(weekly) : undefined,
    },
  ];
  return { plans: preview ? plans : plans.filter((p) => p.pkg), preview };
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const [offering, setOffering] = useState<PurchasesOffering | null | undefined>(undefined);
  const [selected, setSelected] = useState<PlanId>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    getCurrentOffering()
      .then(setOffering)
      .catch(() => setOffering(null));
  }, []);

  // Close automatically once a purchase or restore unlocks Pro.
  useEffect(() => {
    if (isPro) router.back();
  }, [isPro]);

  const { plans, preview } = useMemo(() => buildPlans(offering ?? null), [offering]);
  const plan = plans.find((p) => p.id === selected) ?? plans[0];

  async function buy() {
    if (!plan?.pkg) {
      Alert.alert(
        'Subscriptions unavailable',
        'Plans could not be loaded from the store. Check your connection and try again.',
      );
      return;
    }
    setBusy('buy');
    try {
      const result = await purchase(plan.pkg);
      if (result === 'pro') router.back();
      else if (result === 'inactive') {
        Alert.alert(
          'Purchase received',
          'The store accepted the purchase but Pro is not active yet. Tap Restore purchases, or check that this product is attached to your Pro entitlement in RevenueCat.',
        );
      }
    } catch (error) {
      const message = (error as { message?: string }).message;
      Alert.alert(
        'Purchase failed',
        __DEV__ && message ? message : 'Something went wrong with the store. You have not been charged.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function onRestore() {
    setBusy('restore');
    try {
      const ok = await restore();
      if (ok) router.back();
      else Alert.alert('Nothing to restore', 'We could not find an active subscription for this account.');
    } catch {
      Alert.alert('Restore failed', 'Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  const trialDays = plan?.trial?.split('-')[0];
  const cta = plan?.trial ? 'Start free trial' : 'Subscribe now';
  const fine = plan
    ? plan.trial
      ? `${plan.trial.replace(' free trial', '')} free, then ${plan.price} ${plan.period.replace('/ ', 'per ')}. Cancel anytime before the trial ends and you won't be charged.`
      : `${plan.price} ${plan.period.replace('/ ', 'per ')}. Renews automatically, cancel anytime.`
    : '';

  return (
    <View
      style={[
        styles.container,
        {
          experimental_backgroundImage:
            'radial-gradient(circle at 90% 0%, rgba(75,227,176,0.24) 0%, transparent 45%), radial-gradient(circle at 0% 55%, rgba(91,91,214,0.14) 0%, transparent 40%)',
        },
      ]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.topRow}>
          <View style={styles.proBadge}>
            <Icon name={Icons.sparkles} size={11} color={INK} />
            <Text style={styles.proBadgeText}>PRO</Text>
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

        <View style={styles.hero}>
          <View style={styles.badgeIcon}>
            <Icon name={Icons.sparkles} size={26} color={INK} />
          </View>
          <Text style={styles.kicker}>SALARY SURVIVAL PRO</Text>
          <Text style={styles.title}>Take control of{'\n'}every salary.</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.check}>
                <Icon name={Icons.check} size={11} color={INK} />
              </View>
              <Text style={styles.featureText}>{f.title}</Text>
            </View>
          ))}
        </View>

        {offering === undefined ? (
          <ActivityIndicator color={MINT} style={{ marginVertical: Spacing.five }} />
        ) : (
          <View style={{ gap: Spacing.three - 4 }}>
            {plans.map((p) => {
              const active = p.id === plan?.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${p.title}, ${p.price} ${p.period}`}
                  onPress={() => {
                    tap();
                    setSelected(p.id);
                  }}
                  style={[
                    styles.plan,
                    { borderColor: active ? MINT : 'rgba(255,255,255,0.1)', backgroundColor: active ? 'rgba(75,227,176,0.08)' : CARD },
                  ]}>
                  {p.savings && (
                    <View style={styles.save}>
                      <Text style={styles.saveText}>SAVE {p.savings}%</Text>
                    </View>
                  )}
                  <View style={[styles.radio, { borderColor: active ? MINT : 'rgba(255,255,255,0.3)' }]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    {p.trial ? (
                      <View style={styles.trialPill}>
                        <Icon name={Icons.sparkles} size={10} color={INK} />
                        <Text style={styles.trialText}>{p.trial}</Text>
                      </View>
                    ) : (
                      <Text style={styles.planSub}>Billed {p.period.replace('/ ', '')}ly</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {p.compareAt && <Text style={styles.compareAt}>{p.compareAt}</Text>}
                    <Text style={styles.price}>
                      {p.price}
                      <Text style={styles.period}> {p.period}</Text>
                    </Text>
                    {p.detail && <Text style={styles.planSub}>{p.detail}</Text>}
                  </View>
                </Pressable>
              );
            })}
            {preview && (
              <Text style={styles.preview}>
                Preview prices. Live prices appear once store products are attached to your RevenueCat offering.
              </Text>
            )}
          </View>
        )}

        <View style={{ gap: Spacing.three - 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cta}
            disabled={busy !== null || offering === undefined}
            onPress={buy}
            style={({ pressed }) => [styles.cta, (pressed || busy === 'buy') && { opacity: 0.85 }]}>
            {busy === 'buy' ? (
              <ActivityIndicator color={INK} />
            ) : (
              <>
                <Text style={styles.ctaText}>{cta}</Text>
                <Icon name={Icons.arrow} size={16} color={INK} />
              </>
            )}
          </Pressable>
          <View style={styles.assure}>
            <Icon name={Icons.shield} size={12} color={MINT} />
            <Text style={styles.assureText}>{plan?.trial ? 'No payment due now · Cancel anytime' : 'Cancel anytime'}</Text>
          </View>
        </View>

        {plan?.trial && (
          <View style={styles.timeline}>
            <TimelineStep
              icon={Icons.sparkles}
              title="Today"
              body="Full access to every Pro feature. No payment now."
              first
            />
            <TimelineStep
              icon={Icons.calendar}
              title={`Day ${trialDays}`}
              body={`Trial ends. You'll be charged ${plan.price} unless you cancel.`}
            />
          </View>
        )}

        <Text style={styles.fine}>{fine}</Text>

        <View style={styles.links}>
          <Pressable accessibilityRole="button" disabled={busy !== null} onPress={onRestore} hitSlop={8}>
            <Text style={styles.link}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} hitSlop={8}>
            <Text style={styles.link}>Terms</Text>
          </Pressable>
          {!!PRIVACY_URL && (
            <>
              <Text style={styles.dot}>·</Text>
              <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} hitSlop={8}>
                <Text style={styles.link}>Privacy</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineStep({
  icon,
  title,
  body,
  first,
}: {
  icon: IconName;
  title: string;
  body: string;
  first?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.stepIcon, { backgroundColor: first ? MINT : 'rgba(255,255,255,0.12)' }]}>
          <Icon name={icon} size={12} color={first ? INK : '#FFFFFF'} />
        </View>
        {first && <View style={styles.stepLine} />}
      </View>
      <View style={{ flex: 1, paddingBottom: first ? Spacing.three : 0 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.planSub}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INK,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: MINT,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  proBadgeText: {
    color: INK,
    fontFamily: Fonts.extrabold,
    fontSize: 12,
    letterSpacing: 1,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginTop: -Spacing.three,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(75,227,176,0.35)',
    marginBottom: Spacing.one,
  },
  kicker: {
    color: MINT,
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: Fonts.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  features: {
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.two,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 16,
    paddingHorizontal: Spacing.three,
  },
  save: {
    position: 'absolute',
    top: -11,
    right: 16,
    backgroundColor: MINT,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  saveText: {
    color: INK,
    fontFamily: Fonts.extrabold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: MINT,
  },
  planTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  planSub: {
    color: MUTED,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
  },
  price: {
    color: '#FFFFFF',
    fontFamily: Fonts.extrabold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  period: {
    color: MUTED,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  preview: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  cta: {
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: MINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    boxShadow: '0 12px 30px rgba(75,227,176,0.35)',
  },
  trialPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MINT,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trialText: {
    color: INK,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  compareAt: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.medium,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  timeline: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  stepRail: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    backgroundColor: 'rgba(75,227,176,0.4)',
  },
  stepTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  assure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  assureText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  ctaText: {
    color: INK,
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  fine: {
    color: MUTED,
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  link: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  dot: {
    color: MUTED,
  },
});
