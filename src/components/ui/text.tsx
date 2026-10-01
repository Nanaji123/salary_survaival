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

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText style={[styles[variant], { color: theme[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  hero: {
    fontFamily: Fonts.extrabold,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  display: {
    fontFamily: Fonts.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  money: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
});
