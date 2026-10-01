import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shown in place of a Pro-only screen for users without a subscription. */
export function ProLock({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.icon, { backgroundColor: theme.text }]}>
        <Icon name={Icons.sparkles} size={26} color={theme.background} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {body}
      </Text>
      <View style={{ alignSelf: 'stretch', marginTop: Spacing.three }}>
        <Button title="See plans" icon={Icons.sparkles} onPress={() => router.push('/paywall')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.five,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radius.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
});
