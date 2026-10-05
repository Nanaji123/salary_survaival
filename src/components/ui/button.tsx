import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ink' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, compact }: Props) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary, edge: theme.primaryDeep },
    secondary: { bg: theme.primarySoft, fg: theme.primaryInk, edge: undefined },
    ink: { bg: theme.text, fg: theme.background, edge: theme.textSecondary },
    ghost: { bg: 'transparent', fg: theme.primaryInk, edge: undefined },
    danger: { bg: theme.dangerSoft, fg: theme.danger, edge: undefined },
  }[variant];
  const inactive = disabled || loading;
  // Solid buttons sit on a darker edge and sink onto it when pressed, like a game button.
  const edge = palette.edge && !inactive ? (compact ? 3 : 4) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: palette.bg,
          opacity: inactive ? 0.4 : 1,
          boxShadow: edge ? `0 ${pressed ? 1 : edge}px 0 ${palette.edge}` : undefined,
          transform: [{ translateY: pressed ? edge - 1 : 0 }],
        },
        pressed && !edge && { opacity: 0.8 },
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={compact ? 14 : 16} color={palette.fg} />}
          <Text variant="label" style={{ color: palette.fg, ...Fonts.bold, fontSize: compact ? 13 : 15 }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  compact: {
    height: 36,
    paddingHorizontal: Spacing.three,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
