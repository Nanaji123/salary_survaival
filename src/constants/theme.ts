import { Platform } from 'react-native';

import '@/global.css';

export const Colors = {
  light: {
    text: '#17140F',
    textSecondary: '#6B655A',
    textTertiary: '#A8A193',
    background: '#F7F4EC',
    card: '#FFFFFF',
    cardAlt: '#EFEBE0',
    border: '#E7E1D3',
    primary: '#22A355',
    primaryInk: '#177A3E',
    primarySoft: '#E1F4E5',
    /** Darker edge under primary buttons, for the pressable "game button" look. */
    primaryDeep: '#178042',
    onPrimary: '#FFFFFF',
    danger: '#E5484D',
    dangerSoft: '#FCE6E4',
    warning: '#D97706',
    warningSoft: '#FDF0D9',
    /** XP, coins and levels. */
    gold: '#E8A400',
    goldSoft: '#FDF1CC',
    /** Streaks. */
    fire: '#F2601F',
    fireSoft: '#FFE6D8',
    hero: '#16140F',
    heroAlt: '#27231A',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.6)',
    heroAccent: '#C6F45A',
    tabBar: 'rgba(255,255,255,0.95)',
    shadow: 'rgba(40, 32, 16, 0.08)',
  },
  dark: {
    text: '#F4F1EA',
    textSecondary: '#A39D90',
    textTertiary: '#6A655B',
    background: '#0E0D0A',
    card: '#1A1814',
    cardAlt: '#24211B',
    border: '#2E2A22',
    primary: '#C6F45A',
    primaryInk: '#C6F45A',
    primarySoft: '#2A3313',
    primaryDeep: '#86AD2E',
    onPrimary: '#16140F',
    danger: '#FF7A70',
    dangerSoft: '#3A1916',
    warning: '#FFB84D',
    warningSoft: '#3A2A0E',
    gold: '#FFC93C',
    goldSoft: '#3A2E0E',
    fire: '#FF8A50',
    fireSoft: '#3A1E10',
    hero: '#1C1A15',
    heroAlt: '#2B2820',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.6)',
    heroAccent: '#C6F45A',
    tabBar: 'rgba(28, 26, 21, 0.96)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/** Lime accent and warm glow used on the dark hero surfaces across screens. */
export const Accent = {
  lime: '#C6F45A',
  ink: '#16140F',
  glow: 'rgba(198,244,90,0.24)',
  warmGlow: 'rgba(255,150,60,0.18)',
} as const;
export type ThemeColor = keyof ThemeColors;

/**
 * Typefaces, as style objects to spread into a style: `{ ...Fonts.bold, fontSize: 15 }`.
 * iOS uses SF Pro Rounded (the system font's rounded design), where the weight comes from
 * fontWeight. Android has no SF fonts, so it keeps the bundled Plus Jakarta Sans files.
 */
const rounded = (fontWeight: '400' | '500' | '600' | '700' | '800') => ({ fontFamily: 'ui-rounded', fontWeight });

export const Fonts =
  Platform.OS === 'ios'
    ? {
        regular: rounded('400'),
        medium: rounded('500'),
        semibold: rounded('600'),
        bold: rounded('700'),
        extrabold: rounded('800'),
      }
    : {
        regular: { fontFamily: 'PlusJakartaSans_400Regular' },
        medium: { fontFamily: 'PlusJakartaSans_500Medium' },
        semibold: { fontFamily: 'PlusJakartaSans_600SemiBold' },
        bold: { fontFamily: 'PlusJakartaSans_700Bold' },
        extrabold: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
      };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  gutter: 20,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * Extra space at the bottom of tab screens. The native tab bar insets scroll views itself; where
 * there is no Liquid Glass accessory (Android, iOS before 26) a floating add button needs room too.
 */
export const TabBarSpace =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26 ? Spacing.four : 88;
export const MaxContentWidth = 640;
