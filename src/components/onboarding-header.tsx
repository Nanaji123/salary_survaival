import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function OnboardingHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
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
      <Text variant="overline" color="primaryInk">
        Step {step} of {total}
      </Text>
      <Text variant="title" style={{ fontSize: 30, lineHeight: 36 }}>
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
});
