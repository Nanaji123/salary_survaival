import '@/global.css';

export const Colors = {
  light: {
    text: '#0E1116',
    textSecondary: '#62666D',
    textTertiary: '#A1A4AA',
    background: '#F5F3EE',
    card: '#FFFFFF',
    cardAlt: '#EEEBE4',
    border: '#E6E2D9',
    primary: '#0FA37A',
    primaryInk: '#087A5B',
    primarySoft: '#DCF5EC',
    onPrimary: '#FFFFFF',
    danger: '#E5534B',
    dangerSoft: '#FCE7E5',
    warning: '#E08A00',
    warningSoft: '#FDF0D9',
    hero: '#12161C',
    heroAlt: '#1D232C',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.62)',
    heroAccent: '#4BE3B0',
    tabBar: 'rgba(255,255,255,0.94)',
    shadow: 'rgba(17, 22, 28, 0.08)',
  },
  dark: {
    text: '#F2F3F5',
    textSecondary: '#9EA3AB',
    textTertiary: '#636872',
    background: '#0B0D10',
    card: '#15181D',
    cardAlt: '#1D2128',
    border: '#252A32',
    primary: '#3DDBA6',
    primaryInk: '#3DDBA6',
    primarySoft: '#10362A',
    onPrimary: '#04231A',
    danger: '#FF7A70',
    dangerSoft: '#3A1916',
    warning: '#FFB84D',
    warningSoft: '#3A2A0E',
    hero: '#171B22',
    heroAlt: '#222833',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.6)',
    heroAccent: '#4BE3B0',
    tabBar: 'rgba(24, 27, 33, 0.96)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

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

/** Space reserved at the bottom of tab screens for the floating tab bar. */
export const TabBarSpace = 110;
export const MaxContentWidth = 640;
