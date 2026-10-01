import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function OnboardingHeader({
  step,
  total,
  title,
  subtitle,
  icon,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < step ? theme.primary : theme.cardAlt }]}
          />
        ))}
      </View>
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconTile, { backgroundColor: theme.primary }]}>
            <Icon name={icon} size={24} color={theme.onPrimary} />
          </View>
        )}
        <View style={[styles.stepPill, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.stepText, { color: theme.primaryInk }]}>
            STEP {step} OF {total}
          </Text>
        </View>
      </View>
      <Text variant="title" style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.8 }}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary">
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.three,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  iconTile: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 22px rgba(15,163,122,0.35)',
  },
  stepPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepText: {
    fontFamily: Fonts.extrabold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
