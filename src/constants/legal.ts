/**
 * Links required by App Store and Play review. Set them in .env once the pages are hosted;
 * convex/http.ts serves the privacy policy at <deployment>.convex.site/privacy.
 */

/** Hosted privacy policy. Required in the store listings and inside the app. */
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';

/** Terms of use. Defaults to Apple's standard EULA, which App Store review accepts. */
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL || 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Where users can reach you; shown in Settings when set. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
