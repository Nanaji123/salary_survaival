import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'pro';

const API_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  }) || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

/**
 * Subscriptions are switched on per build with EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED=true, once the
 * products exist in App Store Connect, Play Console and RevenueCat. Until then everyone gets the
 * full app, no paywall is shown and RevenueCat is never configured, so store review never meets a
 * purchase flow that can't complete.
 */
export const subscriptionsEnabled = process.env.EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true';

const supported = subscriptionsEnabled && (Platform.OS === 'ios' || Platform.OS === 'android') && !!API_KEY;

// Subscription state: `undefined` while loading, then whether the user has Pro.
let isPro: boolean | undefined = !subscriptionsEnabled ? true : supported ? undefined : false;
let configured = false;
const listeners = new Set<() => void>();

function setPro(value: boolean) {
  if (!subscriptionsEnabled || value === isPro) return;
  isPro = value;
  listeners.forEach((l) => l());
}

/**
 * The app has a single paid tier, so any active entitlement or subscription unlocks Pro. This keeps
 * purchases working even when the dashboard entitlement is named differently from ENTITLEMENT_ID
 * or a Test Store product has not been attached to it yet.
 */
function hasPro(info: CustomerInfo) {
  return (
    info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
    Object.keys(info.entitlements.active).length > 0 ||
    info.activeSubscriptions.length > 0
  );
}

function applyCustomerInfo(info: CustomerInfo) {
  if (__DEV__) {
    console.log('[purchases] entitlements:', Object.keys(info.entitlements.active), 'subscriptions:', info.activeSubscriptions);
  }
  setPro(hasPro(info));
}

/** Configures RevenueCat once per launch. Safe to call repeatedly. */
export function configurePurchases(appUserID?: string | null) {
  if (!supported || configured) return;
  configured = true;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY!, appUserID: appUserID ?? undefined });
  Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
  Purchases.getCustomerInfo()
    .then(applyCustomerInfo)
    .catch(() => setPro(false));
}

/** Links purchases to the app's device account so they follow the user. */
export async function identifyPurchaser(appUserID: string) {
  if (!supported) return;
  configurePurchases(appUserID);
  try {
    const { customerInfo } = await Purchases.logIn(appUserID);
    applyCustomerInfo(customerInfo);
  } catch {
    // Keep the anonymous user; entitlements still apply to this device.
  }
}

/** Detaches purchases from the signed-out account so the next sign-in starts clean. */
export async function resetPurchaser() {
  if (!supported || !configured) return;
  try {
    applyCustomerInfo(await Purchases.logOut());
  } catch {
    // Already anonymous; nothing to reset.
  }
  setPro(false);
}

export function useIsPro() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => isPro,
    () => isPro,
  );
}

/** Pro state outside React; false while still loading. */
export function currentlyPro() {
  return isPro === true;
}

/** Returns true when the user has Pro; otherwise opens the paywall. */
export function requirePro(): boolean {
  if (isPro) return true;
  router.push('/paywall');
  return false;
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!supported) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/**
 * Resolves 'pro' when Pro is active afterwards, 'cancelled' if the user backed out, and
 * 'inactive' when the store accepted the purchase but nothing was unlocked. Throws on other errors.
 */
export async function purchase(pkg: PurchasesPackage): Promise<'pro' | 'cancelled' | 'inactive'> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    applyCustomerInfo(customerInfo);
    return hasPro(customerInfo) ? 'pro' : 'inactive';
  } catch (error) {
    if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    throw error;
  }
}

/** Restores previous purchases; resolves true if Pro is active afterwards. */
export async function restore() {
  const info = await Purchases.restorePurchases();
  applyCustomerInfo(info);
  return hasPro(info);
}

export function manageSubscription() {
  return Purchases.showManageSubscriptions();
}

export const purchasesSupported = supported;
