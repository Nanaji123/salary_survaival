import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'money';

export type TextProps = RNTextProps & {
  variant?: Variant;
  color?: ThemeColor;
};

export function Text({ variant = 'body', color = 'text', style, maxFontSizeMultiplier = 1.3, ...rest }: TextProps) {
  const theme = useTheme();
  // A larger fontSize passed in `style` would otherwise keep the variant's line height and get
  // its tops and bottoms clipped, so grow the line height to fit.
  const flat = StyleSheet.flatten(style);
  const base = styles[variant];
  const fit =
    flat?.fontSize && flat.lineHeight === undefined && flat.fontSize * 1.2 > base.lineHeight
      ? { lineHeight: Math.round(flat.fontSize * 1.25) }
      : null;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[base, { color: theme[color] }, style, fit]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    ...Fonts.extrabold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  display: {
    ...Fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  headline: {
    ...Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
  },
  body: {
    ...Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    ...Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
  },
  caption: {
    ...Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    ...Fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  money: {
    ...Fonts.bold,
    fontSize: 14,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
});
