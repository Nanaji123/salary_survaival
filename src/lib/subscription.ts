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

const supported = (Platform.OS === 'ios' || Platform.OS === 'android') && !!API_KEY;

// Subscription state: `undefined` while loading, then whether the user has Pro.
let isPro: boolean | undefined = supported ? undefined : false;
let configured = false;
const listeners = new Set<() => void>();

function setPro(value: boolean) {
  if (value === isPro) return;
  isPro = value;
  listeners.forEach((l) => l());
}

function applyCustomerInfo(info: CustomerInfo) {
  setPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
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

/** Resolves true on success, false if the user cancelled; throws on other errors. */
export async function purchase(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    applyCustomerInfo(customerInfo);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    throw error;
  }
}

/** Restores previous purchases; resolves true if Pro is active afterwards. */
export async function restore() {
  const info = await Purchases.restorePurchases();
  applyCustomerInfo(info);
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export function manageSubscription() {
  return Purchases.showManageSubscriptions();
}

export const purchasesSupported = supported;
