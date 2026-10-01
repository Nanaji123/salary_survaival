import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Fonts, Spacing } from '@/constants/theme';

export function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="headline">{title}</Text>
        {action && onAction && (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
            {({ pressed }) => (
              <Text variant="caption" color="primaryInk" style={{ opacity: pressed ? 0.5 : 1, fontFamily: Fonts.bold }}>
                {action}
              </Text>
            )}
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

/** Large title header used at the top of tab screens. */
export function ScreenTitle({
  eyebrow,
  title,
  right,
  badge,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  /** Small element shown before the eyebrow, e.g. a PRO pill. */
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {(eyebrow || badge) && (
          <View style={styles.eyebrowRow}>
            {badge}
            {eyebrow && (
              <Text variant="caption" color="textSecondary">
                {eyebrow}
              </Text>
            )}
          </View>
        )}
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three - 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
